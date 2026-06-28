import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null for group messages
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // null for direct messages

    text: { type: String, default: "" },
    // Encrypted content
    encryptedContent: { type: String, default: "" },
    isEncrypted: { type: Boolean, default: false },

    // File/Media
    image: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "" }, // image, pdf, docx, ppt, zip, video
    fileSize: { type: Number, default: 0 },

    // Reply feature
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },

    // Edit feature
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    editHistory: [
      {
        text: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],

    // Delete feature
    isDeletedForEveryone: { type: Boolean, default: false },
    deletedForUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Read receipts
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    seenBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        seenAt: { type: Date, default: Date.now },
      },
    ],

    // Pin message
    isPinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    pinnedAt: { type: Date },

    // Message type
    messageType: {
      type: String,
      enum: ["text", "image", "file", "video", "audio", "system"],
      default: "text",
    },
  },
  { timestamps: true }
);

// Indexes for performance
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ groupId: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ text: "text" });
messageSchema.index({ isPinned: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
