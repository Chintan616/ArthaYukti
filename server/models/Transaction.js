const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, enum: ['BUY', 'SELL'], required: true },
    symbol:   { type: String, required: true, uppercase: true },
    name:     { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    price:    { type: Number, required: true },
    total:    { type: Number, required: true }, // quantity * price
  },
  { timestamps: true }
);

// Index for fast user-specific trade history queries (newest first)
transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
