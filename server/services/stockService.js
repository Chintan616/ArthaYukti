const axios = require('axios');
const cache = require('./cacheService');

const UPSTOX_BASE = 'https://api.upstox.com/v2';
let customToken = null;
const getToken    = () => customToken || process.env.UPSTOX_ACCESS_TOKEN;
const setToken    = (t) => { customToken = t; };

// Shared axios instance for Upstox REST calls
const upstox = axios.create({ baseURL: UPSTOX_BASE });
upstox.interceptors.request.use((cfg) => {
  cfg.headers['Authorization'] = `Bearer ${getToken()}`;
  cfg.headers['Accept']        = 'application/json';
  return cfg;
});

// ─── Static data (unchanged — frontend reads these) ──────────────────────────

const MARKET_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR',
  'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK',
  'LT', 'BAJFINANCE', 'HCLTECH', 'MARUTI', 'ASIANPAINT',
  'AXISBANK', 'TITAN', 'SUNPHARMA', 'WIPRO', 'ULTRACEMCO',
  'NESTLEIND', 'ONGC', 'NTPC', 'TECHM', 'TATASTEEL',
  'BAJAJFINSV', 'POWERGRID', 'M&M', 'HDFCLIFE', 'INDUSINDBK',
  'GRASIM', 'DRREDDY', 'CIPLA', 'HINDALCO', 'JSWSTEEL',
  'APOLLOHOSP', 'ADANIENT', 'ADANIPORTS', 'AMBUJACEM', 'COALINDIA',
  'TATACONSUM', 'BRITANNIA', 'DIVISLAB', 'BAJAJ-AUTO', 'HEROMOTOCO',
  'EICHERMOT', 'UPL', 'BPCL', 'SIEMENS', 'SBILIFE',
];

const MARKET_INDICES = [
  { symbol: '^BSESN',     name: 'Sensex'          },
  { symbol: '^NSEI',      name: 'Nifty 50'        },
  { symbol: '^NSEBANK',   name: 'Nifty Bank'      },
  { symbol: '^CNXIT',     name: 'Nifty IT'        },
  { symbol: '^CNXAUTO',   name: 'Nifty Auto'      },
  { symbol: '^CNXFMCG',   name: 'Nifty FMCG'     },
  { symbol: '^CNXPHARMA', name: 'Nifty Pharma'    },
  { symbol: '^NSMIDCP',   name: 'Nifty Midcap 50' },
];

const allInstruments = require('../data/instruments.json');

const SYMBOL_TO_INSTRUMENT = {};
const STOCK_NAMES = {};
const INSTRUMENT_TO_SYMBOL = {};

// First pass: load all 2,600+ instruments using their clean Upstox symbols
allInstruments.forEach(inst => {
  SYMBOL_TO_INSTRUMENT[inst.symbol] = inst.instrument_key;
  INSTRUMENT_TO_SYMBOL[inst.instrument_key.replace('|', ':')] = inst.symbol; // Upstox REST uses colon
  STOCK_NAMES[inst.symbol] = inst.name;
});

// Ensure indices map back correctly
MARKET_INDICES.forEach(idx => {
  const instrKey = SYMBOL_TO_INSTRUMENT[idx.symbol];
  if (instrKey) {
    INSTRUMENT_TO_SYMBOL[instrKey.replace('|', ':')] = idx.symbol;
  }
});

const getInstrKey = (sym) => {
  if (!sym) return null;
  const clean = sym.replace(/\.(BO|NS)$/i, '');
  return SYMBOL_TO_INSTRUMENT[sym] || SYMBOL_TO_INSTRUMENT[clean];
};

// ─── Live quote store — updated in real time by the WebSocket feed ────────────
const liveQuotes = new Map(); // yahooSymbol → quote object

const updateLiveQuote = (quote) => {
  liveQuotes.set(quote.symbol, quote);
  cache.set(`quote:${quote.symbol}`, quote, 30).catch(() => {});
};

// ─── Quote shape builder ──────────────────────────────────────────────────────

const buildQuote = (symbol, d) => {
  const prevClose     = d.ohlc?.close ?? 0;
  const price         = d.last_price  ?? 0;
  const netChange     = d.net_change  ?? (price - prevClose);
  const changePercent = prevClose > 0 ? (netChange / prevClose) * 100 : 0;
  const cleanSym      = symbol.replace(/\.(BO|NS)$/i, '');

  return {
    symbol,
    name:          STOCK_NAMES[symbol] || STOCK_NAMES[cleanSym] || MARKET_INDICES.find(i => i.symbol === symbol)?.name || symbol,
    price,
    change:        netChange,
    changePercent,
    high:          d.ohlc?.high  ?? price,
    low:           d.ohlc?.low   ?? price,
    open:          d.ohlc?.open  ?? price,
    prevClose,
    timestamp:     Math.floor(Date.now() / 1000),
  };
};

