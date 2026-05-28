const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:          { type: String, enum: ['DEPOSIT', 'DEBIT'], required: true },
    amount:        { type: Number, required: true },
    // Razorpay references (populated after successful payment verification)
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
    status:        { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    description:   { type: String },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
