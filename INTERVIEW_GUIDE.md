# 🎓 INTERVIEW GUIDE — Cipher Chat Project

> Study this file to confidently answer every question in a viva, technical interview, or project demonstration.

---

## 📌 PROJECT OVERVIEW

**Project Name:** Cipher Chat
**Type:** Full-Stack Real-Time Chat Application
**Stack:** MongoDB, Express.js, React.js, Node.js, Socket.IO (MERN)

### Problem Statement
Traditional chat apps either lack real-time capability, have poor security, or are missing modern features like group chats, video calling, and file sharing. Cipher Chat solves all of these with a single unified platform.

### Objectives
- Build a production-ready real-time chat application
- Implement end-to-end encryption for private messaging
- Support both one-on-one and group communications
- Enable video/voice calling via WebRTC
- Provide a responsive, modern UI

### Why Each Technology Was Chosen
| Technology | Reason |
|---|---|
| MongoDB | Schema-flexible, great for evolving chat data structures |
| Express.js | Minimal, fast HTTP framework for Node.js |
| React.js | Component-based UI with hooks for reactive state |
| Node.js | Non-blocking I/O, same language as frontend |
| Socket.IO | Reliable abstraction over WebSockets with fallbacks |
| Zustand | Lightweight, simple state management (no Redux boilerplate) |
| DaisyUI + Tailwind | Rapid, consistent, themeable UI |
| Cloudinary | Managed media storage with CDN |
| SimplePeer | High-level WebRTC library |
| Web Crypto API | Native browser cryptography for E2E encryption |

---

## 🏗️ ARCHITECTURE EXPLANATION

### Frontend Architecture
```
Pages (HomePage, LoginPage, ProfilePage, SettingsPage)
  ↓
Components (Sidebar, ChatContainer, MessageBubble, MessageInput)
  ↓
Stores (Zustand: useAuthStore, useChatStore, useGroupStore, useCallStore)
  ↓
Lib (axios.js, socket.js, encryption.js)
  ↓
Backend APIs + Socket.IO Server
```

### Backend Architecture
```
Client Request
  → Express Router (auth/messages/groups/calls/search)
  → Auth Middleware (JWT verify)
  → Controller (business logic)
  → Mongoose Model (MongoDB)
  → Response

Side channel:
  Socket.IO Server → Real-time events → Connected clients
```

### MongoDB Architecture
- **Users** collection: authentication, profile, online status, public key
- **Messages** collection: text, files, reply, edit history, delete flags, read receipts
- **Groups** collection: members, admins, avatar, last message
- **Calls** collection: call history, participants, duration

---

## 🔑 FEATURE-WISE EXPLANATION

### 1. Authentication
**What:** JWT-based signup/login/logout with HTTP-only cookies.
**Why:** Stateless, scalable auth. HttpOnly cookies prevent XSS token theft.
**How it works:**
1. User submits email + password
2. Backend hashes password with bcrypt (cost 12)
3. Generates JWT signed with `JWT_SECRET`, stored in HttpOnly cookie
4. On every request, middleware verifies JWT and attaches `req.user`
**Files:** `auth.controller.js`, `auth.middleware.js`, `auth.route.js`, `useAuthStore.js`
**Interview Questions:**
- Q: Why store JWT in a cookie instead of localStorage?
  A: HttpOnly cookies are inaccessible to JavaScript, preventing XSS attacks. localStorage is vulnerable to XSS.
- Q: What is bcrypt and why use it?
  A: bcrypt is a password hashing algorithm with a configurable cost factor. It's slow by design to prevent brute-force attacks. We use cost factor 12.

---

### 2. Group Chat System
**What:** Create/edit/delete groups, add/remove members, multiple admins, group messaging.
**Why:** Group communication is essential for team collaboration.
**How it works:**
1. Creator calls POST `/groups` with name, members, optional avatar
2. Backend creates Group document, adds all members with roles
3. Socket.IO emits `addedToGroup` to each new member
4. All group members join `group_<groupId>` Socket.IO room
5. Messages sent via POST `/groups/:id/messages` and broadcast to room
**Files:** `group.model.js`, `group.controller.js`, `group.route.js`, `useGroupStore.js`, `Sidebar.jsx`, `GroupChatContainer.jsx`
**DB Collection:** Groups, Messages (with groupId)
**Socket Events:** `joinGroup`, `newGroupMessage`, `groupUpdated`, `addedToGroup`, `removedFromGroup`

