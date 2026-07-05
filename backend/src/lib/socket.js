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

const userSocketMap  = {};  // userId  -> socketId
const socketUserMap  = {};  // socketId -> userId
// const activeCallRooms = {}; // roomId  -> { participants, callType }

export function getReceiverSocketId(userId) {
  return userSocketMap[userId?.toString()];
}

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;
  if (!userId || userId === "undefined") return;

  userSocketMap[userId] = socket.id;
  socketUserMap[socket.id] = userId;
  socket.join(`user_${userId}`);

  try {
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
  } catch {}

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ─── TYPING ──────────────────────────────────────────
  socket.on("typing", ({ receiverId, groupId }) => {
    if (receiverId) {
      const sid = getReceiverSocketId(receiverId);
      if (sid) io.to(sid).emit("userTyping", { senderId: userId });
    }
    if (groupId) {
      socket.to(`group_${groupId}`).emit("userTyping", { senderId: userId, groupId });
    }
  });

  socket.on("stopTyping", ({ receiverId, groupId }) => {
    if (receiverId) {
      const sid = getReceiverSocketId(receiverId);
      if (sid) io.to(sid).emit("userStopTyping", { senderId: userId });
    }
    if (groupId) {
      socket.to(`group_${groupId}`).emit("userStopTyping", { senderId: userId, groupId });
    }
  });

  // ─── GROUPS ───────────────────────────────────────────
  socket.on("joinGroup",  (groupId) => socket.join(`group_${groupId}`));
  socket.on("leaveGroup", (groupId) => socket.leave(`group_${groupId}`));

  // ─── READ RECEIPTS ────────────────────────────────────
  socket.on("messageSeen", ({ messageId, senderId, groupId }) => {
    if (senderId) {
      const sid = getReceiverSocketId(senderId);
      if (sid) io.to(sid).emit("messageSeenUpdate", { messageId, seenBy: userId });
    }
    if (groupId) {
      socket.to(`group_${groupId}`).emit("messageSeenUpdate", { messageId, seenBy: userId });
    }
  });

  socket.on("messagesDelivered", ({ senderId }) => {
    const sid = getReceiverSocketId(senderId);
    if (sid) io.to(sid).emit("messagesDeliveredUpdate", { toUserId: userId });
  });

  // // ─── WEBRTC SIGNALING ─────────────────────────────────
  // //
  // // FLOW (trickle=false — one clean offer/answer round):
  // //
  // //  Caller                          Server                        Callee
  // //  ──────                          ──────                        ──────
  // //  callUser(receiverId, signalData) ──► incomingCall(signalData)
  // //                                                    acceptCall()
  // //  callAccepted(signalData)  ◄──   answerCall(callerId, signalData)
  // //  peer.signal(answer SDP)
  // //  P2P established ◄─────────────────────────────────────────── stream

  // socket.on("callUser", ({ receiverId, callType, signalData, callerInfo, roomId }) => {
  //   const sid = getReceiverSocketId(receiverId);
  //   if (sid) {
  //     io.to(sid).emit("incomingCall", {
  //       callerId: userId,
  //       callType,
  //       signalData,   // SDP offer — callee must signal this to their peer
  //       callerInfo,
  //       roomId,
  //     });
  //   }
  // });

  // socket.on("answerCall", ({ callerId, signalData, roomId }) => {
  //   const sid = getReceiverSocketId(callerId);
  //   if (sid) {
  //     io.to(sid).emit("callAccepted", { signalData, answererId: userId, roomId });
  //   }
  // });

  // socket.on("rejectCall", ({ callerId, roomId }) => {
  //   const sid = getReceiverSocketId(callerId);
  //   if (sid) io.to(sid).emit("callRejected", { rejecterId: userId, roomId });
  // });

  // socket.on("endCall", ({ peerId, roomId }) => {
  //   if (peerId) {
  //     const sid = getReceiverSocketId(peerId);
  //     if (sid) io.to(sid).emit("callEnded", { endedBy: userId, roomId });
  //   }
  //   if (roomId && activeCallRooms[roomId]) {
  //     socket.to(`call_${roomId}`).emit("callEnded", { endedBy: userId, roomId });
  //     socket.leave(`call_${roomId}`);
  //   }
  // });

  // // Trickle ICE candidates (used when trickle=true)
  // socket.on("iceCandidate", ({ peerId, candidate }) => {
  //   const sid = getReceiverSocketId(peerId);
  //   if (sid) io.to(sid).emit("iceCandidate", { candidate, fromId: userId });
  // });

  // // Group call rooms
  // socket.on("joinCallRoom", ({ roomId, callType }) => {
  //   socket.join(`call_${roomId}`);
  //   if (!activeCallRooms[roomId]) activeCallRooms[roomId] = { participants: [], callType };
  //   if (!activeCallRooms[roomId].participants.includes(userId)) {
  //     activeCallRooms[roomId].participants.push(userId);
  //   }
  //   socket.to(`call_${roomId}`).emit("userJoinedCall", { userId, roomId });
  //   socket.emit("callRoomParticipants", { participants: activeCallRooms[roomId].participants, roomId });
  // });

  // socket.on("leaveCallRoom", ({ roomId }) => {
  //   socket.leave(`call_${roomId}`);
  //   if (activeCallRooms[roomId]) {
  //     activeCallRooms[roomId].participants = activeCallRooms[roomId].participants.filter(
  //       (id) => id !== userId
  //     );
  //     socket.to(`call_${roomId}`).emit("userLeftCall", { userId, roomId });
  //     if (activeCallRooms[roomId].participants.length === 0) {
  //       delete activeCallRooms[roomId];
  //     }
  //   }
  // });

  // ─── PROFILE UPDATE BROADCAST ─────────────────────────
  socket.on("broadcastProfileUpdate", (data) => {
    socket.broadcast.emit("userProfileUpdated", data);
  });

  // ─── DISCONNECT ───────────────────────────────────────
  socket.on("disconnect", async () => {
    delete userSocketMap[userId];
    delete socketUserMap[socket.id];
    try {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    } catch {}
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    io.emit("userOffline", { userId, lastSeen: new Date() });
  });
});

export { io, app, server };
