const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
  ip: String
});

module.exports = mongoose.model('AuditLog', auditLogSchema);