---

### 3. Typing Indicator
**What:** Real-time "User is typing..." animation.
**Why:** Improves UX by showing the other person is actively composing a message.
**How it works:**
1. User types in MessageInput
2. `typing` event emitted to server with `receiverId` or `groupId`
3. Server forwards `userTyping` to recipient
4. Typing state set in store; TypingIndicator component renders bouncing dots
5. After 2 seconds of inactivity, `stopTyping` emitted
**Files:** `socket.js` (server), `MessageInput.jsx`, `useChatStore.js`
**Socket Events:** `typing`, `stopTyping`, `userTyping`, `userStopTyping`

---

### 4. Online/Offline Status
**What:** Green dot for online users, last-seen timestamp for offline.
**Why:** Users need to know if their contacts are available.
**How it works:**
1. On Socket.IO connect, userId stored in `userSocketMap`
2. DB updated: `isOnline: true`
3. `getOnlineUsers` broadcast to all clients
4. On disconnect: `isOnline: false`, `lastSeen: Date.now()`, removed from map
5. `formatDistanceToNow` (date-fns) shows "5 minutes ago"
**Files:** `socket.js`, `user.model.js`, `Sidebar.jsx`, `ChatHeader.jsx`
**DB Field:** `isOnline`, `lastSeen` on User model

---

### 5. Message Reply
**What:** WhatsApp-style reply showing quoted original message.
**Why:** Context in conversations — without reply, messages lose context.
**How it works:**
1. User right-clicks / opens context menu on a message → "Reply"
2. `setReplyTo(message)` in store; reply preview shown in MessageInput
3. On send, `replyTo: message._id` included in payload
4. Backend stores `replyTo` as ObjectId reference
5. When fetching messages, `populate("replyTo")` includes original message data
6. MessageBubble renders reply preview above message text
**Files:** `message.model.js`, `message.controller.js`, `MessageBubble.jsx`, `MessageInput.jsx`, `useChatStore.js`
**DB Field:** `replyTo` on Message model (ref: Message)

---

### 6. Message Edit
**What:** Edit sent messages; shows "(edited)" label.
**Why:** Users make typos; editing avoids resending.
**How it works:**
1. "Edit" option in message context menu (own messages only)
2. Edit input shown in ChatContainer
3. PUT `/messages/:id/edit` with new text
4. Backend saves old text to `editHistory[]`, updates `text`, sets `isEdited: true`
5. `messageEdited` socket event broadcast to conversation partner
6. MessageBubble shows "(edited)" badge
**Files:** `message.model.js`, `message.controller.js`, `ChatContainer.jsx`, `MessageBubble.jsx`
**DB Fields:** `isEdited`, `editedAt`, `editHistory[]`

---

### 7. Delete Messages
**What:** Delete for me (soft delete) or delete for everyone.
**Why:** Privacy and mistake recovery.
**How it works:**
- **Delete for me:** userId added to `deletedForUsers[]`; query filters this out
- **Delete for everyone:** `isDeletedForEveryone: true`, text/image cleared
- Socket event `messageDeleted` syncs deletion in real-time
**Files:** `message.controller.js`, `useChatStore.js`, `MessageBubble.jsx`

---

### 8. Read Receipts
**What:** ✓ Sent → ✓✓ Delivered → ✓✓ Seen (blue).
**Why:** Users want to know if their message was read.
**How it works:**
1. Message created with `status: "sent"`
2. When receiver fetches messages, status updated to "delivered"
3. When receiver opens chat, `markAsSeen()` called → PUT `/messages/seen`
4. Backend updates `status: "seen"`, adds to `seenBy[]`
5. Socket `messagesSeen` event updates sender's UI
**Files:** `message.model.js`, `message.controller.js`, `MessageBubble.jsx`
**DB Fields:** `status` (sent/delivered/seen), `seenBy[]`