// ─── Core API functions ───────────────────────────────────────────────────────

/**
 * Single quote — live WebSocket cache first, then REST + 30 s cache.
 */
const getQuote = async (symbol) => {
  if (liveQuotes.has(symbol)) return liveQuotes.get(symbol);

  const instrKey = getInstrKey(symbol);
  if (!instrKey) return null;

  const cacheKey = `quote:${symbol}`;
  const hit = await cache.get(cacheKey);
  if (hit) return hit;

  try {
    const { data: resp } = await upstox.get(
      `/market-quote/quotes?instrument_key=${encodeURIComponent(instrKey)}`
    );
    const d = resp.data ? Object.values(resp.data)[0] : null;
    if (!d) return null;

    const quote = buildQuote(symbol, d);
    await cache.set(cacheKey, quote, 30);
    return quote;
  } catch (err) {
    console.warn(`[upstox] getQuote failed for ${symbol}:`, err.response?.data?.message || err.message);
    return null;
  }
};

/**
 * Bulk quotes — single Upstox API call for all symbols at once.
 * If the WebSocket feed is warm, returns from the live map instantly.
 */
const getBulkQuotes = async (symbols) => {
  const mapped = symbols.filter(s => getInstrKey(s));
  if (!mapped.length) return [];

  if (mapped.every(s => liveQuotes.has(s))) return mapped.map(s => liveQuotes.get(s));

  const keyParam = mapped
    .map(s => encodeURIComponent(getInstrKey(s)))
    .join(',');

  try {
    const { data: resp } = await upstox.get(`/market-quote/quotes?instrument_key=${keyParam}`);
    const results = [];

    const dataByToken = {};
    if (resp && resp.data) {
      for (const item of Object.values(resp.data)) {
        if (item.instrument_token) {
          dataByToken[item.instrument_token] = item;
        }
      }
    }

    for (const sym of mapped) {
      const instrKey = getInstrKey(sym);
      const d = dataByToken[instrKey];
      if (!d) continue;
      const quote = buildQuote(sym, d);
      await cache.set(`quote:${sym}`, quote, 30);
      liveQuotes.set(sym, quote);
      results.push(quote);
    }
    return results;
  } catch (err) {
    console.warn('[upstox] getBulkQuotes REST failed, trying sequential:', err.response?.data?.message || err.message);
    return (await Promise.all(mapped.map(getQuote))).filter(Boolean);
  }
};

/**
 * OHLCV candles — maps our resolution codes to Upstox intervals.
 * Output: [{ time (unix seconds), open, high, low, close, volume }]
 */
const getCandles = async (symbol, resolution = 'D') => {
  const instrKey = getInstrKey(symbol);
  if (!instrKey) return [];

  const cacheKey = `candles:${symbol}:${resolution}`;
  const hit = await cache.get(cacheKey);
  if (hit) return hit;

  const intervalMap = { '1': '1minute', '30': '30minute', D: 'day', W: 'week', M: 'month' };
  const interval    = intervalMap[resolution] || 'day';
  const isIntraday  = resolution === '1' || resolution === '30';
  const encodedKey  = encodeURIComponent(instrKey);

  try {
    let rawCandles;

    if (isIntraday) {
      const { data: resp } = await upstox.get(
        `/historical-candle/intraday/${encodedKey}/${interval}`
      );
      rawCandles = resp.data?.candles ?? [];
    } else {
      const now      = new Date();
      const toDate   = now.toISOString().split('T')[0];
      const daysBack = { D: 180, W: 730, M: 1825 }[resolution] ?? 180;
      const fromDate = new Date(now - daysBack * 86_400_000).toISOString().split('T')[0];

      const { data: resp } = await upstox.get(
        `/historical-candle/${encodedKey}/${interval}/${toDate}/${fromDate}`
      );
      rawCandles = resp.data?.candles ?? [];
    }

    // Upstox candle: [ISO_ts, open, high, low, close, volume, oi]
    const candles = rawCandles
      .map(([ts, open, high, low, close, volume]) => ({
        time: Math.floor(new Date(ts).getTime() / 1000),
        open, high, low, close, volume,
      }))
      .filter(c => c.open && c.close)
      .sort((a, b) => a.time - b.time);

    // Intraday (1m, 30m) cache for 60s. Daily for 12 hours, Weekly/Monthly for 24 hours.
    const ttl = isIntraday ? 60 : resolution === 'D' ? 43200 : 86400;
    await cache.set(cacheKey, candles, ttl);
    return candles;
  } catch (err) {
    console.warn(`[upstox] getCandles failed for ${symbol} (${resolution}):`, err.response?.data?.message || err.message);
    return [];
  }
};

