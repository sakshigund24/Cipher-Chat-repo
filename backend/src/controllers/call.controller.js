import Call from "../models/call.model.js";

export const initiateCall = async (req, res) => {
  try {
    const { receiverId, groupId, callType, callMode } = req.body;
    const callerId = req.user._id;

    const call = new Call({
      callerId,
      receiverId: receiverId || null,
      groupId: groupId || null,
      callType,
      callMode: callMode || "direct",
      status: "ringing",
    });

    await call.save();
    res.status(201).json(call);
  } catch (error) {
    console.error("initiateCall error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, startedAt, endedAt, duration } = req.body;

    const call = await Call.findByIdAndUpdate(
      id,
      { status, startedAt, endedAt, duration },
      { new: true }
    );

    if (!call) return res.status(404).json({ message: "Call not found" });
    res.json(call);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const calls = await Call.find({
      $or: [{ callerId: userId }, { receiverId: userId }, { "participants.userId": userId }],
    })
      .populate("callerId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic")
      .populate("groupId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(calls);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
