import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// ─── helpers ───────────────────────────────────────────────
const messagePreview = (msg) => {
  if (!msg) return "";
  if (msg.isDeletedForEveryone) return "🚫 Deleted message";
  if (msg.fileType === "video" || msg.messageType === "video") return "🎥 Video";
  if (msg.fileType === "image" || msg.image || msg.messageType === "image") return "📷 Photo";
  if (msg.fileUrl || msg.fileName) return `📄 ${msg.fileName || "Document"}`;
  return msg.text || "";
};

// ─── CONVERSATIONS (WhatsApp-style sidebar) ────────────────
export const getConversations = async (req, res) => {
  try {
    const myId = req.user._id;

    // Single aggregation: find all users I have exchanged messages with,
    // their last message, and unread count
    const conversations = await Message.aggregate([
      // 1. Only direct messages involving me
      {
        $match: {
          isDeletedForEveryone: false,
          $or: [{ senderId: myId }, { receiverId: myId }],
        },
      },
      // 2. Determine the "peer" userId for each message
      {
        $addFields: {
          peer: {
            $cond: [{ $eq: ["$senderId", myId] }, "$receiverId", "$senderId"],
          },
        },
      },
      // 3. Sort newest first so $last gives the latest message
      { $sort: { createdAt: -1 } },
      // 4. Group per peer
      {
        $group: {
          _id: "$peer",
          lastMessageId: { $first: "$_id" },
          lastText:      { $first: "$text" },
          lastFileType:  { $first: "$fileType" },
          lastImage:     { $first: "$image" },
          lastFileName:  { $first: "$fileName" },
          lastMsgType:   { $first: "$messageType" },
          lastDeleted:   { $first: "$isDeletedForEveryone" },
          lastSenderId:  { $first: "$senderId" },
          lastStatus:    { $first: "$status" },
          lastCreatedAt: { $first: "$createdAt" },
          // Count messages from peer that I haven't seen
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", myId] },
                    { $ne: ["$status", "seen"] },
                    { $not: { $in: [myId, { $ifNull: ["$deletedForUsers", []] }] } },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      // 5. Sort conversations by latest message
      { $sort: { lastCreatedAt: -1 } },
      // 6. Lookup peer user info
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      // 7. Project only what we need
      {
        $project: {
          _id: 0,
          user: {
            _id: "$user._id",
            fullName: "$user.fullName",
            profilePic: "$user.profilePic",
            isOnline: "$user.isOnline",
            lastSeen: "$user.lastSeen",
            customStatus: "$user.customStatus",
          },
          lastMessage: {
            _id: "$lastMessageId",
            text: "$lastText",
            fileType: "$lastFileType",
            image: "$lastImage",
            fileName: "$lastFileName",
            messageType: "$lastMsgType",
            isDeletedForEveryone: "$lastDeleted",
            senderId: "$lastSenderId",
            status: "$lastStatus",
            createdAt: "$lastCreatedAt",
          },
          unreadCount: 1,
        },
      },
    ]);

    res.json(conversations);
  } catch (error) {
    console.error("getConversations error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── GET USERS (kept for group creation picker) ────────────
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password -refreshToken")
      .sort({ isOnline: -1, lastSeen: -1 });
    res.json(users);
  } catch (error) {
    console.error("getUsersForSidebar error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── GET MESSAGES ──────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
      isDeletedForEveryone: false,
      deletedForUsers: { $ne: myId },
    })
      .populate("replyTo", "text image fileUrl fileName senderId messageType")
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 });

    // Mark as delivered
    await Message.updateMany(
      { senderId: otherUserId, receiverId: myId, status: "sent" },
      { status: "delivered" }
    );

    // Notify sender their messages are delivered
    const senderSocketId = getReceiverSocketId(otherUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesDeliveredUpdate", { toUserId: myId });
    }

    res.json(messages);
  } catch (error) {
    console.error("getMessages error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── SEND MESSAGE ──────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const {
      text, image, fileUrl, fileName, fileType, fileSize,
      replyTo, isEncrypted, encryptedContent, messageType,
    } = req.body;

    let finalImageUrl = "";
    if (image && image.startsWith("data:")) {
      const uploaded = await cloudinary.uploader.upload(image, { folder: "chat_images" });
      finalImageUrl = uploaded.secure_url;
    } else if (image) {
      finalImageUrl = image;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || "",
      image: finalImageUrl,
      fileUrl: fileUrl || "",
      fileName: fileName || "",
      fileType: fileType || "",
      fileSize: fileSize || 0,
      replyTo: replyTo || null,
      isEncrypted: isEncrypted || false,
      encryptedContent: encryptedContent || "",
      messageType: messageType || (finalImageUrl ? "image" : fileUrl ? "file" : "text"),
      status: "sent",
    });

    await newMessage.save();
    const populated = await newMessage.populate([
      { path: "replyTo", select: "text image fileUrl fileName senderId messageType" },
      { path: "senderId", select: "fullName profilePic" },
    ]);

    // Build sidebar update payload for both sides
    const senderInfo = await User.findById(senderId).select("fullName profilePic isOnline lastSeen");
    const receiverInfo = await User.findById(receiverId).select("fullName profilePic isOnline lastSeen");

    const preview = messagePreview({
      text, image: finalImageUrl, fileUrl, fileName, fileType, messageType,
    });

    const sidebarPayload = {
      message: populated,
      preview,
      createdAt: newMessage.createdAt,
    };

    // Emit to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populated);
      // Push sidebar update to receiver
      io.to(receiverSocketId).emit("conversationUpdated", {
        ...sidebarPayload,
        peer: senderInfo,          // receiver sees the sender as the peer
        unreadIncrement: true,
      });
      // Auto-deliver
      await Message.findByIdAndUpdate(newMessage._id, { status: "delivered" });
      populated.status = "delivered";
    }

    // Push sidebar update to sender
    const senderSocketId = getReceiverSocketId(senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("conversationUpdated", {
        ...sidebarPayload,
        peer: receiverInfo,        // sender sees the receiver as the peer
        unreadIncrement: false,
        status: populated.status,
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error("sendMessage error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── UPLOAD FILE ───────────────────────────────────────────
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const file = req.file;
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const resourceType = isVideo ? "video" : isImage ? "image" : "raw";
    const uploaded = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
      { folder: "chat_files", resource_type: resourceType, use_filename: true }
    );
    res.json({
      url: uploaded.secure_url,
      fileName: file.originalname,
      fileType: isImage ? "image" : isVideo ? "video" : file.mimetype.split("/")[1],
      fileSize: file.size,
    });
  } catch (error) {
    console.error("uploadFile error:", error.message);
    res.status(500).json({ message: "File upload failed" });
  }
};

// ─── EDIT MESSAGE ──────────────────────────────────────────
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.senderId.toString() !== userId.toString())
      return res.status(403).json({ message: "You can only edit your own messages" });
    if (message.isDeletedForEveryone)
      return res.status(400).json({ message: "Cannot edit deleted message" });

    message.editHistory.push({ text: message.text, editedAt: new Date() });
    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await message.populate([
      { path: "replyTo", select: "text image senderId messageType" },
      { path: "senderId", select: "fullName profilePic" },
    ]);

    if (message.receiverId) {
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      if (receiverSocketId) io.to(receiverSocketId).emit("messageEdited", populated);
    }
    if (message.groupId) {
      io.to(`group_${message.groupId}`).emit("messageEdited", populated);
    }
    res.json(populated);
  } catch (error) {
    console.error("editMessage error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── DELETE MESSAGE ────────────────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteType } = req.body;
    const userId = req.user._id;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (deleteType === "foreveryone") {
      if (message.senderId.toString() !== userId.toString())
        return res.status(403).json({ message: "You can only delete your own messages" });
      message.isDeletedForEveryone = true;
      message.text = "";
      message.image = "";
      message.fileUrl = "";
      await message.save();
      if (message.receiverId) {
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        if (receiverSocketId)
          io.to(receiverSocketId).emit("messageDeleted", { messageId: id, deleteType: "foreveryone" });
      }
      if (message.groupId) {
        io.to(`group_${message.groupId}`).emit("messageDeleted", { messageId: id, deleteType: "foreveryone" });
      }
    } else {
      if (!message.deletedForUsers.includes(userId)) {
        message.deletedForUsers.push(userId);
        await message.save();
      }
    }
    res.json({ message: "Message deleted", messageId: id, deleteType });
  } catch (error) {
    console.error("deleteMessage error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── MARK AS SEEN ──────────────────────────────────────────
export const markAsSeen = async (req, res) => {
  try {
    const { senderId } = req.body;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId, receiverId: myId, status: { $ne: "seen" } },
      {
        status: "seen",
        $addToSet: { seenBy: { userId: myId, seenAt: new Date() } },
      }
    );

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", {
        seenBy: myId,
        senderId,
        receiverId: myId,
      });
      // Also update sender's sidebar
      io.to(senderSocketId).emit("conversationSeenUpdate", {
        peerId: myId.toString(),
      });
    }
    res.json({ message: "Marked as seen" });
  } catch (error) {
    console.error("markAsSeen error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── PIN MESSAGE ───────────────────────────────────────────
export const pinMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const message = await Message.findByIdAndUpdate(
      id,
      { isPinned: pin, pinnedBy: pin ? req.user._id : null, pinnedAt: pin ? new Date() : null },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.receiverId) {
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      if (receiverSocketId) io.to(receiverSocketId).emit("messagePinned", { message, pin });
    }
    if (message.groupId) {
      io.to(`group_${message.groupId}`).emit("messagePinned", { message, pin });
    }
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── SEARCH MESSAGES ───────────────────────────────────────
export const searchMessages = async (req, res) => {
  try {
    const { q, userId } = req.query;
    const myId = req.user._id;
    if (!q || q.trim().length < 2)
      return res.status(400).json({ message: "Search query too short" });

    const filter = {
      $text: { $search: q },
      isDeletedForEveryone: false,
      deletedForUsers: { $ne: myId },
    };
    if (userId) {
      filter.$or = [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ];
    } else {
      filter.$or = [{ senderId: myId }, { receiverId: myId }];
    }

    const messages = await Message.find(filter)
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── GET PINNED MESSAGES ───────────────────────────────────
export const getPinnedMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;
    const messages = await Message.find({
      isPinned: true,
      isDeletedForEveryone: false,
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
    }).populate("senderId", "fullName profilePic");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
