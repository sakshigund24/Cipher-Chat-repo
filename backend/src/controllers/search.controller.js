import User from "../models/user.model.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";

export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    const myId = req.user._id;

    if (!q || q.trim().length < 2)
      return res.status(400).json({ message: "Query must be at least 2 characters" });

    const [users, groups, messages] = await Promise.all([
      User.find({
        _id: { $ne: myId },
        $or: [
          { fullName: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      })
        .select("fullName email profilePic isOnline lastSeen")
        .limit(10),

      Group.find({
        name: { $regex: q, $options: "i" },
        "members.userId": myId,
        isDeleted: false,
      })
        .select("name avatar members description")
        .limit(10),

      Message.find({
        $text: { $search: q },
        isDeletedForEveryone: false,
        deletedForUsers: { $ne: myId },
        $or: [{ senderId: myId }, { receiverId: myId }],
      })
        .populate("senderId", "fullName profilePic")
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    res.json({ users, groups, messages });
  } catch (error) {
    console.error("globalSearch error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
