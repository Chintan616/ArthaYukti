const express  = require('express');
const { getWatchlists, createWatchlist, deleteWatchlist, addToWatchlist, removeFromWatchlist } =
  require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getWatchlists);
router.post('/', createWatchlist);
router.delete('/:id', deleteWatchlist);
router.post('/:id/symbols', addToWatchlist);
router.delete('/:id/symbols/:symbol', removeFromWatchlist);

module.exports = router;
