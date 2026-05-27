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
  if (portfolio.holdings.length) {
    const symbols = portfolio.holdings.map((h) => h.symbol);
    const quotes  = await stockService.getBulkQuotes(symbols);
    quotes.forEach((q) => { priceMap[q.symbol] = q.price; });
  }

  const { totalValue, totalCost, totalPL, totalPLPercent } =
    calcPortfolioSummary(portfolio.holdings, priceMap);

  const enriched = portfolio.holdings.map((h) => ({
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
  }));

  res.json({
    success: true,
    summary: {
      virtualBalance: portfolio.virtualBalance,
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      totalAssets: totalValue + portfolio.virtualBalance,
    },
    holdings: enriched,
  });
});

// GET /api/portfolio/history — transaction history
const getHistory = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, transactions });
});

module.exports = { getPortfolio, getPortfolioSummary, getHistory };
