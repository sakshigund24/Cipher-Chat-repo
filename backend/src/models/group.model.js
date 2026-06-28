import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 500 },
    avatar: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    // Public key for group E2E encryption
    encryptedGroupKey: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

groupSchema.index({ name: "text" });
groupSchema.index({ "members.userId": 1 });
groupSchema.index({ createdBy: 1 });

const Group = mongoose.model("Group", groupSchema);
export default Group;
