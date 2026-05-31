const ChatThread = require('../models/ChatThread');

// @desc    Get all chat threads for logged in user (summary only)
// @route   GET /api/chats
// @access  Private
const getChatThreads = async (req, res) => {
  try {
    // Only return _id, title, and updatedAt to save bandwidth
    const threads = await ChatThread.find({ user: req.user._id })
      .select('_id title updatedAt')
      .sort({ updatedAt: -1 });
    
    res.json(threads);
  } catch (error) {
    console.error(`Error in getChatThreads: ${error.message}`);
    res.status(500).json({ message: 'Server error fetching chat threads' });
  }
};

// @desc    Get single chat thread with all messages
// @route   GET /api/chats/:id
// @access  Private
const getChatThread = async (req, res) => {
  try {
    const thread = await ChatThread.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!thread) {
      return res.status(404).json({ message: 'Chat thread not found' });
    }

    res.json(thread);
  } catch (error) {
    console.error(`Error in getChatThread: ${error.message}`);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Chat thread not found' });
    }
    res.status(500).json({ message: 'Server error fetching chat thread' });
  }
};

// @desc    Create new chat thread
// @route   POST /api/chats
// @access  Private
const createChatThread = async (req, res) => {
  const { title, initialMessage } = req.body;

  try {
    const thread = new ChatThread({
      user: req.user._id,
      title: title || 'New Chat',
      messages: initialMessage ? [initialMessage] : []
    });

    const createdThread = await thread.save();
    res.status(201).json(createdThread);
  } catch (error) {
    console.error(`Error in createChatThread: ${error.message}`);
    res.status(500).json({ message: 'Server error creating chat thread' });
  }
};

// @desc    Add messages to a thread
// @route   PUT /api/chats/:id/messages
// @access  Private
const addMessagesToThread = async (req, res) => {
  const { messages } = req.body; // Expects an array of messages or a single message

  if (!messages) {
    return res.status(400).json({ message: 'No messages provided' });
  }

  try {
    const thread = await ChatThread.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!thread) {
      return res.status(404).json({ message: 'Chat thread not found' });
    }

    if (Array.isArray(messages)) {
      thread.messages.push(...messages);
    } else {
      thread.messages.push(messages);
    }

    const updatedThread = await thread.save();
    res.json(updatedThread);
  } catch (error) {
    console.error(`Error in addMessagesToThread: ${error.message}`);
    res.status(500).json({ message: 'Server error appending message' });
  }
};

// @desc    Delete a chat thread
// @route   DELETE /api/chats/:id
// @access  Private
const deleteChatThread = async (req, res) => {
  try {
    const thread = await ChatThread.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!thread) {
      return res.status(404).json({ message: 'Chat thread not found' });
    }

    res.json({ message: 'Chat thread removed' });
  } catch (error) {
    console.error(`Error in deleteChatThread: ${error.message}`);
    res.status(500).json({ message: 'Server error deleting chat thread' });
  }
};

module.exports = {
  getChatThreads,
  getChatThread,
  createChatThread,
  addMessagesToThread,
  deleteChatThread
};
