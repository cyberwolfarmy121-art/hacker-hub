const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(helmet());
app.use(cors({ 
  origin: process.env.CLIENT_URL || "http://localhost:3000", 
  credentials: true 
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

const JWT_SECRET = process.env.JWT_SECRET || 'hackerhub_secret_key_change_this_in_production';

const RANKS = {
  RECRUIT: { level: 0, name: 'Recruit', pointsRequired: 0, color: '#6b7280', permissions: {} },
  CADET: { level: 1, name: 'Cadet', pointsRequired: 100, color: '#3b82f6', permissions: { reactions: true } },
  ANALYST: { level: 2, name: 'Analyst', pointsRequired: 300, color: '#8b5cf6', permissions: { reactions: true, highlight: true } },
  SPECIALIST: { level: 3, name: 'Specialist', pointsRequired: 600, color: '#ec4899', permissions: { reactions: true, highlight: true, flag: true } },
  GUARDIAN: { level: 4, name: 'Cyber Guardian', pointsRequired: 1000, color: '#f59e0b', permissions: { reactions: true, highlight: true, flag: true, mute: true } },
  ELITE: { level: 5, name: 'Elite Defender', pointsRequired: 2000, color: '#10b981', permissions: { reactions: true, highlight: true, flag: true, mute: true, delete: true, warn: true } },
  COMMANDER: { level: 6, name: 'Cyber Commander', pointsRequired: 5000, color: '#ef4444', permissions: { reactions: true, highlight: true, flag: true, mute: true, delete: true, warn: true, suspend: true } },
  ADMIN: { level: 7, name: 'Admin', pointsRequired: 0, color: '#dc2626', permissions: { all: true } }
};

const ALLIANCE_RANKS = {
  MEMBER: { level: 0, name: 'Member', permissions: { messaging: true, tasks: true, flagging: false, invites: false } },
  OPERATIVE: { level: 1, name: 'Operative', permissions: { messaging: true, tasks: true, flagging: false, invites: true } },
  ELITE: { level: 2, name: 'Elite', permissions: { messaging: true, tasks: true, flagging: true, invites: true } },
  MARSHAL: { level: 3, name: 'Marshal', permissions: { messaging: true, tasks: true, flagging: true, invites: true, promote: true, demote: true, manageTasks: true, managePermissions: true } }
};

const DEFAULT_ALLIANCE_PERMISSIONS = { 
  messaging: true, 
  tasks: true, 
  flagging: false, 
  invites: false 
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hackerhub', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Continue even without MongoDB for demo purposes

const User = require('./models/User');
const Alliance = require('./models/Alliance');
const Task = require('./models/Task');
const AuditLog = require('./models/AuditLog');

// In-memory storage for demo (when MongoDB unavailable)
const inMemoryUsers = new Map();
let isDbConnected = false;
let currentUserIdCounter = 1;

// Check MongoDB connection
mongoose.connection.on('connected', () => {
  isDbConnected = true;
  console.log('MongoDB connected');
});
mongoose.connection.on('error', () => {
  isDbConnected = false;
  console.log('Running in demo mode (no MongoDB)');
});

// Demo mode helper functions
function createDemoUser(data) {
  const userId = `demo_${currentUserIdCounter++}`;
  const user = {
    _id: userId,
    email: data.email,
    password: data.password,
    codename: data.codename,
    displayName: data.codename,
    role: data.codename === 'CWHUB' ? 'ADMIN' : 'RECRUIT',
    rank: data.codename === 'CWHUB' ? 'ADMIN' : 'RECRUIT',
    points: 0,
    warnings: 0,
    isBanned: false,
    isSuspended: false,
    suspensionCount: 0,
    fakeIp: generateFakeIp(),
    realIp: '127.0.0.1',
    allianceType: null,
    allianceRank: null,
    idVerified: false,
    idCard: { created: new Date(), expiry: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000) },
    rulesAccepted: data.rulesAccepted,
    rulesAcceptedAt: new Date(),
    lastLogin: new Date(),
    createdAt: new Date()
  };
  inMemoryUsers.set(userId, user);
  inMemoryUsers.set(data.email.toLowerCase(), user);
  inMemoryUsers.set(data.codename.toUpperCase(), user);
  return user;
}

function findDemoUser(query) {
  for (const user of inMemoryUsers.values()) {
    if (query.email && user.email === query.email.toLowerCase()) return user;
    if (query.codename && user.codename === query.codename.toUpperCase()) return user;
    if (query._id && user._id === query._id) return user;
  }
  return null;
}

const otpStore = new Map();
const socketUsers = new Map();
const globalChat = [];
const allianceChat = { offence: [], defence: [] };
const bots = {
  helper: {
    codename: 'CW-HELPER',
    displayName: 'Helper Bot',
    respond: (msg) => {
      const lower = msg.toLowerCase();
      if (lower.includes('help')) return 'Use /missions to view tasks. Earn points, rank up, join alliances!';
      if (lower.includes('rank')) return 'Ranks: Recruit → Cadet → Analyst → Specialist → Guardian → Elite → Commander → Admin';
      if (lower.includes('alliance')) return 'Reach Cadet rank to join alliances: Offence Team or Defence Team.';
      if (lower.includes('rules')) return '1) No harm 2) No real names 3) No personal info 4) Follow ethics. Violations = warnings.';
      if (lower.includes('points')) return 'Complete /missions to earn points. Higher ranks unlock more powers!';
      if (lower.includes('id') || lower.includes('vault')) return 'Your ID card is in the Vault section. Valid for 5 months.';
      return null;
    }
  },
  engagement: {
    codename: 'CW-BOT',
    displayName: 'Cyber Bot',
    isOnline: true,
    messages: [
      'Hey everyone! Just finished a CTF challenge 🔥',
      'Anyone working on the SQL injection mission?',
      'Just hit Cadet rank! Thanks for the help guys 🚀',
      'New here, looking for mentor on network security',
      'Ethical hacking is the way to go 👍',
      'Just completed a pentest lab, feeling good!',
      'Who else is into reverse engineering?',
      'Remember: stay anonymous, stay safe 🔐',
      'Just learned a new payload technique!',
      'This community is awesome ✨',
      'Working on cryptography mission now',
      'Anyone from the Offence team here?',
      'Learning Python for automation scripts',
      'The firewall training is intense today',
      'Just got my first bounty! 🎯',
      'Steganography is so cool once you get it',
      'Anyone tried the OSINT challenge yet?',
      'Keeping it ethical as always 🔒',
      'Just upgraded to Specialist rank!',
      'Stay sharp, stay secure 💻'
    ],
    lastPost: 0,
    welcomeMessages: [
      'Welcome to Hacker Hub! Stay ethical 🔐',
      'New operative detected! Watch and learn 👀',
      'Fresh blood in the hub! Nice to have you 🎮',
      'Another ghost joins the network 👻',
      'Welcome operative! Follow the rules ⚡'
    ]
  },
  supervisor: {
    codename: 'CW-SUPERVISOR',
    displayName: 'Supervisor Bot',
    warnUser: async (userId, reason) => {
      const user = await User.findById(userId);
      if (!user) return null;
      
      user.warnings += 1;
      
      if (user.warnings >= 1) {
        user.isSuspended = true;
        user.suspensionCount = user.suspensionCount || 0;
        user.suspensionCount += 1;
        
        if (user.suspensionCount >= 2) {
          const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          user.isBanned = true;
          user.banReason = 'Repeated abuse - suspended for 1 month';
          user.banExpiresAt = oneMonthLater;
        } else {
          const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          user.isSuspended = true;
          user.banReason = 'Abuse warning - suspended for 1 week';
          user.banExpiresAt = oneWeekLater;
        }
      }
      
      await user.save();
      
      return {
        warned: true,
        warnings: user.warnings,
        isSuspended: user.isSuspended,
        suspensionCount: user.suspensionCount
      };
    },
    check: (content, user) => {
      const checks = {
        hasLink: /https?:\/\/[^\s]+/i.test(content) || /www\.[^\s]+/i.test(content),
        hasFile: /\.(exe|zip|rar|bat|sh|js|py|php|jsp|asp|html?|png|jpg|jpeg|gif|svg|ico)\b/i.test(content),
        hasSpamPattern: /(.)\1{5,}/i.test(content),
        isHarassment: /(fuck|shit|bitch|asshole|bastard|nigger|fag|racist|kill|die|scam|hack|steal|fraud)/i.test(content),
        hasPersonalInfo: /(password|secret|credit\s*card|ssn|social\s*security|bank|address|phone|mobile)\b/i.test(content),
        isRealName: /^[A-Z][a-z]+ [A-Z][a-z]+$/i.test(content)
      };
      
      if (checks.hasLink && !user.role.includes('ADMIN') && !user.codename.includes('CWHUB')) {
        return { flagged: true, reason: 'Links are not allowed - DELETED', action: 'delete' };
      }
      if (checks.hasFile) return { flagged: true, reason: 'Files/Images are not allowed - DELETED', action: 'delete' };
      if (checks.isHarassment) return { flagged: true, reason: 'Harassment/Abuse detected - DELETED', action: 'delete', warn: true };
      if (checks.hasPersonalInfo) return { flagged: true, reason: 'Sharing personal info is prohibited - DELETED', action: 'delete' };
      if (checks.isRealName) return { flagged: true, reason: 'Real names are not allowed - DELETED', action: 'delete' };
      if (checks.hasSpamPattern) return { flagged: true, reason: 'Spam detected - DELETED', action: 'delete' };
      
      return { flagged: false };
    }
  }
};

function calculateRank(points) {
  const ranks = Object.entries(RANKS).filter(([k]) => k !== 'ADMIN').reverse();
  for (const [key, rank] of ranks) {
    if (points >= rank.pointsRequired) return key;
  }
  return 'RECRUIT';
}

function generateId() {
  return 'CW' + Math.floor(22 + Math.random() * 56);
}

function generateFakeIp() {
  const ranges = [
    { base: '10.0.0', max: 255 },
    { base: '172.16.0', max: 31 },
    { base: '192.168.0', max: 255 },
    { base: '127.0.0', max: 1 }
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return `${range.base}.${Math.floor(Math.random() * range.max + 1)}`;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailOTP(email, otp) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'maxin12332176@gmail.com',
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.SMTP_USER || 'maxin12332176@gmail.com',
    to: email,
    subject: 'Hacker Hub - OTP Verification',
    html: `
      <div style="font-family: Arial, sans-serif; background: #0a0a0f; color: #00ff88; padding: 2rem; text-align: center;">
        <h1 style="color: #00ff88;">CYBER WOLF HUB</h1>
        <h2>Verification Code</h2>
        <p style="font-size: 2rem; color: #00d4ff; font-weight: bold; letter-spacing: 5px;">${otp}</p>
        <p>This code expires in 5 minutes.</p>
        <p style="color: #8a8a9a; font-size: 0.8rem;">If you didn't request this, ignore this email.</p>
      </div>
    `,
    text: `Your OTP is: ${otp}. Valid for 5 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error.message);
    return false;
  }
}

app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Valid email required' });
    }

    const otp = generateOtp();
    otpStore.set(email, { 
      otp, 
      expires: Date.now() + 300000, // 5 minutes
      attempts: 0
    });

    // Skip email sending in demo mode, just return OTP
    if (!isDbConnected) {
      console.log(`[DEMO] OTP for ${email}: ${otp}`);
      return res.json({ 
        message: 'OTP generated (demo mode)',
        otp: otp
      });
    }
    
    await sendEmailOTP(email, otp);
    
    res.json({ 
      message: 'OTP sent to your email',
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    // If email fails, return OTP anyway for demo
    const existingOtp = otpStore.get(req.body.email);
    if (existingOtp) {
      return res.json({ 
        message: 'OTP generated',
        otp: existingOtp.otp
      });
    }
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, codename, otp, acceptedRules } = req.body;

    if (!acceptedRules) {
      return res.status(400).json({ message: 'You must accept the community rules' });
    }

    const emailLower = email.toLowerCase();
    const otpRecord = otpStore.get(emailLower);
    
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (otpRecord.attempts >= 3) {
      otpStore.delete(emailLower);
      return res.status(400).json({ message: 'Too many OTP attempts. Request a new one.' });
    }

    if (Date.now() > otpRecord.expires) {
      otpStore.delete(emailLower);
      return res.status(400).json({ message: 'OTP expired' });
    }

    otpStore.delete(emailLower);

    // Demo mode registration
    if (!isDbConnected) {
      const existingDemo = findDemoUser({ email: emailLower });
      if (existingDemo) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      let finalCodename;
      if (codename && codename.toUpperCase() === 'CWHUB') {
        finalCodename = 'CWHUB';
      } else if (codename) {
        if (findDemoUser({ codename })) {
          return res.status(400).json({ message: 'Codename already taken' });
        }
        finalCodename = codename.toUpperCase();
      } else {
        do {
          finalCodename = generateId();
        } while (findDemoUser({ codename: finalCodename }));
      }

      const user = createDemoUser({
        email: emailLower,
        password,
        codename: finalCodename,
        rulesAccepted: acceptedRules
      });

      const token = jwt.sign(
        { userId: user._id, role: user.role, codename: user.codename },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log(`[DEMO] User registered: ${user.codename} (${user.email})`);

      return res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          _id: user._id,
          email: user.email,
          codename: user.codename,
          displayName: user.displayName,
          role: user.role,
          rank: user.rank,
          points: user.points,
          warnings: user.warnings,
          allianceType: user.allianceType,
          allianceRank: user.allianceRank,
          idCard: user.idCard
        }
      });
    }

    // MongoDB mode
    const existingUser = await User.findOne({ $or: [{ email: emailLower }, { codename: codename.toUpperCase() }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or Codename already taken' });
    }

    let finalCodename;
    if (codename && codename.toUpperCase() === 'CWHUB') {
      finalCodename = 'CWHUB';
    } else if (codename) {
      finalCodename = codename.toUpperCase();
    } else {
      do {
        finalCodename = generateId();
      } while (await User.findOne({ codename: finalCodename }));
    }

    const user = new User({
      email: emailLower,
      password,
      codename: finalCodename,
      displayName: finalCodename,
      role: finalCodename === 'CWHUB' ? 'ADMIN' : 'RECRUIT',
      rulesAccepted: acceptedRules,
      rulesAcceptedAt: new Date(),
      fakeIp: generateFakeIp(),
      realIp: req.ip || req.connection.remoteAddress
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await AuditLog.create({
      action: 'USER_REGISTERED',
      userId: user._id,
      details: { codename: user.codename, email: user.email },
      ip: req.ip || req.connection.remoteAddress
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        codename: user.codename,
        displayName: user.displayName,
        role: user.role,
        points: user.points,
        warnings: user.warnings,
        allianceType: user.allianceType,
        allianceRank: user.allianceRank,
        idCard: user.idCard
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = email.toLowerCase();

    // Demo mode login
    if (!isDbConnected) {
      const user = findDemoUser({ email: emailLower }) || findDemoUser({ codename: email.toUpperCase() });
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (user.isBanned) {
        return res.status(403).json({ message: 'Account suspended' });
      }

      user.lastLogin = new Date();

      const token = jwt.sign(
        { userId: user._id, role: user.role, codename: user.codename },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log(`[DEMO] User logged in: ${user.codename}`);

      return res.json({
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          email: user.email,
          codename: user.codename,
          displayName: user.displayName,
          role: user.role,
          rank: user.rank,
          points: user.points,
          warnings: user.warnings,
          allianceType: user.allianceType,
          allianceRank: user.allianceRank,
          idCard: user.idCard
        }
      });
    }

    // MongoDB mode
    const user = await User.findOne({ 
      $or: [{ email: emailLower }, { codename: email.toUpperCase() }] 
    });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Account suspended' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await AuditLog.create({
      action: 'USER_LOGIN',
      userId: user._id,
      ip: req.ip || req.connection.remoteAddress
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        codename: user.codename,
        displayName: user.displayName,
        role: user.role,
        points: user.points,
        warnings: user.warnings,
        allianceType: user.allianceType,
        allianceRank: user.allianceRank,
        idCard: user.idCard
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

function authenticateToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Demo mode: return decoded as-is (it has userId and role)
    if (!isDbConnected) {
      return decoded;
    }
    
    return decoded;
  } catch {
    return null;
  }
}

app.get('/api/profile', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  // Demo mode profile
  if (!isDbConnected) {
    const user = findDemoUser({ _id: decoded.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    return res.json({
      ...user,
      nextRank: RANKS[calculateRank(user.points + 1)]
    });
  }

  try {
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      ...user.toObject(),
      nextRank: RANKS[calculateRank(user.points + 1)]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/profile/display-name', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  const { displayName } = req.body;
  if (!displayName || displayName.length < 2 || displayName.length > 30) {
    return res.status(400).json({ message: 'Display name must be 2-30 characters' });
  }

  try {
    const user = await User.findById(decoded.userId);
    user.displayName = displayName;
    await user.save();

    await AuditLog.create({
      action: 'DISPLAY_NAME_CHANGED',
      userId: user._id,
      details: { displayName }
    });

    res.json({ 
      message: 'Display name updated',
      displayName: user.displayName
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/vault', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  // Demo mode vault
  if (!isDbConnected) {
    const user = findDemoUser({ _id: decoded.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    return res.json({
      codename: user.codename,
      displayName: user.displayName,
      rank: user.rank,
      points: user.points,
      idCard: user.idCard,
      allianceType: user.allianceType,
      allianceRank: user.allianceRank,
      idVerified: user.idVerified,
      idVerifiedAt: user.idVerifiedAt
    });
  }

  try {
    let targetUserId = decoded.userId;
    
    // Allow admin to view any user's vault
    if (req.query.userId && decoded.role === 'ADMIN') {
      targetUserId = req.query.userId;
    }

    const user = await User.findById(targetUserId)
      .select('codename displayName rank points idCard allianceType allianceRank idVerified idVerifiedAt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      codename: user.codename,
      displayName: user.displayName,
      rank: user.role,
      points: user.points,
      idCard: {
        id: user.codename,
        cyberName: user.displayName,
        rank: user.role,
        points: user.points,
        created: user.idCard.created,
        expiry: user.idCard.expiry,
        verified: user.idVerified,
        verifiedBy: user.idVerifiedBy,
        verifiedAt: user.idVerifiedAt
      },
      allianceType: user.allianceType,
      allianceRank: user.allianceRank,
      idVerified: user.idVerified
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/missions', async (req, res) => {
  try {
    const missions = await Task.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(missions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/missions/:id/complete', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(decoded.userId);
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!task.isActive) return res.status(400).json({ message: 'Task not active' });
    if (task.completedBy.some(id => id.equals(user._id))) {
      return res.status(400).json({ message: 'Already completed' });
    }

    task.completedBy.push(user._id);
    await task.save();

    user.points += task.points;
    user.rank = calculateRank(user.points);
    await user.save();

    await AuditLog.create({
      action: 'TASK_COMPLETED',
      userId: user._id,
      details: { taskId: task._id, points: task.points, newRank: user.rank }
    });

    res.json({ 
      message: 'Task completed!',
      points: user.points,
      rank: user.rank,
      pointsGained: task.points
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/missions', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded || decoded.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const { title, description, difficulty, category, points, hints, deadline } = req.body;
    const task = new Task({
      title,
      description,
      difficulty,
      category,
      points: Number(points),
      createdBy: decoded.userId,
      hints: hints || [],
      deadline
    });
    await task.save();

    await AuditLog.create({
      action: 'TASK_CREATED',
      userId: decoded.userId,
      details: { taskId: task._id, title, points }
    });

    io.emit('notification', {
      type: 'new_mission',
      title: 'New Mission Available',
      message: `Mission: ${title} (${points} pts)`,
      timestamp: new Date()
    });

    io.emit('systemMessage', {
      content: `[NEW MISSION] ${title} - ${points} pts - ${difficulty}`,
      timestamp: new Date()
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/missions/:id', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded || decoded.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.isActive = false;
    await task.save();

    await AuditLog.create({
      action: 'TASK_DELETED',
      userId: decoded.userId,
      details: { taskId: task._id }
    });

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/alliance/join', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(decoded.userId);
    if (user.allianceType) {
      return res.status(400).json({ message: 'Already in an alliance. Leave first.' });
    }

    if (RANKS[user.role].level < 1) {
      return res.status(400).json({ message: 'Must be Cadet rank or higher to join alliance' });
    }

    const { allianceType } = req.body;
    if (!['offence', 'defence'].includes(allianceType)) {
      return res.status(400).json({ message: 'Invalid alliance type' });
    }

    let alliance = await Alliance.findOne({ type: allianceType });
    
    if (!alliance) {
      alliance = new Alliance({
        name: `${allianceType.charAt(0).toUpperCase() + allianceType.slice(1)} Team`,
        type: allianceType,
        description: `Cyber ${allianceType} team alliance`,
        founder: user._id
      });
      await alliance.save();
    }

    alliance.members.push({
      user: user._id,
      allianceRank: 'MEMBER',
      permissions: { ...DEFAULT_ALLIANCE_PERMISSIONS }
    });
    await alliance.save();

    user.allianceType = allianceType;
    user.allianceRank = 'MEMBER';
    await user.save();

    await AuditLog.create({
      action: 'ALLIANCE_JOINED',
      userId: user._id,
      details: { allianceType, allianceId: alliance._id }
    });

    res.json({ 
      message: `Joined ${allianceType} alliance`,
      allianceType: user.allianceType,
      allianceRank: user.allianceRank,
      allianceId: alliance._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/alliance', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(decoded.userId);
    if (!user.allianceType) {
      return res.status(400).json({ message: 'Not in an alliance' });
    }

    const alliance = await Alliance.findOne({ type: user.allianceType })
      .populate('members.user', 'codename displayName role')
      .populate('founder', 'codename displayName');

    if (!alliance) return res.status(404).json({ message: 'Alliance not found' });

    const currentMember = alliance.members.find(m => m.user._id.equals(user._id));
    
    res.json({
      alliance: {
        _id: alliance._id,
        name: alliance.name,
        type: alliance.type,
        description: alliance.description,
        founder: alliance.founder,
        memberCount: alliance.members.length
      },
      member: {
        allianceRank: currentMember.allianceRank,
        permissions: currentMember.permissions
      },
      rankPermissions: alliance.rankPermissions ? Object.fromEntries(alliance.rankPermissions) : null,
      members: alliance.members.map(m => ({
        ...m.user.toObject(),
        allianceRank: m.allianceRank,
        permissions: m.permissions,
        joinedAt: m.joinedAt
      })).sort((a, b) => {
        const rankOrder = { MARSHAL: 3, ELITE: 2, OPERATIVE: 1, MEMBER: 0 };
        return rankOrder[b.allianceRank] - rankOrder[a.allianceRank];
      })
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/alliance/leave', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(decoded.userId);
    if (!user.allianceType) {
      return res.status(400).json({ message: 'Not in an alliance' });
    }

    const alliance = await Alliance.findOne({ type: user.allianceType });
    if (alliance) {
      alliance.members = alliance.members.filter(m => !m.user.equals(user._id));
      if (alliance.members.length === 0) {
        await Alliance.deleteOne({ _id: alliance._id });
      } else {
        await alliance.save();
      }
    }

    user.allianceType = null;
    user.allianceRank = null;
    await user.save();

    await AuditLog.create({
      action: 'ALLIANCE_LEFT',
      userId: user._id,
      details: { allianceType: user.allianceType }
    });

    res.json({ message: 'Left alliance' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/alliance/promote', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(decoded.userId);
    const { targetId, newRank } = req.body;

    if (!user.allianceType) return res.status(400).json({ message: 'Not in alliance' });

    const alliance = await Alliance.findOne({ type: user.allianceType });
    const requesterMember = alliance.members.find(m => m.user.equals(user._id));
    
    if (!requesterMember || !requesterMember.permissions.promote) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const targetMember = alliance.members.find(m => m.user.equals(targetId));
    if (!targetMember) return res.status(404).json({ message: 'Member not found' });

    const validRanks = ['MEMBER', 'OPERATIVE', 'ELITE', 'MARSHAL'];
    if (!validRanks.includes(newRank) || validRanks.indexOf(newRank) <= validRanks.indexOf(targetMember.allianceRank)) {
      return res.status(400).json({ message: 'Invalid rank promotion' });
    }

    targetMember.allianceRank = newRank;
    
    if (newRank === 'MARSHAL') {
      targetMember.permissions = {
        messaging: true, tasks: true, flagging: true, invites: true,
        promote: true, demote: true, manageTasks: true, managePermissions: true
      };
    } else if (newRank === 'ELITE') {
      targetMember.permissions = { messaging: true, tasks: true, flagging: true, invites: true };
    } else if (newRank === 'OPERATIVE') {
      targetMember.permissions = { messaging: true, tasks: true, flagging: false, invites: true };
    }

    await alliance.save();
    await User.findByIdAndUpdate(targetId, { allianceRank: newRank });

    await AuditLog.create({
      action: 'ALLIANCE_PROMOTED',
      userId: user._id,
      targetId,
      details: { newRank, allianceType: user.allianceType }
    });

    res.json({ message: 'Member promoted', newRank });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/alliance/demote', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(decoded.userId);
    const { targetId } = req.body;

    const alliance = await Alliance.findOne({ type: user.allianceType });
    const requesterMember = alliance.members.find(m => m.user.equals(user._id));
    
    if (!requesterMember || !requesterMember.permissions.demote) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const targetMember = alliance.members.find(m => m.user.equals(targetId));
    if (!targetMember) return res.status(404).json({ message: 'Member not found' });

    const rankOrder = { MARSHAL: 3, ELITE: 2, OPERATIVE: 1, MEMBER: 0 };
    if (rankOrder[targetMember.allianceRank] >= rankOrder[requesterMember.allianceRank]) {
      return res.status(400).json({ message: 'Cannot demote equal or higher rank' });
    }

    const newRank = 'MEMBER';
    targetMember.allianceRank = newRank;
    targetMember.permissions = { ...DEFAULT_ALLIANCE_PERMISSIONS };

    await alliance.save();
    await User.findByIdAndUpdate(targetId, { allianceRank: newRank });

    res.json({ message: 'Member demoted', newRank });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/alliance/remove', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(decoded.userId);
    const { targetId } = req.body;

    const alliance = await Alliance.findOne({ type: user.allianceType });
    
    const canRemove = alliance.founder.equals(user._id) || 
      alliance.members.find(m => m.user.equals(user._id))?.permissions.managePermissions;

    if (!canRemove) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    alliance.members = alliance.members.filter(m => !m.user.equals(targetId));
    await alliance.save();

    await User.findByIdAndUpdate(targetId, { 
      allianceType: null, 
      allianceRank: null 
    });

    await AuditLog.create({
      action: 'ALLIANCE_REMOVED',
      userId: user._id,
      targetId,
      details: { allianceType: user.allianceType }
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/alliance/rank-permissions', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(decoded.userId);
    const { rank, permissions } = req.body;

    const alliance = await Alliance.findOne({ type: user.allianceType });
    const requesterMember = alliance.members.find(m => m.user.equals(user._id));
    
    if (!requesterMember || !requesterMember.permissions.managePermissions) {
      return res.status(403).json({ message: 'Only Marshal can manage rank permissions' });
    }

    if (!alliance.rankPermissions) {
      alliance.rankPermissions = {};
    }
    
    alliance.rankPermissions[rank] = permissions;
    await alliance.save();

    res.json({ message: 'Rank permissions updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded || decoded.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });

  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded || decoded.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });

  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isBanned: false });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const cadetPlus = await User.countDocuments({ role: { $ne: 'RECRUIT' } });

    res.json({
      totalUsers,
      activeUsers,
      bannedUsers,
      cadetPlus
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/users/:id/warn', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded || !['ADMIN', 'COMMANDER', 'ELITE'].includes(decoded.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.warnings += 1;
    await user.save();

    await AuditLog.create({
      action: 'USER_WARNED',
      userId: decoded.userId,
      targetId: user._id,
      details: { warnings: user.warnings }
    });

    res.json({ message: 'Warning issued', warnings: user.warnings });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/users/:id/suspend', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded || decoded.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = !user.isBanned;
    await user.save();

    await AuditLog.create({
      action: 'USER_SUSPENDED',
      userId: decoded.userId,
      targetId: user._id,
      details: { banned: user.isBanned }
    });

    if (user.isBanned) {
      socketUsers.forEach((data, socketId) => {
        if (data.userId === user._id.toString()) {
          io.to(socketId).emit('kicked', 'You have been suspended');
          io.sockets.sockets.get(socketId)?.disconnect();
        }
      });
    }

    res.json({ message: user.isBanned ? 'User suspended' : 'User unsuspended' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/audit-logs', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded || decoded.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });

  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100).populate('userId', 'codename');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/users/:id/verify', async (req, res) => {
  const decoded = authenticateToken(req);
  if (!decoded || decoded.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.idVerified = !user.idVerified;
    user.idVerifiedBy = decoded.userId;
    user.idVerifiedAt = new Date();
    await user.save();

    await AuditLog.create({
      action: user.idVerified ? 'ID_VERIFIED' : 'ID_UNVERIFIED',
      userId: decoded.userId,
      targetId: user._id,
      details: { verified: user.idVerified }
    });

    res.json({ 
      message: user.idVerified ? 'ID verified' : 'Verification removed',
      idVerified: user.idVerified
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userData) => {
    socketUsers.set(socket.id, { ...userData, socketId: socket.id });
    io.emit('usersOnline', Array.from(socketUsers.values()).map(u => u.codename));
    
    // Send welcome message from engagement bot
    setTimeout(() => {
      const welcomeMsg = bots.engagement.welcomeMessages[Math.floor(Math.random() * bots.engagement.welcomeMessages.length)];
      io.emit('message', {
        id: uuidv4(),
        codename: bots.engagement.codename,
        displayName: bots.engagement.displayName,
        rank: 'CADET',
        content: welcomeMsg,
        timestamp: new Date(),
        isBot: true
      });
    }, 1500);
    
    io.emit('systemMessage', {
      content: `[${userData.rank}] ${userData.codename} joined the cyber hub`,
      timestamp: new Date()
    });
  });

  socket.on('chatMessage', async (messageData) => {
    const user = socketUsers.get(socket.id);
    if (!user) return;

    const moderation = bots.supervisor.check(messageData.content, user);
    if (moderation.flagged) {
      socket.emit('systemMessage', {
        content: `[MOD BLOCKED] ${moderation.reason}`,
        timestamp: new Date()
      });
      if (moderation.warn) {
        await User.findByIdAndUpdate(user.userId, { $inc: { warnings: 1 } });
      }
      return;
    }

    const message = {
      id: uuidv4(),
      codename: user.codename,
      displayName: user.displayName,
      rank: user.rank,
      allianceRank: user.allianceRank || null,
      allianceType: user.allianceType || null,
      content: messageData.content,
      timestamp: new Date()
    };

    globalChat.push(message);
    if (globalChat.length > 200) globalChat.shift();

    io.emit('message', message);

    const botResponse = bots.helper.respond(messageData.content);
    if (botResponse) {
      setTimeout(() => {
        io.emit('message', {
          id: uuidv4(),
          codename: bots.helper.codename,
          displayName: bots.helper.displayName,
          rank: 'ADMIN',
          content: botResponse,
          timestamp: new Date(),
          isBot: true
        });
      }, 800);
    }

    if (Date.now() - bots.engagement.lastPost > 45000) {
      const engageMsg = bots.engagement.messages[Math.floor(Math.random() * bots.engagement.messages.length)];
      io.emit('message', {
        id: uuidv4(),
        codename: bots.engagement.codename,
        displayName: bots.engagement.displayName,
        rank: 'CADET',
        content: engageMsg,
        timestamp: new Date(),
        isBot: true
      });
      bots.engagement.lastPost = Date.now();
    }
  });

  socket.on('allianceMessage', async (data) => {
    const user = socketUsers.get(socket.id);
    if (!user || !user.allianceType) return;

    // Verify alliance messaging permission from DB
    try {
      const alliance = await Alliance.findOne({ type: user.allianceType });
      if (!alliance) {
        socket.emit('systemMessage', { content: '[ERROR] Alliance not found', timestamp: new Date() });
        return;
      }
      const member = alliance.members.find(m => m.user._id.equals(user.userId));
      if (!member || !member.permissions.messaging) {
        socket.emit('systemMessage', { 
          content: '[ERROR] You do not have permission to send alliance messages',
          timestamp: new Date() 
        });
        return;
      }
    } catch (err) {
      socket.emit('systemMessage', { content: '[ERROR] Permission check failed', timestamp: new Date() });
      return;
    }

    const message = {
      id: uuidv4(),
      codename: user.codename,
      displayName: user.displayName,
      rank: user.rank,
      allianceRank: user.allianceRank,
      content: data.content,
      timestamp: new Date()
    };

    allianceChat[user.allianceType].push(message);
    io.to(user.allianceType).emit('allianceMessage', message);
  });

  socket.on('disconnect', () => {
    const user = socketUsers.get(socket.id);
    if (user) {
      io.emit('systemMessage', {
        content: `[${user.rank}] ${user.codename} left the hub`,
        timestamp: new Date()
      });
    }
    socketUsers.delete(socket.id);
    io.emit('usersOnline', Array.from(socketUsers.values()).map(u => u.codename));
  });
});

io.of('/alliance').on('connection', (socket) => {
  socket.on('join', (userData) => {
    if (userData.allianceType) {
      socket.join(userData.allianceType);
      socket.emit('allianceHistory', allianceChat[userData.allianceType] || []);
    }
  });
});

app.get('/api/chat/history', (req, res) => {
  // Add fake bot messages to make chat look engaged
  const fakeMessages = [];
  const botNames = ['CW35', 'CW42', 'CW67', 'CW28', 'CW51'];
  const fakeContents = [
    'Hey everyone! Just got here',
    'Anyone working on a mission?',
    'Just hit Specialist rank! 🎉',
    'This place is awesome',
    'Learning new stuff every day'
  ];
  
  // Generate some fake historical messages
  for (let i = 0; i < 5; i++) {
    fakeMessages.push({
      id: uuidv4(),
      codename: botNames[i],
      displayName: `Operative ${botNames[i]}`,
      rank: ['RECRUIT', 'CADET', 'ANALYST', 'RECRUIT', 'CADET'][i],
      content: fakeContents[i],
      timestamp: new Date(Date.now() - (5 - i) * 60000)
    });
  }
  
  res.json([...fakeMessages, ...globalChat.slice(-50)]);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Hacker Hub server running on port ${PORT}`));

// Engagement bot heartbeat - sends random messages periodically
setInterval(() => {
  const onlineCount = socketUsers.size;
  if (onlineCount > 0 && Date.now() - bots.engagement.lastPost > 60000) {
    const engageMsg = bots.engagement.messages[Math.floor(Math.random() * bots.engagement.messages.length)];
    io.emit('message', {
      id: uuidv4(),
      codename: bots.engagement.codename,
      displayName: bots.engagement.displayName,
      rank: 'CADET',
      content: engageMsg,
      timestamp: new Date(),
      isBot: true
    });
    bots.engagement.lastPost = Date.now();
  }
}, 30000);