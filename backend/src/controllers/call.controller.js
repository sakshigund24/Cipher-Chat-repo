import Call from "../models/call.model.js";

// ── Create call record ─────────────────────────────────────
export const initiateCall = async (req, res) => {
  try {
    const { receiverId, groupId, callType, callMode, status, startedAt, endedAt, duration } = req.body;
    const callerId = req.user._id;

    const call = new Call({
      callerId,
      receiverId: receiverId || null,
      groupId: groupId || null,
      callType,
      callMode: callMode || "direct",
      status: status || "ringing",
      startedAt: startedAt || undefined,
      endedAt: endedAt || undefined,
      duration: duration || 0,
    });

    await call.save();

    const populated = await Call.findById(call._id)
      .populate("callerId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    res.status(201).json(populated);
  } catch (error) {
    console.error("initiateCall error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── Update call status / duration ─────────────────────────
export const updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, startedAt, endedAt, duration } = req.body;

    const updates = { status };
    if (startedAt) updates.startedAt = startedAt;
    if (endedAt)   updates.endedAt   = endedAt;
    if (duration !== undefined) updates.duration = duration;

    const call = await Call.findByIdAndUpdate(id, updates, { new: true })
      .populate("callerId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    if (!call) return res.status(404).json({ message: "Call not found" });
    res.json(call);
  } catch (error) {
    console.error("updateCallStatus error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── Get call history for current user ─────────────────────
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const calls = await Call.find({
      $or: [
        { callerId: userId },
        { receiverId: userId },
        { "participants.userId": userId },
      ],
    })
      .populate("callerId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic")
      .populate("groupId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(calls);
  } catch (error) {
    console.error("getCallHistory error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