---

### 9. File Sharing
**What:** Upload images, PDFs, DOCX, videos, ZIPs up to 50MB.
**Why:** Real communication involves sharing files, not just text.
**How it works:**
1. User drops file or clicks attach button (react-dropzone)
2. File preview shown before sending
3. POST `/messages/upload` with multipart/form-data
4. Multer parses file; uploaded to Cloudinary with correct resource_type
5. Cloudinary returns secure URL
6. URL stored in message; rendered based on fileType
**Files:** `message.controller.js` (uploadFile), `message.route.js` (multer), `MessageInput.jsx`, `MessageBubble.jsx`

---

### 10. End-to-End Encryption
**What:** RSA-2048 key exchange + AES-256-GCM message encryption.
**Why:** Server-side breaches won't expose message content.
**How it works:**
1. On signup, Web Crypto API generates RSA key pair
2. Public key sent to server and stored in User model
3. Private key stored in localStorage (never leaves browser)
4. To send encrypted message:
   - Generate random AES-256-GCM key
   - Encrypt message text with AES key
   - Encrypt AES key with recipient's RSA public key
   - Send `{ciphertext, iv, encryptedAESKey}` to server
5. To decrypt:
   - Fetch encrypted AES key
   - Decrypt with own RSA private key
   - Decrypt message with AES key
**Files:** `encryption.js`, `user.model.js`, `auth.controller.js` (publicKey routes)
**Interview Questions:**
- Q: Why RSA + AES instead of just RSA?
  A: RSA is asymmetric and slow — only suitable for small data. AES is fast for bulk encryption. We use RSA to securely exchange the AES key (hybrid encryption).

---

### 11. Video/Voice Calls
**What:** One-to-one WebRTC calls with camera, mic, screen sharing.
**Why:** Voice/video communication is a core feature of modern chat apps.
**How it works (WebRTC signaling flow):**
1. Caller gets local media stream (`getUserMedia`)
2. Creates SimplePeer with `initiator: true`
3. Peer generates SDP offer → emitted via Socket.IO `callUser`
4. Callee receives `incomingCall` event → IncomingCallModal shown
5. On accept, callee creates SimplePeer, generates SDP answer
6. Answer sent via `answerCall` socket event
7. Caller receives answer, signals peer → direct P2P connection established
8. Audio/video streams exchanged directly between browsers (no server relay)
**STUN:** Uses Google's public STUN servers for NAT traversal
**Files:** `CallWindow.jsx`, `IncomingCallModal.jsx`, `useCallStore.js`, `socket.js`
**Socket Events:** `callUser`, `answerCall`, `callAccepted`, `rejectCall`, `endCall`, `iceCandidate`

---

### 12. Chat Search
**What:** Search messages by text, search users by name/email, search groups by name.
**Why:** In long conversations, finding old messages manually is impractical.
**How it works:**
1. Message model has `text: "text"` index (MongoDB full-text index)
2. GET `/messages/search?q=query` uses `$text: { $search: query }`
3. Global search at `/search` queries Users, Groups, and Messages in parallel with `Promise.all`
4. Results highlighted in chat UI
**Files:** `message.model.js` (text index), `message.controller.js`, `search.controller.js`, `ChatContainer.jsx`

---

### 13. Theme Customization
**What:** 30+ DaisyUI themes, chat wallpapers, persisted in localStorage.
**Why:** Personalization improves user satisfaction and accessibility.
**How it works:**
1. `useThemeStore` stores current theme in localStorage
2. `data-theme` attribute set on root `<div>` in App.jsx
3. DaisyUI applies CSS variables for all colors automatically
4. Wallpaper stored as CSS background-image URL
**Files:** `useThemeStore.js`, `SettingsPage.jsx`, `App.jsx`

---

## ❓ 100+ INTERVIEW QUESTIONS

### BEGINNER QUESTIONS

**Q1: What is the MERN stack?**
A: MERN stands for MongoDB (database), Express.js (backend framework), React.js (frontend library), and Node.js (runtime environment). Together they allow building full-stack JavaScript applications.

