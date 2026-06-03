const asyncHandler = require('../middleware/asyncHandler');
const Portfolio    = require('../models/Portfolio');
const Transaction  = require('../models/Transaction');
const { calcPortfolioSummary } = require('../utils/financialCalc');
const stockService = require('../services/stockService');

// Fetch or create portfolio for the logged-in user
const getOrCreate = async (userId) => {
  let p = await Portfolio.findOne({ user: userId });
  if (!p) p = await Portfolio.create({ user: userId, virtualBalance: 100000, holdings: [] });
  return p;
};

// GET /api/portfolio — holdings + virtual balance
const getPortfolio = asyncHandler(async (req, res) => {
  const portfolio = await getOrCreate(req.user._id);
  res.json({ success: true, portfolio });
});

// GET /api/portfolio/summary — enriches holdings with current prices for P&L
const getPortfolioSummary = asyncHandler(async (req, res) => {
  const portfolio = await getOrCreate(req.user._id);

  // Fetch current prices for all holdings in parallel
  let priceMap = {};
  let quoteMap = {};
  if (portfolio.holdings.length) {
    const symbols = portfolio.holdings.map((h) => h.symbol);
    const quotes  = await stockService.getBulkQuotes(symbols);
    quotes.forEach((q) => { 
      if (q) {
        priceMap[q.symbol] = q.price; 
        quoteMap[q.symbol] = q;
      }
    });
  }

  const { totalValue, totalCost, totalPL, totalPLPercent } =
    calcPortfolioSummary(portfolio.holdings, priceMap);

  let todayPL = 0;

  const enriched = portfolio.holdings.map((h) => {
    const quote = quoteMap[h.symbol];
    if (quote && quote.change) {
      todayPL += (quote.change * h.quantity);
    }
    
    return {
      symbol:        h.symbol,
      name:          h.name,
      quantity:      h.quantity,
      avgPrice:      h.avgPrice,
      currentPrice:  priceMap[h.symbol] ?? h.avgPrice,
      currentValue:  (priceMap[h.symbol] ?? h.avgPrice) * h.quantity,
      pl:            ((priceMap[h.symbol] ?? h.avgPrice) - h.avgPrice) * h.quantity,
      plPercent:     h.avgPrice > 0
        ? (((priceMap[h.symbol] ?? h.avgPrice) - h.avgPrice) / h.avgPrice) * 100
        : 0,
    };
  });

  res.json({
    success: true,
    summary: {
      virtualBalance: portfolio.virtualBalance,
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      todayPL,
      totalAssets: totalValue + portfolio.virtualBalance,
    },
    holdings: enriched,
  });
});

// GET /api/portfolio/chart — Historical portfolio chart (30d) based on current holdings
const getPortfolioChart = asyncHandler(async (req, res) => {
  const portfolio = await getOrCreate(req.user._id);
  
  if (portfolio.holdings.length === 0) {
    return res.json({ success: true, chart: [] });
  }

  // Fetch 30 days of data for each symbol
  const resolution = 'D';
  
  const allCandles = await Promise.all(
    portfolio.holdings.map(async (h) => {
      const candles = await stockService.getCandles(h.symbol, resolution);
      return { symbol: h.symbol, quantity: h.quantity, candles };
    })
  );

  const timeMap = {};
  
  // Get start of user registration day in unix timestamp
  const registrationDate = new Date(req.user.createdAt);
  registrationDate.setHours(0, 0, 0, 0);
  const registrationTimestamp = Math.floor(registrationDate.getTime() / 1000);
  
  allCandles.forEach(item => {
    item.candles.forEach(c => {
      if (c.time < registrationTimestamp) return;

      const d = new Date(c.time * 1000);
      const dateKey = d.toISOString().split('T')[0]; // Group by YYYY-MM-DD
      
      if (!timeMap[dateKey]) {
        timeMap[dateKey] = { time: c.time, date: dateKey, value: 0 };
      }
      timeMap[dateKey].value += (c.close * item.quantity);
    });
  });

  const chart = Object.values(timeMap).sort((a, b) => a.time - b.time);
  
  res.json({ success: true, chart });
});

// GET /api/portfolio/history — transaction history
const getHistory = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, transactions });
});

// POST /api/portfolio/trade — execute a trade (BUY/SELL)
const tradeStock = asyncHandler(async (req, res) => {
  const { symbol, name, type, quantity } = req.body;
  
  if (!symbol || !type || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error('Invalid trade parameters');
  }

  // Fetch real-time price securely from server side
  const quote = await stockService.getQuote(symbol);
  if (!quote) {
    res.status(404);
    throw new Error('Stock not found or quote unavailable');
  }
  
  const currentPrice = quote.price;
  const totalAmount = currentPrice * quantity;
  
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 1. Fetch portfolio with session lock
    let portfolio = await Portfolio.findOne({ user: req.user._id }).session(session);
    if (!portfolio) {
      portfolio = new Portfolio({ user: req.user._id, virtualBalance: 100000, holdings: [] });
    }

    const holdingIndex = portfolio.holdings.findIndex(h => h.symbol === symbol.toUpperCase());
    
    if (type === 'BUY') {
      if (portfolio.virtualBalance < totalAmount) {
        res.status(400);
        throw new Error('Insufficient virtual balance');
      }
      
      portfolio.virtualBalance -= totalAmount;
      
      if (holdingIndex >= 0) {
        const h = portfolio.holdings[holdingIndex];
        const newTotalCost = (h.quantity * h.avgPrice) + totalAmount;
        h.quantity += quantity;
        h.avgPrice = newTotalCost / h.quantity;
      } else {
        portfolio.holdings.push({
          symbol: symbol.toUpperCase(),
          name: name || quote.name,
          quantity,
          avgPrice: currentPrice
        });
      }
    } else if (type === 'SELL') {
      if (holdingIndex < 0 || portfolio.holdings[holdingIndex].quantity < quantity) {
        res.status(400);
        throw new Error('Insufficient holding quantity to sell');
      }
      
      portfolio.virtualBalance += totalAmount;
      
      const h = portfolio.holdings[holdingIndex];
      h.quantity -= quantity;
      if (h.quantity === 0) {
        portfolio.holdings.splice(holdingIndex, 1);
      }
    } else {
      res.status(400);
      throw new Error('Invalid trade type');
    }
    
    await portfolio.save({ session });
    
    const [transaction] = await Transaction.create([{
      user: req.user._id,
      type,
      symbol: symbol.toUpperCase(),
      name: name || quote.name,
      quantity,
      price: currentPrice,
      total: totalAmount
    }], { session });
    
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `${type} successful for ${quantity} shares of ${symbol}`,
      portfolio,
      transaction
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

module.exports = { getPortfolio, getPortfolioSummary, getHistory, tradeStock, getPortfolioChart };
