const { Server } = require('socket.io');
const stockService = require('../services/stockService');

let io = null;

// Broadcast interval handle — kept so we can clear it on server shutdown
let broadcastTimer = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    // Client subscribes to a list of symbols (e.g. their watchlist)
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

  // Broadcast updated market quotes to ALL connected clients every 30 seconds.
  // Quotes are cached in stockService, so this won't exceed Finnhub rate limits.
  broadcastTimer = setInterval(async () => {
    if (io.sockets.sockets.size === 0) return; // skip if no one is connected
    try {
      const quotes = await stockService.getBulkQuotes(stockService.MARKET_SYMBOLS);
      io.emit('market:update', quotes);
    } catch (err) {
      console.error('[socket] market:update broadcast error:', err.message);
    }
  }, 30_000);

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
