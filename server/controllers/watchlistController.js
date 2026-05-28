const asyncHandler  = require('../middleware/asyncHandler');
const Watchlist     = require('../models/Watchlist');
const stockService  = require('../services/stockService');

// GET /api/watchlist
const getWatchlists = asyncHandler(async (req, res) => {
  let watchlists = await Watchlist.find({ user: req.user._id });
  
  if (watchlists.length === 0) {
    const defaultWl = await Watchlist.create({ user: req.user._id, name: 'My Watchlist', symbols: [] });
    watchlists = [defaultWl];
  }

  // Get all unique symbols across all watchlists
  const allSymbols = [...new Set(watchlists.flatMap(wl => wl.symbols))];
  const quotes = allSymbols.length
    ? await stockService.getBulkQuotes(allSymbols)
    : [];

  res.json({ success: true, watchlists, quotes });
});

// POST /api/watchlist (Create new watchlist)
const createWatchlist = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Watchlist name is required' });
  }

  try {
    const wl = await Watchlist.create({ user: req.user._id, name: name.trim(), symbols: [] });
    res.status(201).json({ success: true, watchlist: wl });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already have a watchlist with this name' });
    }
    throw error;
  }
});

// DELETE /api/watchlist/:id
const deleteWatchlist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const wl = await Watchlist.findOne({ _id: id, user: req.user._id });
  
  if (!wl) {
    return res.status(404).json({ success: false, message: 'Watchlist not found' });
  }

  await Watchlist.deleteOne({ _id: id });
  res.json({ success: true, message: 'Watchlist deleted' });
});

// POST /api/watchlist/:id/symbols  — body: { symbol }
const addToWatchlist = asyncHandler(async (req, res) => {
  const symbol = (req.body.symbol || '').toUpperCase().trim();
  const { id } = req.params;

  if (!symbol) {
    return res.status(400).json({ success: false, message: 'Symbol is required' });
  }

  const wl = await Watchlist.findOne({ _id: id, user: req.user._id });
  if (!wl) {
    return res.status(404).json({ success: false, message: 'Watchlist not found' });
  }

  if (wl.symbols.includes(symbol)) {
    return res.status(409).json({ success: false, message: `${symbol} is already in this watchlist` });
  }

  wl.symbols.push(symbol);
  await wl.save();

  // Return fresh quote for the newly added stock
  const quote = await stockService.getQuote(symbol);
  res.status(201).json({ success: true, symbol, listId: wl._id, quote });
});

// DELETE /api/watchlist/:id/symbols/:symbol
const removeFromWatchlist = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const { id } = req.params;

  const wl = await Watchlist.findOne({ _id: id, user: req.user._id });
  if (!wl) {
    return res.status(404).json({ success: false, message: 'Watchlist not found' });
  }

  wl.symbols = wl.symbols.filter((s) => s !== symbol);
  await wl.save();

  res.json({ success: true, message: `${symbol} removed from watchlist`, listId: wl._id, symbol });
});

module.exports = { getWatchlists, createWatchlist, deleteWatchlist, addToWatchlist, removeFromWatchlist };
