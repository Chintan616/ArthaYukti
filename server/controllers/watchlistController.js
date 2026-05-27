const asyncHandler  = require('../middleware/asyncHandler');
const Watchlist     = require('../models/Watchlist');
const stockService  = require('../services/stockService');

// Fetch or create the user's watchlist, then enrich with live quotes
const getOrCreate = async (userId) => {
  let wl = await Watchlist.findOne({ user: userId });
  if (!wl) wl = await Watchlist.create({ user: userId, symbols: [] });
  return wl;
};

// GET /api/watchlist
const getWatchlist = asyncHandler(async (req, res) => {
  const wl     = await getOrCreate(req.user._id);
  const quotes = wl.symbols.length
    ? await stockService.getBulkQuotes(wl.symbols)
    : [];
  res.json({ success: true, symbols: wl.symbols, quotes });
});

// POST /api/watchlist  — body: { symbol }
const addToWatchlist = asyncHandler(async (req, res) => {
  const symbol = (req.body.symbol || '').toUpperCase().trim();
  if (!symbol) {
    return res.status(400).json({ success: false, message: 'Symbol is required' });
  }

  const wl = await getOrCreate(req.user._id);

  if (wl.symbols.includes(symbol)) {
    return res.status(409).json({ success: false, message: `${symbol} is already in your watchlist` });
  }

  wl.symbols.push(symbol);
  await wl.save();

  // Return fresh quote for the newly added stock
  const quote = await stockService.getQuote(symbol);
  res.status(201).json({ success: true, symbol, quote });
});

// DELETE /api/watchlist/:symbol
const removeFromWatchlist = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const wl     = await getOrCreate(req.user._id);

  wl.symbols = wl.symbols.filter((s) => s !== symbol);
  await wl.save();

  res.json({ success: true, message: `${symbol} removed from watchlist` });
});

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };
