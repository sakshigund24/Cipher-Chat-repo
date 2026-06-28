# 🔌 Socket.IO Event Documentation — Cipher Chat

Connection URL: `http://localhost:5001`
Query param: `?userId=<userId>`

---

## Connection Events

### `connection`
Fired when a client connects. Server joins user to personal room `user_<userId>`, marks user online.

### `disconnect`
Fired on disconnect. Marks user offline, updates `lastSeen`.

---

## 📡 Emitted BY SERVER

### `getOnlineUsers`
Broadcast to all clients when any user connects/disconnects.
```json
["userId1", "userId2", "userId3"]
```

### `userOffline`
Emitted when a user disconnects.
```json
{ "userId": "abc123", "lastSeen": "2024-01-01T12:00:00Z" }
```

### `newMessage`
Emitted to receiver when a DM is sent.
```json
{
  "_id": "msgId",
  "senderId": { "_id": "...", "fullName": "Alice", "profilePic": "..." },
  "receiverId": "...",
  "text": "Hello!",
  "image": "",
  "fileUrl": "",
  "status": "delivered",
  "createdAt": "..."
}
```

### `newGroupMessage`
Emitted to all members of a group room.
```json
{
  "_id": "msgId",
  "senderId": { "_id": "...", "fullName": "Alice" },
  "groupId": "groupId",
  "text": "Hello group!"
}
```

### `messageEdited`
Emitted to conversation partner or group when a message is edited.
```json
{ "_id": "msgId", "text": "Updated text", "isEdited": true, "editedAt": "..." }
```

### `messageDeleted`
Emitted when a message is deleted.
```json
{ "messageId": "msgId", "deleteType": "foreveryone" }
```

### `messagePinned`
Emitted when a message is pinned/unpinned.
```json
{ "message": { "_id": "...", "isPinned": true }, "pin": true }
```

### `messagesSeen`
Emitted to sender when receiver marks messages as seen.
```json
{ "seenBy": "userId", "senderId": "...", "receiverId": "..." }
```

### `groupMessagesSeen`
Emitted to group room when messages are seen.
```json
{ "groupId": "...", "seenBy": "userId" }
```

### `userTyping`
Emitted to recipient or group room.
```json
{ "senderId": "userId", "groupId": "..." }
```

### `userStopTyping`
Emitted when typing stops.
```json
{ "senderId": "userId", "groupId": "..." }
```

### `groupUpdated`
Emitted to group room when group info changes.
```json
{ "_id": "groupId", "name": "New Name", "avatar": "...", ... }
```

### `groupMembersUpdated`
Emitted to group room when members are added/removed.
```json
{ "_id": "groupId", "members": [...] }
```

### `groupDeleted`
Emitted to all members when group is deleted.
```json
{ "groupId": "...", "groupName": "My Group" }
```

### `addedToGroup`
Emitted to a user when they are added to a group.
```json
{ "_id": "groupId", "name": "My Group", "members": [...] }
```

### `removedFromGroup`
Emitted to removed user.
```json
{ "groupId": "...", "groupName": "My Group" }
```

### `incomingCall`
Emitted to call receiver.
```json
{
  "callerId": "userId",
  "callType": "video",
  "signalData": {},
  "callerInfo": { "fullName": "Alice", "profilePic": "..." },
  "roomId": "uuid"
}
```

### `callAccepted`
Emitted to caller when call is accepted.
```json
{ "signalData": {}, "answererId": "userId", "roomId": "uuid" }
```

### `callRejected`
Emitted to caller when call is rejected.
```json
{ "rejecterId": "userId", "roomId": "uuid" }
```

### `callEnded`
Emitted when call is ended.
```json
{ "endedBy": "userId", "roomId": "uuid" }
```

### `iceCandidate`
Emitted for WebRTC ICE candidate exchange.
```json
{ "candidate": {}, "fromId": "userId" }
```

### `userJoinedCall`
Emitted to call room when user joins.
```json
{ "userId": "...", "roomId": "uuid" }
```

### `userLeftCall`
Emitted to call room when user leaves.
```json
{ "userId": "...", "roomId": "uuid" }
```

### `callRoomParticipants`
Sent to newly joined user with current participants.
```json
{ "participants": ["userId1", "userId2"], "roomId": "uuid" }
```

---

## 📤 Emitted BY CLIENT

### `joinGroup`
Join a group room to receive messages.
```json
"groupId"
```

### `leaveGroup`
Leave a group room.
```json
"groupId"
```

### `typing`
Signal typing activity.
```json
{ "receiverId": "userId" }         // DM
{ "groupId": "groupId" }           // Group
```

### `stopTyping`
Signal typing stopped.
```json
{ "receiverId": "userId" }
{ "groupId": "groupId" }
```

### `messageSeen`
Mark a specific message as seen.
```json
{ "messageId": "...", "senderId": "...", "groupId": "..." }
```

### `messagesDelivered`
Notify sender that messages are delivered.
```json
{ "senderId": "userId" }
```

### `callUser`
Initiate a call.
```json
{
  "receiverId": "userId",
  "callType": "video",
  "signalData": {},
  "callerInfo": { "fullName": "...", "profilePic": "..." },
  "roomId": "uuid"
}
```

### `answerCall`
Answer an incoming call.
```json
{ "callerId": "userId", "signalData": {}, "roomId": "uuid" }
```

### `rejectCall`
Reject an incoming call.
```json
{ "callerId": "userId", "roomId": "uuid" }
```

### `endCall`
End an active call.
```json
{ "peerId": "userId", "roomId": "uuid" }
```

### `iceCandidate`
Send ICE candidate to peer.
```json
{ "peerId": "userId", "candidate": {}, "roomId": "uuid" }
```

### `joinCallRoom`
Join a group call room.
```json
{ "roomId": "uuid", "callType": "video", "userId": "..." }
```

### `leaveCallRoom`
Leave a group call room.
```json
{ "roomId": "uuid" }
```

### `screenShareSignal`
Send screen share WebRTC signal.
```json
{ "peerId": "userId", "signal": {} }
```
