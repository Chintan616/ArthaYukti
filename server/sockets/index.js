const path       = require('path');
const WebSocket  = require('ws');
const protobuf   = require('protobufjs');
const axios      = require('axios');
const { Server } = require('socket.io');
const stockService = require('../services/stockService');

// ─── Proto loading ────────────────────────────────────────────────────────────

let FeedResponse         = null;
let MarketDataFeedRequest = null;

const loadProto = async () => {
  if (FeedResponse) return; // already loaded
  const root = await protobuf.load(
    path.join(__dirname, '../proto/MarketDataFeed.proto')
  );
  FeedResponse          = root.lookupType('com.upstox.marketdatafeeder.rpc.proto.FeedResponse');
  MarketDataFeedRequest = root.lookupType('com.upstox.marketdatafeeder.rpc.proto.MarketDataFeedRequest');
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getToken = () => process.env.UPSTOX_ACCESS_TOKEN;

const getAuthorizedWsUrl = async () => {
  const { data } = await axios.get(
    'https://api.upstox.com/v3/feed/market-data-feed/authorize',
    { headers: { Authorization: `Bearer ${getToken()}`, Accept: 'application/json' } }
  );
  return data.data.authorizedRedirectUri;
};

// Build the subscription Protobuf message for all tracked symbols
const buildSubscriptionMsg = () => {
  const allInstrumentKeys = [
    ...stockService.MARKET_SYMBOLS,
    ...stockService.MARKET_INDICES.map(i => i.symbol),
  ]
    .filter(s => stockService.SYMBOL_TO_INSTRUMENT[s])
    .map(s => stockService.SYMBOL_TO_INSTRUMENT[s]);

  const payload = MarketDataFeedRequest.create({
    method: 0,  // sub
    data: {
      mode:           1,                // full_mode
      instrumentKeys: allInstrumentKeys,
    },
    guid: Date.now().toString(),
  });
  return MarketDataFeedRequest.encode(payload).finish();
};

const decodeFeedMessage = (buffer) => {
  const decoded = FeedResponse.decode(buffer);
  const quotes  = [];

  for (const [instrColonKey, feed] of Object.entries(decoded.feeds || {})) {
    const symbol = stockService.INSTRUMENT_TO_SYMBOL[instrColonKey];
    if (!symbol) continue;

    const name =
      stockService.STOCK_NAMES[symbol] ||
      stockService.MARKET_INDICES.find(i => i.symbol === symbol)?.name ||
      symbol;

    const ff = feed.ff;
    if (!ff) continue;

    // MarketFF (equities) or IndexFF (indices) — same field names ch/chp
    const data = ff.marketFF || ff.indexFF;
    if (!data) continue;

    const ltpc      = data.ltpc;
    const price     = ltpc?.ltp     ?? 0;
    const prevClose = ltpc?.cp      ?? 0;
    const change    = data.ch       ?? (price - prevClose);
    const changePercent = data.chp  ?? (prevClose > 0 ? (change / prevClose) * 100 : 0);

    // Intraday OHLC is tagged with interval 'I' in Upstox feed
    const ohlc = data.marketOHLC?.ohlc?.find(o => o.interval === 'I') ||
                 data.marketOHLC?.ohlc?.[0];

    const quote = {
      symbol:        symbol,
      name,
      price,
      change,
      changePercent,
      high:          ohlc?.high     ?? price,
      low:           ohlc?.low      ?? price,
      open:          ohlc?.open     ?? prevClose,
      prevClose,
      timestamp:     Math.floor(Date.now() / 1000),
    };

    quotes.push(quote);
    stockService.updateLiveQuote(quote); // keep REST cache warm
  }

  return quotes;
};

// ─── Upstox WebSocket management ─────────────────────────────────────────────

let upstoxWs       = null;
let reconnectTimer = null;
let pollTimer      = null;
let ioInstance     = null;

const stopReconnect = () => { if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; } };
const stopPoll      = () => { if (pollTimer)      { clearInterval(pollTimer);     pollTimer = null;      } };

// Fallback: poll via REST when WebSocket is unavailable
const startRestPolling = () => {
  if (pollTimer) return;
  console.log('[socket] WebSocket unavailable — polling via REST every 30 s');
  pollTimer = setInterval(async () => {
    if (!ioInstance || ioInstance.sockets.sockets.size === 0) return;
    try {
      const quotes = await stockService.getBulkQuotes(stockService.MARKET_SYMBOLS);
      ioInstance.emit('market:update', quotes);
    } catch (err) {
      console.error('[socket] REST poll error:', err.message);
    }
  }, 30_000);
};

const connectUpstoxWebSocket = async () => {
  if (!getToken() || getToken() === 'YOUR_UPSTOX_ACCESS_TOKEN_HERE') {
    console.warn('[upstox-ws] No access token — using REST polling fallback');
    startRestPolling();
    return;
  }

  try {
    await loadProto();
    const wsUrl = await getAuthorizedWsUrl();
    upstoxWs = new WebSocket(wsUrl);

    upstoxWs.on('open', () => {
      console.log('[upstox-ws] Connected — subscribing to', stockService.MARKET_SYMBOLS.length + stockService.MARKET_INDICES.length, 'instruments');
      stopPoll(); // stop REST polling once WebSocket is live
      upstoxWs.send(buildSubscriptionMsg());
    });

    upstoxWs.on('message', (data) => {
      if (!ioInstance) return;
      try {
        const quotes = decodeFeedMessage(data);
        if (quotes.length > 0) {
          ioInstance.emit('market:update', quotes);
        }
      } catch (err) {
        console.error('[upstox-ws] decode error:', err.message);
      }
    });

    upstoxWs.on('error', (err) => {
      console.error('[upstox-ws] error:', err.message);
    });

    upstoxWs.on('close', (code, reason) => {
      console.warn(`[upstox-ws] closed (${code}) — reconnecting in 10 s`);
      upstoxWs = null;
      startRestPolling(); // keep data flowing while reconnecting
      stopReconnect();
      reconnectTimer = setTimeout(connectUpstoxWebSocket, 10_000);
    });

  } catch (err) {
    console.error('[upstox-ws] connection failed:', err.response?.data?.message || err.message);
    startRestPolling();
    stopReconnect();
    // Back off: 30 s on auth errors (likely expired token), 10 s on network errors
    const delay = err.response?.status === 401 ? 60_000 : 10_000;
    reconnectTimer = setTimeout(connectUpstoxWebSocket, delay);
  }
};

// ─── Socket.IO setup ─────────────────────────────────────────────────────────

let io = null;

const initSocket = (httpServer) => {
  ioInstance = io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:5173',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    // Client requests live quotes for a specific symbol list (e.g. watchlist)
    socket.on('subscribe:stocks', async (symbols) => {
      if (!Array.isArray(symbols) || symbols.length === 0) return;
      try {
        const quotes = await stockService.getBulkQuotes(symbols.slice(0, 25));
        socket.emit('stock:quotes', quotes);
      } catch (err) {
        console.error('[socket] subscribe:stocks error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[socket] Client disconnected: ${socket.id}`);
    });
  });

  // Start Upstox WebSocket (with REST fallback built in)
  connectUpstoxWebSocket();

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
