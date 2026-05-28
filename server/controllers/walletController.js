const crypto      = require('crypto');
const Razorpay    = require('razorpay');
const asyncHandler = require('../middleware/asyncHandler');
const Portfolio   = require('../models/Portfolio');
const WalletTransaction = require('../models/WalletTransaction');
const Transaction = require('../models/Transaction');

// Lazy-initialize so a missing/placeholder key won't crash the server at boot
let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_YOUR')) {
      throw new Error('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

// GET /api/wallet — current virtual balance + recent wallet deposits
const getWallet = asyncHandler(async (req, res) => {
  let portfolio = await Portfolio.findOne({ user: req.user._id });
  if (!portfolio) {
    portfolio = await Portfolio.create({ user: req.user._id, virtualBalance: 100000, holdings: [] });
  }

  const deposits = await WalletTransaction.find({ user: req.user._id, status: 'SUCCESS' })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    success: true,
    virtualBalance: portfolio.virtualBalance,
    deposits,
  });
});

// POST /api/wallet/create-order — create a Razorpay order
const createOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body; // amount in INR (not paise)

  if (!amount || amount <= 0 || amount > 1000000) {
    res.status(400);
    throw new Error('Invalid amount. Must be between ₹1 and ₹10,00,000');
  }

  const options = {
    amount:   Math.round(amount * 100), // Razorpay expects paise
    currency: 'INR',
    // Razorpay receipt max length is 40 chars. 
    // Format: w_<last_6_of_userId>_<timestamp>
    receipt:  `w_${req.user._id.toString().slice(-6)}_${Date.now()}`,
    notes:    { userId: req.user._id.toString() },
  };

  const order = await getRazorpay().orders.create(options);

  // Record a pending wallet transaction
  await WalletTransaction.create({
    user:             req.user._id,
    type:             'DEPOSIT',
    amount,
    razorpayOrderId:  order.id,
    status:           'PENDING',
    description:      `Add ₹${amount} to virtual wallet`,
  });

  res.json({
    success: true,
    orderId:  order.id,
    amount:   order.amount,
    currency: order.currency,
    keyId:    process.env.RAZORPAY_KEY_ID,
  });
});

// POST /api/wallet/verify — HMAC-SHA256 signature check + credit virtual balance
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('Missing payment verification fields');
  }

  // Verify signature
  const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature) {
    // Mark the transaction as failed
    await WalletTransaction.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, user: req.user._id },
      { status: 'FAILED', razorpayPaymentId: razorpay_payment_id }
    );
    res.status(400);
    throw new Error('Payment verification failed — invalid signature');
  }

  // Find the pending wallet transaction
  const walletTx = await WalletTransaction.findOne({
    razorpayOrderId: razorpay_order_id,
    user:            req.user._id,
    status:          'PENDING',
  });

  if (!walletTx) {
    res.status(404);
    throw new Error('Wallet transaction record not found');
  }

  // Credit the virtual balance
  let portfolio = await Portfolio.findOne({ user: req.user._id });
  if (!portfolio) {
    portfolio = await Portfolio.create({ user: req.user._id, virtualBalance: 100000, holdings: [] });
  }
  portfolio.virtualBalance += walletTx.amount;
  await portfolio.save();

  // Mark the wallet transaction as successful
  walletTx.status           = 'SUCCESS';
  walletTx.razorpayPaymentId = razorpay_payment_id;
  await walletTx.save();

  res.json({
    success:        true,
    message:        `₹${walletTx.amount} added to your virtual wallet`,
    virtualBalance: portfolio.virtualBalance,
    transaction:    walletTx,
  });
});

// GET /api/wallet/transactions — all trade transactions (BUY/SELL history)
const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, transactions });
});

module.exports = { getWallet, createOrder, verifyPayment, getTransactions };
