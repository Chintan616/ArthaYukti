const express  = require('express');
const { getPortfolio, getPortfolioSummary, getHistory } =
  require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/',        getPortfolio);
router.get('/summary', getPortfolioSummary);
router.get('/history', getHistory);

module.exports = router;
