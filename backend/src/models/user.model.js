import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    profilepic: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 200 },
    customStatus: { type: String, default: "", maxlength: 100 },
    socialLinks: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
    },
    // Online/Offline status
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    // Public key for E2E encryption
    publicKey: { type: String, default: "" },
    // Refresh token
    refreshToken: { type: String, default: "" },
    // Pinned chats
    pinnedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Blocked users
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ fullName: "text" });
userSchema.index({ isOnline: 1 });

const User = mongoose.model("User", userSchema);
export default User;
