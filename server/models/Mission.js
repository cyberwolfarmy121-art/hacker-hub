const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    required: true 
  },
  points: { type: Number, required: true },
  category: { type: String, required: true },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mission', missionSchema);