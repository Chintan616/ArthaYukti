const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

connectDB();

const app = express();

// Log requests in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check — useful for deployment probes
app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'ArthaYukti API is running' });
});

// 404 for unmatched routes
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralized error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