**Q2: Why use MongoDB instead of MySQL?**
A: MongoDB is a NoSQL document database that stores data in flexible JSON-like BSON documents. For chat apps, message schemas can vary (text, image, file, encrypted) — MongoDB handles this without rigid migrations. It also scales horizontally more easily.

**Q3: Why React?**
A: React's virtual DOM and component-based architecture make building complex, interactive UIs efficient. Hooks enable clean state management, and the ecosystem (Zustand, React Router) covers all app needs.

**Q4: Why Socket.IO over plain WebSockets?**
A: Socket.IO adds automatic reconnection, room/namespace management, fallback to long-polling when WebSockets fail, and a cleaner event-based API. Plain WebSockets require implementing all of this manually.

**Q5: What is JWT?**
A: JSON Web Token — a compact, self-contained token encoding a payload (userId) signed with a secret. The server can verify authenticity without storing sessions, making it stateless and scalable.

**Q6: What is bcrypt?**
A: A password hashing algorithm that uses a cost factor (work factor) to make hashing intentionally slow. This prevents brute-force attacks. We use cost factor 12 in this project.

**Q7: What is Zustand?**
A: A minimal state management library for React. Unlike Redux, it requires no boilerplate — you define a store as a plain object with state and actions. Perfect for medium-complexity apps.

**Q8: What is Cloudinary?**
A: A cloud-based media management platform. We use it to store and serve uploaded files (images, videos, PDFs). It provides CDN delivery, transformations, and a REST API.

**Q9: What is DaisyUI?**
A: A component library built on Tailwind CSS that provides pre-built accessible components (buttons, modals, etc.) with theme support via CSS variables.

**Q10: What is the role of `useEffect` in React?**
A: useEffect handles side effects in functional components — fetching data, subscribing to socket events, setting up timers. It runs after render, optionally with cleanup.

---

### INTERMEDIATE QUESTIONS

**Q11: How does real-time messaging work?**
A: When a message is sent via REST API, the backend saves it to MongoDB, then emits a `newMessage` socket event to the recipient's socket room. The recipient's client receives this event and appends the message to their chat window instantly — without polling.

**Q12: How is the typing indicator implemented?**
A: MessageInput emits a `typing` socket event when the user types. A 2-second debounce timer emits `stopTyping` when they pause. The server forwards these to the conversation partner. The frontend shows a bouncing-dot animation while the typing state is active.

**Q13: How are read receipts handled?**
A: Messages have a `status` field: `sent → delivered → seen`. When the recipient opens the chat, `markAsSeen()` calls the API which bulk-updates all unread messages to "seen" and emits `messagesSeen` via socket to update the sender's UI with blue checkmarks.

**Q14: How are online users tracked?**
A: A `userSocketMap` object maps `userId → socketId`. On connect, the userId is added. On disconnect, it's removed and the DB `isOnline` flag is updated. The current list is broadcast as `getOnlineUsers` array to all clients on every connect/disconnect.

**Q15: How does file upload work?**
A: The client sends a `multipart/form-data` POST to `/messages/upload`. Multer (Node.js middleware) stores the file in memory. We convert it to base64 and upload to Cloudinary using the appropriate resource type (image/video/raw). The returned URL is stored in the message.

**Q16: How does message reply work?**
A: The selected reply message's `_id` is stored in state. When sending, `replyTo: messageId` is included in the payload. Backend stores this as an ObjectId reference. When fetching messages, `populate("replyTo")` joins the original message, and the frontend renders a preview above the bubble.

**Q17: How does message search work?**
A: MongoDB full-text index (`{ text: "text" }`) is created on the Message model. The `$text: { $search: query }` operator searches all indexed text fields. Results are scored and returned. We also filter by conversation participants and deleted status.

**Q18: How does theme persistence work?**
A: The selected theme name is saved to `localStorage` via `useThemeStore`. On app load, the stored value is read. The theme is applied by setting `data-theme="themeName"` on the root div — DaisyUI reads this attribute to apply CSS custom properties.

**Q19: What is Mongoose and how is it used?**
A: Mongoose is an ODM (Object Document Mapper) for MongoDB. It provides schema definition, validation, type casting, middleware (pre/post hooks), and query building. We define schemas for User, Message, Group, and Call.