/**
 * Search — filters our 50-stock list by ticker or company name.
 * Keeps the same return shape: [{ symbol, name }]
 */
const searchStocks = (query) => {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const results = [];

  for (const inst of allInstruments) {
    if (inst.symbol.toLowerCase().includes(q) || inst.name.toLowerCase().includes(q)) {
      results.push({ symbol: inst.symbol, name: inst.name });
      if (results.length >= 10) break;
    }
  }
  return results;
};

// ─── Startup Hydration ────────────────────────────────────────────────────────
// Load quotes from Redis into the live memory map so server restarts are fast
const hydrateLiveQuotes = async () => {
  const allSymbols = [...MARKET_SYMBOLS, ...MARKET_INDICES.map(i => i.symbol)];
  for (const sym of allSymbols) {
    const cached = await cache.get(`quote:${sym}`);
    if (cached) liveQuotes.set(sym, cached);
  }
  console.log(`[stockService] Hydrated ${liveQuotes.size} live quotes from Redis`);
};

// Hydrate asynchronously
hydrateLiveQuotes();


/**
 * Company profile — hardcoded sector/exchange + live quote from cache.
 * Returns the exact same shape as the old Finnhub/Yahoo implementation.
 */
const getProfile = async (symbol) => {
  const cacheKey = `profile:${symbol}`;
  const hit = await cache.get(cacheKey);
  if (hit) return hit;

  const instrKey = getInstrKey(symbol);
  const exchange = instrKey?.startsWith('BSE') ? 'BSE' : 'NSE';
  const cleanSym = symbol.replace(/\.(BO|NS)$/i, '');

  const profile = {
    name:                 STOCK_NAMES[symbol] || STOCK_NAMES[cleanSym] || symbol,
    ticker:               symbol,
    finnhubIndustry:      'N/A', // Upstox basic plan doesn't expose sectors
    marketCapitalization: null, // Upstox basic plan doesn't expose market cap
    exchange,
    country:              'India',
  };

  await cache.set(cacheKey, profile, 3600);
  return profile;
};

// ─── Derived market functions (same interface, same output) ──────────────────

const getTrending = async () => {
  const key = 'trending';
  const hit = await cache.get(key);
  if (hit) return hit;

  const quotes   = await getBulkQuotes(MARKET_SYMBOLS);
  const trending = quotes.filter(Boolean)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 10);

  await cache.set(key, trending, 60);
  return trending;
};

const getGainersLosers = async () => {
  const key = 'gainers-losers';
  const hit = await cache.get(key);
  if (hit) return hit;

  const sorted = (await getBulkQuotes(MARKET_SYMBOLS))
    .filter(Boolean)
    .sort((a, b) => b.changePercent - a.changePercent);

  const result = { gainers: sorted.slice(0, 5), losers: sorted.slice(-5).reverse() };
  await cache.set(key, result, 90);
  return result;
};

const getAllStocks = async () => {
  const key = 'all-stocks';
  const hit = await cache.get(key);
  if (hit) return hit;

  const allStocks = (await getBulkQuotes(MARKET_SYMBOLS))
    .filter(Boolean)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  await cache.set(key, allStocks, 60);
  return allStocks;
};

const getIndices = async () => {
  const key = 'market-indices';
  const hit = await cache.get(key);
  if (hit) return hit;

  const valid = (await getBulkQuotes(MARKET_INDICES.map(i => i.symbol))).filter(Boolean);
  await cache.set(key, valid, 60);
  return valid;
};

module.exports = {
  getQuote, searchStocks, getCandles, getProfile,
  getTrending, getGainersLosers, getAllStocks, getIndices,
  getBulkQuotes, updateLiveQuote, getToken, setToken,
  MARKET_SYMBOLS, MARKET_INDICES, STOCK_NAMES,
  SYMBOL_TO_INSTRUMENT, INSTRUMENT_TO_SYMBOL,
};
