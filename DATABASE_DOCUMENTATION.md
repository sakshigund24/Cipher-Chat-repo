# 🗄️ Database Documentation — Cipher Chat

## Collections Overview

### Users
```
{
  _id, email, fullName, password (hashed),
  profilePic, bio, customStatus, socialLinks,
  isOnline, lastSeen, publicKey, refreshToken,
  pinnedChats[], blockedUsers[], createdAt, updatedAt
}
Indexes: email (unique), fullName (text), isOnline
```

### Messages
```
{
  _id, senderId (ref:User), receiverId (ref:User),
  groupId (ref:Group), text, encryptedContent,
  isEncrypted, image, fileUrl, fileName, fileType, fileSize,
  replyTo (ref:Message), isEdited, editedAt, editHistory[],
  isDeletedForEveryone, deletedForUsers[],
  status (sent|delivered|seen), seenBy[{userId, seenAt}],
  isPinned, pinnedBy, pinnedAt, messageType,
  createdAt, updatedAt
}
Indexes: {senderId,receiverId}, groupId, createdAt(-1), text(text), isPinned
```

### Groups
```
{
  _id, name, description, avatar, createdBy (ref:User),
  admins[], members[{userId, joinedAt, role, addedBy}],
  encryptedGroupKey, isDeleted, pinnedMessages[],
  lastMessage (ref:Message), lastMessageAt,
  createdAt, updatedAt
}
Indexes: name(text), members.userId, createdBy
```

### Calls
```
{
  _id, callerId (ref:User), receiverId (ref:User),
  groupId (ref:Group), callType (video|voice),
  callMode (direct|group), status,
  startedAt, endedAt, duration,
  participants[{userId, joinedAt, leftAt}],
  createdAt, updatedAt
}
Indexes: {callerId, createdAt(-1)}, {receiverId, createdAt(-1)}
```

## Query Patterns
- **Get conversation:** `{ $or: [{senderId:A, receiverId:B}, {senderId:B, receiverId:A}] }`
- **Get group messages:** `{ groupId: id }`
- **Full-text search:** `{ $text: { $search: "query" } }`
- **Online users:** `{ isOnline: true }`
- **Unread messages:** `{ receiverId: userId, status: { $ne: "seen" } }`
