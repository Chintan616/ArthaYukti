const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      default: 'My Watchlist',
    },
    symbols: [{ type: String, uppercase: true, trim: true }],
  },
  { timestamps: true }
);

// Prevent duplicate watchlist names for the same user
watchlistSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
