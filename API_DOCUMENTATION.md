# 📡 API Documentation — Cipher Chat

Base URL: `http://localhost:5001/api`

All protected routes require a valid JWT cookie (`jwt`).

---

## 🔐 Authentication APIs

### POST `/auth/signup`
Register a new user.
**Body:** `{ fullName, email, password }`
**Response:** User object (sets JWT cookie)

### POST `/auth/login`
Login with credentials.
**Body:** `{ email, password }`
**Response:** User object (sets JWT cookie)

### POST `/auth/logout`
Logout current user.
**Response:** `{ message: "Logged out successfully" }`

### GET `/auth/check`
Check if authenticated.
**Response:** Current user object

### PUT `/auth/update-profile`
Update profile info.
**Body:** `{ fullName?, bio?, customStatus?, socialLinks?, profilePic? (base64) }`
**Response:** Updated user object

### PUT `/auth/public-key`
Upload RSA public key for E2E encryption.
**Body:** `{ publicKey }` (base64 encoded)
**Response:** `{ message: "Public key updated" }`

### GET `/auth/public-key/:userId`
Get another user's public key.
**Response:** `{ publicKey, userId, fullName }`

---

## 💬 Message APIs

### GET `/messages/users`
Get all users for sidebar.
**Response:** Array of users (sorted online first)

### GET `/messages/:userId`
Get conversation messages with a user.
**Response:** Array of messages (also marks as delivered)

### POST `/messages/send/:userId`
Send a message.
**Body:** `{ text?, image?, fileUrl?, fileName?, fileType?, fileSize?, replyTo?, isEncrypted?, encryptedContent?, messageType? }`
**Response:** Created message object

### POST `/messages/upload`
Upload a file to Cloudinary.
**Body:** `multipart/form-data` with `file` field
**Response:** `{ url, fileName, fileType, fileSize }`

### PUT `/messages/:id/edit`
Edit a message (own messages only).
**Body:** `{ text }`
**Response:** Updated message object

### PUT `/messages/:id/delete`
Delete a message.
**Body:** `{ deleteType: "forme" | "foreveryone" }`
**Response:** `{ message, messageId, deleteType }`

### PUT `/messages/:id/pin`
Pin/unpin a message.
**Body:** `{ pin: true | false }`
**Response:** Updated message object

### POST `/messages/seen`
Mark messages from a user as seen.
**Body:** `{ senderId }`
**Response:** `{ message: "Marked as seen" }`

### GET `/messages/search?q=query&userId=id`
Search messages.
**Response:** Array of matching messages

### GET `/messages/:userId/pinned`
Get pinned messages in a conversation.
**Response:** Array of pinned messages

---

## 👥 Group APIs

### GET `/groups`
Get all groups the user belongs to.
**Response:** Array of group objects

### POST `/groups`
Create a new group.
**Body:** `{ name, description?, memberIds?, avatar? (base64) }`
**Response:** Created group object

### GET `/groups/:id`
Get group by ID (must be member).
**Response:** Group object with populated members

### PUT `/groups/:id`
Update group info (admins only).
**Body:** `{ name?, description?, avatar? }`
**Response:** Updated group object

### DELETE `/groups/:id`
Delete group (creator only).
**Response:** `{ message: "Group deleted" }`

### POST `/groups/:id/members`
Add members to group (admins only).
**Body:** `{ memberIds: ["userId1", "userId2"] }`
**Response:** Updated group object

### DELETE `/groups/:id/members/:memberId`
Remove a member (admins only).
**Response:** Updated group object

### PUT `/groups/:id/members/:memberId/admin`
Promote member to admin.
**Response:** Updated group object

### POST `/groups/:id/leave`
Leave a group.
**Response:** `{ message: "Left group successfully" }`

### GET `/groups/:id/messages`
Get all messages in a group.
**Response:** Array of messages

### POST `/groups/:id/messages`
Send a message to a group.
**Body:** `{ text?, image?, fileUrl?, fileName?, fileType?, fileSize?, replyTo? }`
**Response:** Created message object

### POST `/groups/:id/seen`
Mark all group messages as seen.
**Response:** `{ message: "Marked as seen" }`

### GET `/groups/search?q=query`
Search groups by name.
**Response:** Array of matching groups

---

## 🔍 Search API

### GET `/search?q=query`
Global search across users, groups, and messages.
**Response:** `{ users: [], groups: [], messages: [] }`

---

## 📞 Call APIs

### POST `/calls`
Initiate a call record.
**Body:** `{ receiverId?, groupId?, callType: "video"|"voice", callMode?: "direct"|"group" }`
**Response:** Call object

### PUT `/calls/:id`
Update call status.
**Body:** `{ status, startedAt?, endedAt?, duration? }`
**Response:** Updated call object

### GET `/calls/history`
Get call history for current user.
**Response:** Array of call objects

---

## ❌ Common Error Responses

```json
{ "message": "Unauthorized - No token provided" }   // 401
{ "message": "User not found" }                      // 404
{ "message": "Internal server error" }               // 500
{ "message": "Too many requests, please try again later." } // 429
```
