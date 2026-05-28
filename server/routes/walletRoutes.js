const express = require('express');
const { getWallet, createOrder, verifyPayment, getTransactions } =
  require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/',              getWallet);
router.post('/create-order', createOrder);
router.post('/verify',       verifyPayment);
router.get('/transactions',  getTransactions);

module.exports = router;
