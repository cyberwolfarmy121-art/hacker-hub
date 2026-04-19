const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hackerhub_secret_key_2024';

function verifyToken(req) {
  try {
    const token = req.headers.authorization.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const activeUsers = await User.countDocuments({ isBanned: false });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    res.json({
      totalUsers,
      adminUsers,
      activeUsers,
      bannedUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:id/warn', async (req, res) => {
  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.warnings += 1;
    await user.save();

    res.json({ message: 'Warning issued', warnings: user.warnings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:id/ban', async (req, res) => {
  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({ message: user.isBanned ? 'User banned' : 'User unbanned', isBanned: user.isBanned });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;