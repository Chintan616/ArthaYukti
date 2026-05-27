const asyncHandler = require('../middleware/asyncHandler');
const stockService = require('../services/stockService');

// GET /api/stocks/search?q=apple
const searchStocks = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) {
    return res.status(400).json({ success: false, message: 'Query parameter q is required' });
  }
  const results = await stockService.searchStocks(q.trim());
  res.json({ success: true, results });
});

// GET /api/stocks/trending
const getTrending = asyncHandler(async (req, res) => {
  const stocks = await stockService.getTrending();
  res.json({ success: true, stocks });
});

// GET /api/stocks/gainers-losers
const getGainersLosers = asyncHandler(async (req, res) => {
  const data = await stockService.getGainersLosers();
  res.json({ success: true, ...data }); // { gainers, losers }
});

// GET /api/stocks/indices
const getIndices = asyncHandler(async (req, res) => {
  const indices = await stockService.getIndices();
  res.json({ success: true, indices });
});

// GET /api/stocks/all
const getAllStocks = asyncHandler(async (req, res) => {
  const stocks = await stockService.getAllStocks();
  res.json({ success: true, stocks });
});

// GET /api/stocks/:symbol  — quote + profile
const getStock = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const [quote, profile] = await Promise.all([
    stockService.getQuote(symbol),
    stockService.getProfile(symbol),
  ]);
  res.json({ success: true, quote, profile });
});

// GET /api/stocks/:symbol/history?resolution=D
const getHistory = asyncHandler(async (req, res) => {
  const symbol     = req.params.symbol.toUpperCase();
  const resolution = req.query.resolution || 'D';
  const candles    = await stockService.getCandles(symbol, resolution);
  res.json({ success: true, candles });
});

module.exports = { searchStocks, getTrending, getGainersLosers, getIndices, getAllStocks, getStock, getHistory };
