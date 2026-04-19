const express = require('express');
const Mission = require('../models/Mission');
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
    const missions = await Mission.find().sort({ createdAt: -1 });
    res.json(missions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { title, description, difficulty, points, category } = req.body;
    
    const mission = new Mission({
      title,
      description,
      difficulty,
      points,
      category,
      createdBy: decoded.userId
    });
    
    await mission.save();
    res.status(201).json(mission);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const mission = await Mission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!mission) {
      return res.status(404).json({ message: 'Mission not found' });
    }
    
    res.json(mission);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const mission = await Mission.findByIdAndDelete(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ message: 'Mission not found' });
    }
    
    res.json({ message: 'Mission deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;