**Q20: How is CORS handled?**
A: The `cors` middleware is configured with `origin: CLIENT_URL` and `credentials: true` (to allow cookie-based auth). This restricts cross-origin requests to only the frontend application.

---

### ADVANCED QUESTIONS

**Q21: How does WebRTC work?**
A: WebRTC (Web Real-Time Communication) enables direct peer-to-peer audio/video streaming between browsers. It uses:
- **SDP (Session Description Protocol):** Describes media capabilities (codecs, bandwidth)
- **ICE (Interactive Connectivity Establishment):** Finds the best network path
- **DTLS/SRTP:** Encrypts the media stream

**Q22: What is signaling in WebRTC?**
A: WebRTC peers need to exchange SDP offers/answers and ICE candidates to establish a connection, but WebRTC itself doesn't define how to transport this metadata. Signaling is the out-of-band channel (Socket.IO in our case) used for this exchange.

**Q23: What are STUN servers?**
A: STUN (Session Traversal Utilities for NAT) servers help peers discover their public IP and port. Most devices are behind NAT routers — STUN tells each peer what address the internet "sees" for them. We use Google's `stun:stun.l.google.com:19302`.

**Q24: What are TURN servers?**
A: TURN (Traversal Using Relays around NAT) servers relay media when direct peer connection fails (symmetric NAT, firewalls). Unlike STUN, TURN actually forwards the data. This project uses SimplePeer defaults; production apps should deploy COTURN.

**Q25: What is ICE candidate exchange?**
A: Each peer generates multiple ICE candidates — possible network paths (local IP, server-reflexive STUN address, relay TURN address). These are exchanged via Socket.IO. The WebRTC engine selects the best working pair.

**Q26: How does screen sharing work?**
A: `navigator.mediaDevices.getDisplayMedia()` captures a screen/window/tab stream. The video track from this stream replaces the webcam track in the existing peer connection using `peer.replaceTrack()`, without re-negotiating the connection.

**Q27: How is E2E encryption implemented?**
A: Hybrid encryption: RSA-2048 for key exchange, AES-256-GCM for message encryption.
1. Signup: `crypto.subtle.generateKey(RSA-OAEP)` generates key pair. Public key sent to server.
2. Send: Generate random AES key → encrypt message → encrypt AES key with recipient's RSA public key → send all three to server.
3. Receive: Decrypt AES key with own RSA private key → decrypt message.

**Q28: Why AES-GCM specifically?**
A: GCM (Galois/Counter Mode) provides both encryption and authentication (AEAD). It detects tampering — if the ciphertext is modified, decryption fails. The IV (initialization vector) ensures same plaintext produces different ciphertext each time.

**Q29: How are group messages distributed efficiently?**
A: All group members join a Socket.IO room `group_<groupId>` via the `joinGroup` event. When a message is sent, `io.to("group_groupId").emit(...)` delivers it to all members in O(1) regardless of member count — Socket.IO handles the fan-out internally.

**Q30: What indexes are used and why?**
A: 
- `{ email: 1 }` — unique lookup for login
- `{ senderId: 1, receiverId: 1 }` — conversation message queries
- `{ groupId: 1 }` — group message queries
- `{ text: "text" }` — full-text search
- `{ "members.userId": 1 }` — find groups for a user
- `{ createdAt: -1 }` — chronological message ordering
Indexes prevent full collection scans, reducing query time from O(n) to O(log n).

---

### SECURITY QUESTIONS

**Q31: Why use refresh tokens?**
A: Access tokens (JWT) have short lifespans to limit damage from theft. Refresh tokens are long-lived and used only to obtain new access tokens. If an access token is stolen, it expires quickly. The refresh token is stored HttpOnly and rotated.

**Q32: What is rate limiting and why?**
A: Rate limiting restricts how many requests a client can make in a time window. We use `express-rate-limit`: 20 requests per 15 minutes on auth endpoints (prevents brute-force), 200 per minute on general endpoints (prevents DoS).

