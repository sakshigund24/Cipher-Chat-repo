# 🔒 Cipher Chat — Full-Stack MERN Real-Time Chat Application

> A production-ready, feature-rich chat application inspired by WhatsApp and Discord, built with MongoDB, Express, React, Node.js, and Socket.IO.

---

## 📋 Project Overview

Cipher Chat is a full-stack real-time messaging platform with end-to-end encryption, group chats, video/voice calling, file sharing, and much more. It is built for performance, security, and a great user experience across desktop and mobile.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 Authentication | JWT + refresh tokens, bcrypt password hashing |
| 💬 Real-Time Messaging | Socket.IO powered instant messaging |
| 👥 Group Chat | Create, manage, and chat in groups |
| ✍️ Typing Indicators | Live "User is typing…" for DMs and groups |
| 🟢 Online/Offline Status | Real-time presence with last-seen timestamp |
| ↩️ Message Reply | WhatsApp-style threaded replies |
| ✏️ Message Edit | Edit sent messages with history |
| 🗑️ Delete Messages | Delete for me / delete for everyone |
| ✅ Read Receipts | Sent → Delivered → Seen indicators |
| 📎 File Sharing | Images, PDFs, DOCX, PPT, ZIP, Videos (Cloudinary) |
| 🎥 Video & Voice Calls | WebRTC peer-to-peer calls with screen sharing |
| 🔍 Search | Search users, groups, and messages |
| 🎨 Theme Customization | 30+ DaisyUI themes + chat wallpapers |
| 🔒 E2E Encryption | RSA key exchange + AES-GCM message encryption |
| 📌 Pin Messages | Pin important messages in any conversation |
| 🧑 User Profiles | Avatar, bio, custom status, social links |
| 🛡️ Security | Rate limiting, XSS protection, input sanitization, CSRF protection |

---

## 🏗️ Architecture

### Frontend Architecture
```
React (Vite) → Zustand Stores → Axios (REST) + Socket.IO Client
                                      ↓
                            Component Layer (Pages → Components)
```

### Backend Architecture
```
Express.js → Routes → Controllers → Models (Mongoose) → MongoDB
                ↕
           Socket.IO Server (Real-time events)
```

### WebRTC Architecture
```
Caller → Socket.IO Signaling → Callee
          ↓ SDP Offer/Answer
        SimplePeer (WebRTC)
          ↓ ICE Candidates
        Direct P2P Connection
```

### Encryption Architecture
```
Signup: Generate RSA Key Pair (2048-bit)
        Public Key → Server DB
        Private Key → localStorage

Send Message:
  Generate AES-256-GCM key
  Encrypt message with AES
  Encrypt AES key with recipient's RSA public key
  Send {ciphertext, iv, encryptedAESKey}

Receive Message:
  Decrypt AES key with own RSA private key
  Decrypt message with AES key
```

---

## 📁 Folder Structure

```
secure-chat-upgraded/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── message.controller.js
│   │   │   ├── group.controller.js
│   │   │   ├── call.controller.js
│   │   │   └── search.controller.js
│   │   ├── lib/
│   │   │   ├── db.js
│   │   │   ├── cloudinary.js
│   │   │   ├── socket.js
│   │   │   └── utils.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   ├── message.model.js
│   │   │   ├── group.model.js
│   │   │   └── call.model.js
│   │   ├── routes/
│   │   │   ├── auth.route.js
│   │   │   ├── message.route.js
│   │   │   ├── group.route.js
│   │   │   ├── search.route.js
│   │   │   └── call.route.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── calls/
    │   │   │   ├── CallWindow.jsx
    │   │   │   └── IncomingCallModal.jsx
    │   │   ├── modals/
    │   │   │   ├── CreateGroupModal.jsx
    │   │   │   └── GroupInfoModal.jsx
    │   │   ├── skeletons/
    │   │   │   ├── LoadingSpinner.jsx
    │   │   │   ├── MessageSkeleton.jsx
    │   │   │   └── SidebarSkeleton.jsx
    │   │   ├── ChatContainer.jsx
    │   │   ├── ChatHeader.jsx
    │   │   ├── GroupChatContainer.jsx
    │   │   ├── GroupHeader.jsx
    │   │   ├── MessageBubble.jsx
    │   │   ├── MessageInput.jsx
    │   │   ├── Navbar.jsx
    │   │   └── Sidebar.jsx
    │   ├── lib/
    │   │   ├── axios.js
    │   │   ├── encryption.js
    │   │   └── socket.js
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── SignUpPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   └── SettingsPage.jsx
    │   ├── store/
    │   │   ├── useAuthStore.js
    │   │   ├── useChatStore.js
    │   │   ├── useGroupStore.js
    │   │   ├── useThemeStore.js
    │   │   └── useCallStore.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── .env.example
    └── package.json
```

---

## 🚀 Installation Guide

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- MongoDB >= 6.x (local or Atlas)
- Cloudinary account (free tier works)

### 1. Clone Repository
```bash
git clone https://github.com/yourname/secure-chat.git
cd secure-chat
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env — set VITE_API_URL and VITE_SOCKET_URL to your backend URL
npm run dev
```

---

## ⚙️ Environment Variables

### Backend `.env`
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/secure-chat
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
```

---

## 🏭 Production Build

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the dist/ folder with Nginx or any static host
```

---

## ☁️ Deployment

### Backend → Render / Railway
1. Push code to GitHub
2. Create new Web Service on Render
3. Set build command: `npm install`
4. Set start command: `node src/index.js`
5. Add all environment variables

### Frontend → Vercel / Netlify
1. Connect GitHub repo
2. Set root directory to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_API_URL` env variable pointing to deployed backend

### Database → MongoDB Atlas
1. Create free cluster at mongodb.com/atlas
2. Create database user
3. Whitelist IPs (0.0.0.0/0 for cloud deployment)
4. Copy connection string to `MONGODB_URI`

---

## 🔧 Cloudinary Setup
1. Create account at cloudinary.com
2. Go to Dashboard → copy Cloud Name, API Key, API Secret
3. Add to backend `.env`

---

## 🛡️ Security Features
- JWT authentication with HttpOnly cookies
- bcrypt password hashing (cost factor 12)
- Rate limiting on auth endpoints (20 req / 15 min)
- General rate limiting (200 req / min)
- MongoDB query sanitization (prevent NoSQL injection)
- Helmet.js security headers
- CORS configured for specific origin
- E2E encryption using RSA-2048 + AES-256-GCM

---

## 🤝 Contributing
Pull requests are welcome. Please open an issue first to discuss major changes.

## 📄 License
MIT
