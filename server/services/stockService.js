const cache = require('./cacheService');
const YahooFinance = require('yahoo-finance2').default;

// Instantiate yahoo-finance2 and suppress the upgrade survey notice
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ─── Static data ─────────────────────────────────────────────────────────────

// 50 popular Indian stocks tracked for trending / gainers / losers (BSE)
const MARKET_SYMBOLS = [
  'RELIANCE.BO', 'TCS.BO', 'HDFCBANK.BO', 'INFY.BO', 'HINDUNILVR.BO',
  'ICICIBANK.BO', 'SBIN.BO', 'BHARTIARTL.BO', 'ITC.BO', 'KOTAKBANK.BO',
  'LT.BO', 'BAJFINANCE.BO', 'HCLTECH.BO', 'MARUTI.BO', 'ASIANPAINT.BO',
  'AXISBANK.BO', 'TITAN.BO', 'SUNPHARMA.BO', 'WIPRO.BO', 'ULTRACEMCO.BO',
  'NESTLEIND.BO', 'ONGC.BO', 'NTPC.BO', 'TECHM.BO', 'TATASTEEL.BO',
  'BAJAJFINSV.BO', 'POWERGRID.BO', 'M&M.BO', 'HDFCLIFE.BO', 'INDUSINDBK.BO',
  'GRASIM.BO', 'DRREDDY.BO', 'CIPLA.BO', 'HINDALCO.BO', 'JSWSTEEL.BO',
  'APOLLOHOSP.BO', 'ADANIENT.BO', 'ADANIPORTS.BO', 'AMBUJACEM.BO', 'COALINDIA.BO',
  'TATACONSUM.BO', 'BRITANNIA.BO', 'DIVISLAB.BO', 'BAJAJ-AUTO.BO', 'HEROMOTOCO.BO',
  'EICHERMOT.BO', 'UPL.BO', 'BPCL.BO', 'SIEMENS.BO', 'SBILIFE.BO',
];

// 8 Popular Indian Indices
const MARKET_INDICES = [
  { symbol: '^BSESN',     name: 'Sensex' },
  { symbol: '^NSEI',      name: 'Nifty 50' },
  { symbol: '^NSEBANK',   name: 'Nifty Bank' },
  { symbol: '^CNXIT',     name: 'Nifty IT' },
  { symbol: '^CNXAUTO',   name: 'Nifty Auto' },
  { symbol: '^CNXFMCG',   name: 'Nifty FMCG' },
  { symbol: '^CNXPHARMA', name: 'Nifty Pharma' },
  { symbol: '^NSMIDCP',   name: 'Nifty Midcap 50' },
];

// Company names for the popular list
const STOCK_NAMES = {
  'RELIANCE.BO': 'Reliance Ind.',     'TCS.BO': 'TCS',                 'HDFCBANK.BO': 'HDFC Bank',
  'INFY.BO': 'Infosys',               'HINDUNILVR.BO': 'HUL',          'ICICIBANK.BO': 'ICICI Bank',
  'SBIN.BO': 'State Bank of India',   'BHARTIARTL.BO': 'Bharti Airtel','ITC.BO': 'ITC Limited',
  'KOTAKBANK.BO': 'Kotak Mahindra',   'LT.BO': 'Larsen & Toubro',      'BAJFINANCE.BO': 'Bajaj Finance',
  'HCLTECH.BO': 'HCL Tech',           'MARUTI.BO': 'Maruti Suzuki',    'ASIANPAINT.BO': 'Asian Paints',
  'AXISBANK.BO': 'Axis Bank',         'TITAN.BO': 'Titan Company',     'SUNPHARMA.BO': 'Sun Pharma',
  'WIPRO.BO': 'Wipro',                'ULTRACEMCO.BO': 'UltraTech',    'NESTLEIND.BO': 'Nestle India',
  'ONGC.BO': 'ONGC',                  'NTPC.BO': 'NTPC Limited',       'TECHM.BO': 'Tech Mahindra',
  'TATASTEEL.BO': 'Tata Steel',       'BAJAJFINSV.BO': 'Bajaj Finserv','POWERGRID.BO': 'Power Grid',
  'M&M.BO': 'M&M',                    'HDFCLIFE.BO': 'HDFC Life',      'INDUSINDBK.BO': 'IndusInd Bank',
  'GRASIM.BO': 'Grasim Industries',   'DRREDDY.BO': 'Dr. Reddy\'s',    'CIPLA.BO': 'Cipla',
  'HINDALCO.BO': 'Hindalco',          'JSWSTEEL.BO': 'JSW Steel',      'APOLLOHOSP.BO': 'Apollo Hospitals',
  'ADANIENT.BO': 'Adani Ent.',        'ADANIPORTS.BO': 'Adani Ports',  'AMBUJACEM.BO': 'Ambuja Cements',
  'COALINDIA.BO': 'Coal India',       'TATACONSUM.BO': 'Tata Consumer','BRITANNIA.BO': 'Britannia',
  'DIVISLAB.BO': 'Divi\'s Labs',      'BAJAJ-AUTO.BO': 'Bajaj Auto',   'HEROMOTOCO.BO': 'Hero MotoCorp',
  'EICHERMOT.BO': 'Eicher Motors',    'UPL.BO': 'UPL Limited',         'BPCL.BO': 'BPCL',
  'SIEMENS.BO': 'Siemens',            'SBILIFE.BO': 'SBI Life',
};

