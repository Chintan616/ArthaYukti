const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Serialise safe user fields — never expose password or internal fields
const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Password is hashed by the pre-save hook in User model
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: formatUser(user),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Must explicitly select password since schema has select: false
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // Generic message — do not reveal whether email exists
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: formatUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// @route   GET /api/auth/me
// @access  Protected
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

// @route   PUT /api/auth/update
// @access  Protected
const updateCredentials = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password' });
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect current password' });
      }
      user.password = newPassword;
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Credentials updated successfully',
      user: formatUser(user),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = { signup, login, getMe, updateCredentials };
