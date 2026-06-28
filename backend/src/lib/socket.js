import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Maps
const userSocketMap = {}; // userId -> socketId
const socketUserMap = {}; // socketId -> userId
const activeCallRooms = {}; // roomId -> { participants, callType }

export function getReceiverSocketId(userId) {
  return userSocketMap[userId.toString()];
}

export function getUserIdFromSocket(socketId) {
  return socketUserMap[socketId];
}

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;
  if (!userId || userId === "undefined") return;

  userSocketMap[userId] = socket.id;
  socketUserMap[socket.id] = userId;

  // Join personal room
  socket.join(`user_${userId}`);

  // Update online status in DB
  try {
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
  } catch (e) {}

  // Broadcast online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ─── TYPING INDICATORS ───────────────────────────────
  socket.on("typing", ({ receiverId, groupId }) => {
    if (receiverId) {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", { senderId: userId });
      }
    }
    if (groupId) {
      socket.to(`group_${groupId}`).emit("userTyping", { senderId: userId, groupId });
    }
  });

  socket.on("stopTyping", ({ receiverId, groupId }) => {
    if (receiverId) {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userStopTyping", { senderId: userId });
      }
    }
    if (groupId) {
      socket.to(`group_${groupId}`).emit("userStopTyping", { senderId: userId, groupId });
    }
  });

  // ─── GROUP ROOMS ──────────────────────────────────────
  socket.on("joinGroup", (groupId) => {
    socket.join(`group_${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group_${groupId}`);
  });

  // ─── MESSAGE READ RECEIPTS ────────────────────────────
  socket.on("messageSeen", ({ messageId, senderId, groupId }) => {
    if (senderId) {
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageSeenUpdate", { messageId, seenBy: userId });
      }
    }
    if (groupId) {
      socket.to(`group_${groupId}`).emit("messageSeenUpdate", { messageId, seenBy: userId });
    }
  });

  socket.on("messagesDelivered", ({ senderId }) => {
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesDeliveredUpdate", { toUserId: userId });
    }
  });

  // ─── WEBRTC VIDEO/VOICE CALL SIGNALING ───────────────
  socket.on("callUser", ({ receiverId, callType, signalData, callerInfo, roomId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", {
        callerId: userId,
        callType,
        signalData,
        callerInfo,
        roomId,
      });
    }
  });

  socket.on("answerCall", ({ callerId, signalData, roomId }) => {
    const callerSocketId = getReceiverSocketId(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", { signalData, answererId: userId, roomId });
    }
  });

  socket.on("rejectCall", ({ callerId, roomId }) => {
    const callerSocketId = getReceiverSocketId(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected", { rejecterId: userId, roomId });
    }
  });

  socket.on("endCall", ({ peerId, roomId }) => {
    const peerSocketId = getReceiverSocketId(peerId);
    if (peerSocketId) {
      io.to(peerSocketId).emit("callEnded", { endedBy: userId, roomId });
    }
    // Group call
    if (roomId && activeCallRooms[roomId]) {
      socket.to(`call_${roomId}`).emit("callEnded", { endedBy: userId, roomId });
      socket.leave(`call_${roomId}`);
    }
  });

  socket.on("iceCandidate", ({ peerId, candidate, roomId }) => {
    const peerSocketId = getReceiverSocketId(peerId);
    if (peerSocketId) {
      io.to(peerSocketId).emit("iceCandidate", { candidate, fromId: userId });
    }
  });

  // Group call
  socket.on("joinCallRoom", ({ roomId, callType, userId: uid }) => {
    socket.join(`call_${roomId}`);
    if (!activeCallRooms[roomId]) {
      activeCallRooms[roomId] = { participants: [], callType };
    }
    activeCallRooms[roomId].participants.push(uid || userId);
    socket.to(`call_${roomId}`).emit("userJoinedCall", { userId: uid || userId, roomId });
    // Send current participants to newly joined user
    socket.emit("callRoomParticipants", {
      participants: activeCallRooms[roomId].participants,
      roomId,
    });
  });

  socket.on("leaveCallRoom", ({ roomId }) => {
    socket.leave(`call_${roomId}`);
    if (activeCallRooms[roomId]) {
      activeCallRooms[roomId].participants = activeCallRooms[roomId].participants.filter(
        (id) => id !== userId
      );
      socket.to(`call_${roomId}`).emit("userLeftCall", { userId, roomId });
      if (activeCallRooms[roomId].participants.length === 0) {
        delete activeCallRooms[roomId];
      }
    }
  });

  // Screen sharing signal
  socket.on("screenShareSignal", ({ peerId, signal }) => {
    const peerSocketId = getReceiverSocketId(peerId);
    if (peerSocketId) {
      io.to(peerSocketId).emit("screenShareSignal", { signal, fromId: userId });
    }
  });

  // ─── DISCONNECT ───────────────────────────────────────
  socket.on("disconnect", async () => {
    delete userSocketMap[userId];
    delete socketUserMap[socket.id];

    try {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    } catch (e) {}

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    io.emit("userOffline", { userId, lastSeen: new Date() });
  });
});

export { io, app, server };