// ─── Core API functions ───────────────────────────────────────────────────────

/**
 * Fetch real-time quote for a single symbol.
 * Cached for 30 seconds.
 */
const getQuote = async (symbol) => {
  const key = `quote:${symbol}`;
  const hit = await cache.get(key);
  if (hit) return hit;

  try {
    const d = await yahooFinance.quote(symbol);

    if (!d) {
      console.warn(`[yahooFinance] getQuote returned no data for ${symbol}`);
      return null;
    }

    const quote = {
      symbol,
      name: STOCK_NAMES[symbol] || MARKET_INDICES.find(i => i.symbol === symbol)?.name || d.shortName || symbol,
      price:         d.regularMarketPrice ?? 0,
      change:        d.regularMarketChange ?? 0,
      changePercent: d.regularMarketChangePercent ?? 0,
      high:          d.regularMarketDayHigh ?? 0,
      low:           d.regularMarketDayLow ?? 0,
      open:          d.regularMarketOpen ?? 0,
      prevClose:     d.regularMarketPreviousClose ?? 0,
      timestamp:     d.regularMarketTime ? Math.floor(d.regularMarketTime.getTime() / 1000) : Math.floor(Date.now() / 1000),
    };

    await cache.set(key, quote, 30);
    return quote;
  } catch (error) {
    console.warn(`[yahooFinance] getQuote failed for ${symbol}:`, error.message);
    return null;
  }
};

/**
 * Symbol + company name search
 * Returns up to 10 common US stocks (filters out ETFs, FX, etc. based on Yahoo properties).
 */
const searchStocks = async (query) => {
  if (!query || query.length < 1) return [];
  try {
    const d = await yahooFinance.search(query);
    return (d.quotes || [])
      .filter((s) => s.isYahooFinance && (s.quoteType === 'EQUITY'))
      .slice(0, 10)
      .map((s) => ({ symbol: s.symbol, name: s.shortName || s.longName }));
  } catch (error) {
    console.warn(`[yahooFinance] searchStocks failed for ${query}:`, error.message);
    return [];
  }
};

/**
 * Fetch OHLCV candles for charting.
 * resolution: 'D' | 'W' | 'M' | '60' | '30'
 * Returns array of { time (Unix seconds), open, high, low, close, volume }
 */
const getCandles = async (symbol, resolution = 'D') => {
  const now = Math.floor(Date.now() / 1000);
  const ranges = { D: 180, W: 730, M: 1825, '60': 5, '30': 2 };
  const daysBack = ranges[resolution] ?? 180;
  
  const fromDate = new Date((now - daysBack * 86400) * 1000);
  const toDate = new Date(now * 1000);

  const key = `candles:${symbol}:${resolution}`;
  const hit = await cache.get(key);
  if (hit) return hit;

  const intervalMap = { D: '1d', W: '1wk', M: '1mo', '60': '1h', '30': '30m' };
  const interval = intervalMap[resolution] || '1d';

  try {
    let d;
    if (interval === '1h' || interval === '30m') {
      const chartResult = await yahooFinance.chart(symbol, {
        period1: fromDate,
        period2: toDate,
        interval: interval
      });
      d = chartResult.quotes || [];
    } else {
      d = await yahooFinance.historical(symbol, {
        period1: fromDate,
        period2: toDate,
        interval: interval
      });
    }

    if (!d || d.length === 0) return [];

    const candles = d.map(item => ({
      time: Math.floor(item.date.getTime() / 1000),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    }));

    const ttl = resolution === 'D' ? 300 : resolution === '60' ? 60 : 600;
    await cache.set(key, candles, ttl);
    return candles;
  } catch (error) {
    console.warn(`[yahooFinance] getCandles failed for ${symbol}:`, error.message);
    return [];
  }
};