**Q33: What is XSS and how is it prevented?**
A: XSS (Cross-Site Scripting) — attacker injects malicious JS into pages. Prevention: HttpOnly cookies (JWT inaccessible to JS), input sanitization with the `xss` library, React's built-in JSX escaping, Helmet's Content-Security-Policy headers.

**Q34: What is CSRF and how is it prevented?**
A: CSRF (Cross-Site Request Forgery) — attacker tricks user's browser into making requests to our server. Prevention: `sameSite: "strict"` on cookies (browser won't send cookies on cross-site requests), CORS restricting origin, and verifying the `Origin` header.

**Q35: What is MongoDB injection and how is it prevented?**
A: Attackers send MongoDB operators (`$gt`, `$where`) in input fields to manipulate queries. `express-mongo-sanitize` strips `$` and `.` from request bodies, preventing query injection.

**Q36: Why use Helmet.js?**
A: Helmet sets various HTTP security headers: `X-Frame-Options` (clickjacking), `X-Content-Type-Options` (MIME sniffing), `Strict-Transport-Security` (force HTTPS), `Content-Security-Policy`, and more.

---

### DATABASE QUESTIONS

**Q37: What is the difference between SQL and NoSQL?**
A: SQL databases (MySQL, PostgreSQL) use rigid schemas with tables and rows, support ACID transactions, and use JOIN for relations. NoSQL (MongoDB) uses flexible documents, scales horizontally, but has limited join support. For chat apps, document flexibility and horizontal scaling favor NoSQL.

**Q38: How are messages stored?**
A: Each message is a document in the `messages` collection with fields: `senderId`, `receiverId` (or `groupId`), `text`, `image`, `fileUrl`, `status`, `seenBy`, `replyTo`, `isEdited`, `isDeletedForEveryone`, `deletedForUsers`, etc. This flat structure enables fast queries.

**Q39: How are group members managed?**
A: Group members are stored as an embedded array in the Group document: `members: [{ userId, role, joinedAt, addedBy }]`. Admins array is separate for quick admin checks. Embedded subdocuments avoid a separate join but limit query flexibility.

**Q40: What is populate() in Mongoose?**
A: `populate()` performs a join-like operation — it replaces ObjectId references with actual documents from the referenced collection. For example, `populate("senderId", "fullName profilePic")` replaces the senderId ObjectId with the user's name and picture.

---

### SOCKET.IO QUESTIONS

**Q41: Difference between WebSocket and Socket.IO?**
A: WebSocket is a raw browser protocol for persistent bidirectional connections. Socket.IO is a library built on top, adding: automatic reconnection, room management, event namespacing, fallback to HTTP long-polling, and binary data support.

**Q42: What are Socket.IO rooms?**
A: Rooms are named channels that sockets can join. `socket.join("group_abc")` adds the socket to room "group_abc". `io.to("group_abc").emit(...)` sends an event to all sockets in that room. Used for group chat and user-specific rooms.

**Q43: How is the personal user room used?**
A: Each user joins `user_<userId>` on connect. This allows targeted delivery: `io.to("user_userId").emit(...)` delivers events to a specific user across multiple devices/tabs without knowing their socket ID.

**Q44: What is socket.broadcast vs io.emit?**
A: `io.emit` sends to ALL connected clients including sender. `socket.broadcast.emit` sends to all EXCEPT the sender. `io.to(room).emit` sends to all in a specific room.

---

### WEBRTC QUESTIONS

**Q45: What is SDP offer/answer?**
A: SDP (Session Description Protocol) describes a peer's media capabilities: supported codecs, bandwidth, encryption keys. The caller generates an "offer" SDP, the callee responds with an "answer" SDP. After exchange, both peers know how to communicate.

**Q46: What is the ICE gathering state?**
A: ICE gathering collects all possible network candidates (local, STUN-reflected, TURN relay). The state progresses: `new → gathering → complete`. During gathering, candidates are sent to the peer via signaling (Socket.IO).

**Q47: What is SimplePeer?**
A: SimplePeer is a high-level WebRTC library that abstracts the complex RTCPeerConnection API. It handles SDP negotiation and ICE internally, exposing a simple event-based API: `peer.signal(data)`, `peer.on("stream", ...)`, `peer.on("signal", ...)`.

