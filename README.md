# Hacker Hub - Anonymous Ethical Hacking Community

A full-stack anonymous platform for cybersecurity students to learn ethical hacking from experienced hackers.

## Features

- 🔐 **Anonymous Chat** - Users identified by IDs (CWxx format)
- 🛡️ **VPN Protection** - Fake IP addresses for user safety  
- 🤖 **AI Supervisor** - 24/7 monitoring for abuse detection
- 🎖️ **Rank System** - Recruit → Cadet → Analyst → Specialist → Guardian → Elite → Commander → Admin
- 📛 **ID Cards** - Indian Voter ID style digital identity cards
- ⚔️ **Alliance System** - Offence Team (Red) & Defence Team (Blue)
- 👑 **Marshal System** - Alliance leaders can manage permissions

## Deployment to GitHub Pages

### Option 1: Using Built Files (Frontend Only)

The `client/build` folder contains the production build. Deploy it to GitHub Pages:

1. Go to your GitHub repository
2. Navigate to Settings → Pages
3. Source: Deploy from a branch
4. Branch: main, folder: / (or use /docs)
5. Upload the contents of `client/build` to your repo

### Option 2: Full Stack (Requires Backend Hosting)

This project requires both frontend and backend:

**Frontend** (React on port 3000)
```bash
cd client
npm install
npm run build
```

**Backend** (Node.js/Express on port 5000)
```bash
npm install
node server/index.js
```

Note: Backend requires MongoDB for full functionality. Without MongoDB, it runs in demo mode.

## Tech Stack

- **Frontend**: React, Socket.io, QRCode
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (optional - demo mode available)
- **Security**: Helmet, Rate Limiting, JWT Auth


## License

MIT
