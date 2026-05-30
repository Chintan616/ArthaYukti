const express  = require('express');
const { searchStocks, getTrending, getGainersLosers, getIndices, getAllStocks, getStock, getHistory, updateUpstoxToken } =
  require('../controllers/stockController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// All stock routes require a valid JWT
router.use(protect);

router.get('/search',         searchStocks);
router.post('/admin/token',   admin, updateUpstoxToken);
router.get('/trending',       getTrending);
router.get('/gainers-losers', getGainersLosers);
router.get('/indices',        getIndices);
router.get('/all',            getAllStocks);
router.get('/:symbol/history', getHistory);
router.get('/:symbol',        getStock);

module.exports = router;
