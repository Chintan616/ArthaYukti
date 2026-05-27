const Alert = require('../models/Alert');

// GET /api/alerts
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/alerts
const createAlert = async (req, res) => {
  try {
    const { symbol, targetPrice, condition } = req.body;
    if (!symbol || !targetPrice || !condition) {
      return res.status(400).json({ success: false, message: 'Please provide symbol, targetPrice, and condition' });
    }

    const alert = await Alert.create({
      user: req.user._id,
      symbol: symbol.toUpperCase(),
      targetPrice,
      condition
    });

    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/alerts/:id
const toggleAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (alert.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    alert.isActive = !alert.isActive;
    await alert.save();
    res.json(alert);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/alerts/:id
const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (alert.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await alert.deleteOne();
    res.json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAlerts,
  createAlert,
  toggleAlert,
  deleteAlert
};
