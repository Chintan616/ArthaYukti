const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getChatThreads,
  getChatThread,
  createChatThread,
  addMessagesToThread,
  deleteChatThread
} = require('../controllers/chatController');

router.route('/')
  .get(protect, getChatThreads)
  .post(protect, createChatThread);

router.route('/:id')
  .get(protect, getChatThread)
  .delete(protect, deleteChatThread);

router.route('/:id/messages')
  .put(protect, addMessagesToThread);

module.exports = router;
