const express = require('express');
const { getAlerts, createAlert, toggleAlert, deleteAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes require auth

router.route('/')
  .get(getAlerts)
  .post(createAlert);

router.route('/:id')
  .patch(toggleAlert)
  .delete(deleteAlert);

module.exports = router;
