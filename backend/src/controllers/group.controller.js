import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";

// ─── CREATE GROUP ──────────────────────────────────────────
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds, avatar } = req.body;
    const creatorId = req.user._id;

    if (!name || name.trim().length < 2)
      return res.status(400).json({ message: "Group name must be at least 2 characters" });

    let avatarUrl = "";
    if (avatar && avatar.startsWith("data:")) {
      const uploaded = await cloudinary.uploader.upload(avatar, { folder: "group_avatars" });
      avatarUrl = uploaded.secure_url;
    }

    const allMemberIds = [...new Set([creatorId.toString(), ...(memberIds || [])])];
    const members = allMemberIds.map((id) => ({
      userId: id,
      role: id === creatorId.toString() ? "admin" : "member",
      addedBy: creatorId,
    }));

    const group = new Group({
      name: name.trim(),
      description: description || "",
      avatar: avatarUrl,
      createdBy: creatorId,
      admins: [creatorId],
      members,
    });

    await group.save();
    const populated = await Group.findById(group._id).populate("members.userId", "fullName profilePic email isOnline");

    // Notify all members
    members.forEach(({ userId }) => {
      io.to(`user_${userId}`).emit("addedToGroup", populated);
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error("createGroup error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── GET MY GROUPS ─────────────────────────────────────────
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({
      "members.userId": userId,
      isDeleted: false,
    })
      .populate("members.userId", "fullName profilePic email isOnline")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── GET GROUP BY ID ───────────────────────────────────────
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, isDeleted: false }).populate(
      "members.userId",
      "fullName profilePic email isOnline lastSeen"
    );
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.some((m) => m.userId._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: "You are not a member of this group" });

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── UPDATE GROUP ──────────────────────────────────────────
export const updateGroup = async (req, res) => {
  try {
    const { name, description, avatar } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some((id) => id.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ message: "Only admins can update the group" });

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description;
    if (avatar && avatar.startsWith("data:")) {
      const uploaded = await cloudinary.uploader.upload(avatar, { folder: "group_avatars" });
      group.avatar = uploaded.secure_url;
    }

    await group.save();
    const populated = await Group.findById(group._id).populate("members.userId", "fullName profilePic email isOnline");

    io.to(`group_${group._id}`).emit("groupUpdated", populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── ADD MEMBERS ───────────────────────────────────────────
export const addMembers = async (req, res) => {
  try {
    const { memberIds } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some((id) => id.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ message: "Only admins can add members" });

    const existingIds = group.members.map((m) => m.userId.toString());
    const newMembers = memberIds.filter((id) => !existingIds.includes(id));

    newMembers.forEach((id) => {
      group.members.push({ userId: id, role: "member", addedBy: req.user._id });
    });

    await group.save();
    const populated = await Group.findById(group._id).populate("members.userId", "fullName profilePic email isOnline");

    io.to(`group_${group._id}`).emit("groupMembersUpdated", populated);
    newMembers.forEach((id) => {
      io.to(`user_${id}`).emit("addedToGroup", populated);
    });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── REMOVE MEMBER ─────────────────────────────────────────
export const removeMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some((id) => id.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ message: "Only admins can remove members" });

    group.members = group.members.filter((m) => m.userId.toString() !== memberId);
    group.admins = group.admins.filter((id) => id.toString() !== memberId);
    await group.save();

    const populated = await Group.findById(group._id).populate("members.userId", "fullName profilePic email isOnline");

    io.to(`group_${group._id}`).emit("groupMembersUpdated", populated);
    io.to(`user_${memberId}`).emit("removedFromGroup", { groupId: group._id, groupName: group.name });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── LEAVE GROUP ───────────────────────────────────────────
export const leaveGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.members = group.members.filter((m) => m.userId.toString() !== userId.toString());
    group.admins = group.admins.filter((id) => id.toString() !== userId.toString());

    // If no admins left, assign first member as admin
    if (group.admins.length === 0 && group.members.length > 0) {
      group.admins.push(group.members[0].userId);
      group.members[0].role = "admin";
    }

    await group.save();
    io.to(`group_${group._id}`).emit("memberLeftGroup", { groupId: group._id, userId });
    res.json({ message: "Left group successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── DELETE GROUP ──────────────────────────────────────────
export const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the group creator can delete the group" });

    group.isDeleted = true;
    await group.save();

    io.to(`group_${group._id}`).emit("groupDeleted", { groupId: group._id, groupName: group.name });
    res.json({ message: "Group deleted" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── PROMOTE TO ADMIN ──────────────────────────────────────
export const makeAdmin = async (req, res) => {
  try {
    const { memberId } = req.params;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some((id) => id.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ message: "Only admins can promote members" });

    if (!group.admins.includes(memberId)) {
      group.admins.push(memberId);
      const member = group.members.find((m) => m.userId.toString() === memberId);
      if (member) member.role = "admin";
      await group.save();
    }

    const populated = await Group.findById(group._id).populate("members.userId", "fullName profilePic email isOnline");
    io.to(`group_${group._id}`).emit("groupMembersUpdated", populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── GET GROUP MESSAGES ────────────────────────────────────
export const getGroupMessages = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.some((m) => m.userId.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ message: "Not a group member" });

    const messages = await Message.find({
      groupId,
      isDeletedForEveryone: false,
      deletedForUsers: { $ne: userId },
    })
      .populate("senderId", "fullName profilePic")
      .populate("replyTo", "text image fileUrl fileName senderId messageType")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── SEND GROUP MESSAGE ────────────────────────────────────
export const sendGroupMessage = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const senderId = req.user._id;
    const { text, image, fileUrl, fileName, fileType, fileSize, replyTo, isEncrypted, encryptedContent, messageType } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.some((m) => m.userId.toString() === senderId.toString());
    if (!isMember) return res.status(403).json({ message: "Not a group member" });

    let finalImageUrl = "";
    if (image && image.startsWith("data:")) {
      const uploaded = await cloudinary.uploader.upload(image, { folder: "chat_images" });
      finalImageUrl = uploaded.secure_url;
    } else if (image) {
      finalImageUrl = image;
    }

    const newMessage = new Message({
      senderId,
      groupId,
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
    });

    await newMessage.save();

    // Update group last message
    group.lastMessage = newMessage._id;
    group.lastMessageAt = new Date();
    await group.save();

    const populated = await newMessage.populate([
      { path: "senderId", select: "fullName profilePic" },
      { path: "replyTo", select: "text image fileUrl fileName senderId messageType" },
    ]);

    // Emit to everyone in the group room
    io.to(`group_${groupId}`).emit("newGroupMessage", populated);

    res.status(201).json(populated);
  } catch (error) {
    console.error("sendGroupMessage error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── SEARCH GROUPS ─────────────────────────────────────────
export const searchGroups = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const groups = await Group.find({
      name: { $regex: q, $options: "i" },
      isDeleted: false,
    })
      .select("name avatar members description")
      .limit(20);

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── MARK GROUP MESSAGES SEEN ──────────────────────────────
export const markGroupMessagesSeen = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      {
        groupId,
        "seenBy.userId": { $ne: userId },
        senderId: { $ne: userId },
      },
      { $addToSet: { seenBy: { userId, seenAt: new Date() } } }
    );

    io.to(`group_${groupId}`).emit("groupMessagesSeen", { groupId, seenBy: userId });
    res.json({ message: "Marked as seen" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