/**
 * Company profile (logo, exchange, market cap, etc.)
 * Cached for 1 hour — rarely changes.
 */
const getProfile = async (symbol) => {
  const key = `profile:${symbol}`;
  const hit = await cache.get(key);
  if (hit) return hit;

  try {
    const d = await yahooFinance.quoteSummary(symbol, { modules: ['assetProfile', 'price'] });
    const profile = {
      name: d.price?.shortName || STOCK_NAMES[symbol] || symbol,
      ticker: symbol,
      finnhubIndustry: d.assetProfile?.industry || 'N/A', // kept property name to avoid frontend refactor
      marketCapitalization: d.price?.marketCap ? d.price.marketCap / 1000000 : null, // Finnhub gave marketCap in millions
      exchange: d.price?.exchangeName || 'N/A',
      country: d.assetProfile?.country || 'India',
    };
    
    await cache.set(key, profile, 3600);
    return profile;
  } catch (error) {
    console.warn(`[yahooFinance] getProfile failed for ${symbol}:`, error.message);
    return {};
  }
};

/**
 * Trending stocks: sorted by absolute % change (most volatile first).
 * Cached for 60 seconds.
 */
const getTrending = async () => {
  const key = 'trending';
  const hit = await cache.get(key);
  if (hit) return hit;

  const quotes = await getBulkQuotes(MARKET_SYMBOLS);
  const trending = [...quotes]
    .filter(q => q !== null)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 10);

  await cache.set(key, trending, 60);
  return trending;
};

/**
 * Top 5 gainers and top 5 losers from MARKET_SYMBOLS.
 * Cached for 90 seconds.
 */
const getGainersLosers = async () => {
  const key = 'gainers-losers';
  const hit = await cache.get(key);
  if (hit) return hit;

  const quotes = await getBulkQuotes(MARKET_SYMBOLS);
  const sorted = [...quotes]
    .filter(q => q !== null)
    .sort((a, b) => b.changePercent - a.changePercent);

  const result = {
    gainers: sorted.slice(0, 5),
    losers:  sorted.slice(-5).reverse(),
  };

  await cache.set(key, result, 90);
  return result;
};

/**
 * All 50 popular Indian stocks.
 * Cached for 60 seconds.
 */
const getAllStocks = async () => {
  const key = 'all-stocks';
  const hit = await cache.get(key);
  if (hit) return hit;

  const quotes = await getBulkQuotes(MARKET_SYMBOLS);
  const allStocks = [...quotes]
    .filter(q => q !== null)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  await cache.set(key, allStocks, 60);
  return allStocks;
};

/**
 * Bulk quotes for a list of symbols (e.g. watchlist).
 * Each quote is individually cached.
 */
const getBulkQuotes = async (symbols) => {
  const results = [];
  // Process in chunks of 5
  for (let i = 0; i < symbols.length; i += 5) {
    const chunk = symbols.slice(i, i + 5);
    const chunkResults = await Promise.all(chunk.map(getQuote));
    results.push(...chunkResults);
    // Add a tiny delay between chunks if it's a large list
    if (i + 5 < symbols.length) await new Promise(res => setTimeout(res, 200));
  }
  return results;
};

/**
 * Get quotes for all supported indices.
 * Cached for 60 seconds.
 */
const getIndices = async () => {
  const key = 'market-indices';
  const hit = await cache.get(key);
  if (hit) return hit;

  const symbols = MARKET_INDICES.map(i => i.symbol);
  const quotes = await getBulkQuotes(symbols);
  
  const validQuotes = quotes.filter(q => q !== null);
  await cache.set(key, validQuotes, 60);
  return validQuotes;
};

module.exports = {
  getQuote,
  searchStocks,
  getCandles,
  getProfile,
  getTrending,
  getGainersLosers,
  getAllStocks,
  getIndices,
  getBulkQuotes,
  MARKET_SYMBOLS,
  MARKET_INDICES,
};
