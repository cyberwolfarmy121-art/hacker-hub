const mongoose = require('mongoose');

const allianceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['offence', 'defence'], required: true },
  description: { type: String },
  founder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    allianceRank: { type: String, enum: ['MEMBER', 'OPERATIVE', 'ELITE', 'MARSHAL'], default: 'MEMBER' },
    permissions: {
      messaging: { type: Boolean, default: true },
      tasks: { type: Boolean, default: true },
      flagging: { type: Boolean, default: false },
      invites: { type: Boolean, default: false },
      promote: { type: Boolean, default: false },
      demote: { type: Boolean, default: false },
      manageTasks: { type: Boolean, default: false },
      managePermissions: { type: Boolean, default: false },
      remove: { type: Boolean, default: false }
    },
    joinedAt: { type: Date, default: Date.now }
  }],
  rankPermissions: {
    type: Map,
    of: {
      messaging: { type: Boolean, default: true },
      tasks: { type: Boolean, default: true },
      flagging: { type: Boolean, default: false },
      invites: { type: Boolean, default: false },
      promote: { type: Boolean, default: false },
      demote: { type: Boolean, default: false },
      manageTasks: { type: Boolean, default: false },
      managePermissions: { type: Boolean, default: false },
      remove: { type: Boolean, default: false }
    }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alliance', allianceSchema);