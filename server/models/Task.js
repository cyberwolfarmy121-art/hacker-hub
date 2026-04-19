const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], required: true },
  category: { type: String, required: true },
  points: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  deadline: { type: Date },
  hints: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);