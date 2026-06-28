import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    callType: { type: String, enum: ["video", "voice"], required: true },
    callMode: { type: String, enum: ["direct", "group"], default: "direct" },
    status: {
      type: String,
      enum: ["ringing", "ongoing", "ended", "missed", "declined"],
      default: "ringing",
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 }, // seconds
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: Date,
        leftAt: Date,
      },
    ],
  },
  { timestamps: true }
);

callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ receiverId: 1, createdAt: -1 });

const Call = mongoose.model("Call", callSchema);
export default Call;
