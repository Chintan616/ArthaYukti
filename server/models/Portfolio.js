const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema(
  {
    symbol:   { type: String, required: true, uppercase: true, trim: true },
    name:     { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0 },
    avgPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    virtualBalance: { type: Number, default: 100000 }, // Rs 1,00,000 paper money
    holdings: [holdingSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', portfolioSchema);
