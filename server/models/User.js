const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  codename: { type: String, required: true, unique: true, uppercase: true },
  displayName: { type: String, trim: true },
  role: { type: String, enum: ['RECRUIT', 'CADET', 'ANALYST', 'SPECIALIST', 'GUARDIAN', 'ELITE', 'COMMANDER', 'ADMIN'], default: 'RECRUIT' },
  points: { type: Number, default: 0 },
  warnings: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  banExpiresAt: { type: Date },
  isSuspended: { type: Boolean, default: false },
  suspensionCount: { type: Number, default: 0 },
  fakeIp: { type: String, default: null },
  realIp: { type: String, default: null },
  allianceType: { type: String, enum: ['offence', 'defence', null], default: null },
  allianceRank: { type: String, enum: ['MEMBER', 'OPERATIVE', 'ELITE', 'MARSHAL', null], default: null },
  idVerified: { type: Boolean, default: false },
  idVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  idVerifiedAt: { type: Date },
  idCard: {
    created: { type: Date, default: Date.now },
    expiry: { type: Date, default: () => new Date(Date.now() + 150 * 24 * 60 * 60 * 1000) }
  },
  rulesAccepted: { type: Boolean, default: false },
  rulesAcceptedAt: { type: Date },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);