**Q48: What happens if WebRTC direct connection fails?**
A: ICE tries STUN (server-reflexive) candidates first. If NAT is symmetric (corporate firewalls), direct connection fails and it falls back to TURN relay servers. Without TURN, some networks will fail. Production apps must deploy TURN servers.

---

## 🏆 TOP 50 VIVA QUESTIONS

1. **Q: Explain the overall architecture of your project.**
   A: Full-stack MERN app. React frontend with Zustand stores communicates with Express backend via Axios REST APIs and Socket.IO for real-time. MongoDB stores all data via Mongoose ODM. Cloudinary handles file storage.

2. **Q: How does a message reach from sender to receiver?**
   A: Sender → POST `/messages/send/:id` → saved to MongoDB → `io.to(receiverSocketId).emit("newMessage")` → receiver's Socket.IO client fires event → Zustand store appends message → React re-renders chat.

3. **Q: What is Socket.IO and why is it used instead of plain WebSockets?**
   A: Socket.IO is a WebSocket wrapper adding rooms, auto-reconnect, and fallbacks. We use it for all real-time features — typing, messages, calls, online status.

4. **Q: How are group chats implemented?**
   A: Socket.IO rooms named `group_<groupId>`. All members join the room. Messages sent to room via `io.to(room).emit()`. Backend stores messages with `groupId` field.

5. **Q: How is the typing indicator debounced?**
   A: `setTimeout` of 2000ms after last keystroke before emitting `stopTyping`. Each keystroke clears and resets the timer (`clearTimeout` + `setTimeout`).

6. **Q: How is end-to-end encryption implemented?**
   A: RSA key pair generated on signup. Public key stored on server. Messages encrypted with AES-256-GCM, AES key encrypted with recipient's RSA public key. Server only stores ciphertext.

7. **Q: Explain WebRTC connection flow.**
   A: Caller creates peer (initiator:true), gets SDP offer → sends via Socket.IO → callee creates peer, signals offer, generates answer → sends answer via Socket.IO → connection established, media streams.

8. **Q: How is file upload handled?**
   A: Multer middleware parses multipart form data into memory buffer. Buffer converted to base64 and uploaded to Cloudinary. URL stored in message document.

9. **Q: What is the difference between delete for me and delete for everyone?**
   A: "Delete for me" adds userId to `deletedForUsers[]`, query excludes these. "Delete for everyone" sets `isDeletedForEveryone: true`, clears content, visible to all as "deleted message".

10. **Q: How do read receipts work across devices?**
    A: When chat is opened, REST API marks messages as seen and emits `messagesSeen` socket event. The sender's client (any device/tab) listening for this event updates message status to "seen" (blue ticks).

11. **Q: What MongoDB indexes are used and why?**
    A: Compound index on `{senderId, receiverId}` for conversation queries. Text index on `text` for search. Index on `groupId` for group messages. These prevent collection scans.

12. **Q: How is authentication maintained across page refreshes?**
    A: JWT stored in HttpOnly cookie (persisted). On every load, `checkAuth()` calls `GET /auth/check`. If cookie valid, user is authenticated. If expired, redirected to login.

13. **Q: What is rate limiting and how is it configured?**
    A: `express-rate-limit` middleware limits 20 requests per 15 min on auth routes to prevent brute-force, 200 per minute on all routes to prevent DoS.

14. **Q: How does the reply feature store data?**
    A: `replyTo` field in Message model references another Message document (`ObjectId ref: "Message"`). When fetching, `populate("replyTo")` joins the original message.

15. **Q: How are online users tracked in real-time?**
    A: `userSocketMap = { userId: socketId }` maintained in socket.js. On connect/disconnect, map updated and `getOnlineUsers` array emitted to all clients.

16. **Q: How does Cloudinary integration work?**
    A: Cloudinary SDK configured with API credentials. Files uploaded via `cloudinary.uploader.upload(base64Data, { folder, resource_type })`. Returns secure CDN URL stored in DB.

17. **Q: What is Zustand and how does it manage state?**
    A: Zustand creates stores with `create((set, get) => ({...}))`. State updated with `set()`. Components subscribe with `useStore(state => state.field)`. Lightweight alternative to Redux.

