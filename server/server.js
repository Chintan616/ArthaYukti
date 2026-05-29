const http    = require('http');
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const helmet  = require('helmet');
const dotenv  = require('dotenv');

const mongoose = require('mongoose');
const connectDB        = require('./config/db');
const { initSocket }   = require('./sockets');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

const authRoutes      = require('./routes/authRoutes');
const stockRoutes     = require('./routes/stockRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const alertRoutes     = require('./routes/alertRoutes');
const walletRoutes    = require('./routes/walletRoutes');


dotenv.config();
connectDB();

mongoose.connection.once('open', async () => {
  try {
    await mongoose.connection.db.collection('watchlists').dropIndex('user_1');
    console.log('[db] Dropped legacy user_1 index on watchlists');
  } catch (e) {
    // Ignore if index doesn't exist
  }
});

const app    = express();
const server = http.createServer(app); // wrap in http.Server for Socket.IO

// Attach Socket.IO to the HTTP server
initSocket(server);

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ─── Body parser ─────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Rate limiting ───────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/stocks',    stockRoutes);
app.use('/api/watchlist', watchlistRoutes);

app.use('/api/portfolio', portfolioRoutes);
app.use('/api/alerts',    alertRoutes);
app.use('/api/wallet',    walletRoutes);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'ArthaYukti API is running' })
);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use('*', (_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// ─── Centralized error handler ───────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("=== ERROR HANDLER ===");
  console.error(err.stack || err);
  
  const statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // Handle Razorpay specific error format
  if (err.error && err.error.description) {
    message = err.error.description;
  }

  res.status(statusCode).json({
    success: false,
    message: message,
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`[server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