18. **Q: How does screen sharing work in video calls?**
    A: `getDisplayMedia()` captures screen stream. `peer.replaceTrack(oldTrack, newTrack, stream)` swaps the video track in existing WebRTC connection without renegotiation.

19. **Q: How is input sanitization done?**
    A: `express-mongo-sanitize` strips MongoDB operators from request bodies. React's JSX auto-escapes HTML. Helmet adds Content-Security-Policy headers.

20. **Q: Explain the group admin system.**
    A: Group has `admins[]` array of userIds and `members[].role` field. Creator automatically added as admin. Admins can add/remove members, promote others, update group info. Multiple admins supported.

21. **Q: What happens when a call is rejected?**
    A: Callee emits `rejectCall` socket event → server forwards `callRejected` to caller → `useCallStore.endCall()` cleans up streams and peer connection → toast notification shown.

22. **Q: How is the message edit history maintained?**
    A: Before updating `text`, the old value is pushed to `editHistory: [{ text, editedAt }]` array. This preserves audit trail of all edits. `isEdited: true` flag shown as "(edited)" in UI.

23. **Q: How are pinned messages retrieved?**
    A: `GET /messages/:userId/pinned` queries messages with `isPinned: true` filtered by conversation participants. Frontend shows pinned bar with preview and count.

24. **Q: How does the theme system work technically?**
    A: DaisyUI reads `data-theme` attribute on root element and applies CSS custom properties (--primary, --base-100, etc.) from theme definitions. React sets this attribute dynamically.

25. **Q: What is SimplePeer and why is it used?**
    A: SimplePeer abstracts RTCPeerConnection, handling SDP negotiation and ICE internally. We use it instead of raw WebRTC API to reduce boilerplate while maintaining full feature access.

---

## 🐛 DEBUGGING & TROUBLESHOOTING

### Common Issues and Solutions

**Issue: Socket.IO not connecting**
- Check CORS `origin` matches frontend URL exactly (including port)
- Ensure `credentials: true` on both client and server
- Check firewall/proxy blocking WebSocket upgrades

**Issue: Messages not real-time**
- Verify `subscribeToMessages()` called in `useEffect` with cleanup
- Check `getReceiverSocketId(receiverId)` returning valid socket ID
- Log socket events server-side to verify emission

**Issue: File upload failing**
- Check Cloudinary credentials in `.env`
- Verify file size < 50MB limit
- Check multer `fileFilter` allowing the MIME type

**Issue: Video call not connecting**
- Check browser permissions (camera/mic)
- Try adding TURN server config to SimplePeer
- Verify both peers exchange ICE candidates correctly

**Issue: MongoDB connection error**
- Check MONGODB_URI format: `mongodb://localhost:27017/dbname`
- Ensure MongoDB service is running
- For Atlas: whitelist IP 0.0.0.0/0

### Performance Optimizations
- Database indexes on frequently queried fields
- `Promise.all()` for parallel queries in search
- Socket.IO rooms avoid broadcasting to irrelevant clients
- Zustand selective subscriptions prevent unnecessary re-renders
- Cloudinary CDN for fast media delivery
- Message pagination (can be added: `.skip(page * 50).limit(50)`)

---

## 🔮 FUTURE ENHANCEMENTS

1. **Message reactions** — emoji reactions to messages
2. **Voice messages** — record and send audio clips
3. **Message forwarding** — forward messages to other chats
4. **Contact requests** — friend request system
5. **Disappearing messages** — messages auto-delete after set time
6. **AI Assistant** — Gemini API integration for smart replies
7. **Push notifications** — Web Push API for offline notifications
8. **Message pagination** — lazy-load older messages
9. **Group video calls** — multi-party WebRTC using SFU (mediasoup/Janus)
10. **Two-factor authentication** — TOTP 2FA with authenticator apps
11. **Message translation** — auto-translate messages
12. **Presence in group** — who is currently viewing the group
13. **Message scheduling** — schedule messages to send later
14. **TURN server** — deploy COTURN for reliable WebRTC in all networks
