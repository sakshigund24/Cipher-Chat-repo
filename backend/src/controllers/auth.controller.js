import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { generateToken, sanitizeUser } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";

// ─── Gmail-only validator ──────────────────────────────────
const isValidGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim());

// ─── Password strength validator ───────────────────────────
const isStrongPassword = (password) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    if (!isValidGmail(email))
      return res.status(400).json({ message: "Only Gmail addresses are accepted (@gmail.com)" });

    if (!isStrongPassword(password))
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character",
      });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ fullName, email: email.toLowerCase(), password: hashedPassword });
    await user.save();

    generateToken(user._id, res);
    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    await User.findByIdAndUpdate(user._id, { isOnline: true });
    generateToken(user._id, res);
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: new Date() });
    }
    res.cookie("jwt", "", { maxAge: 0 });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, customStatus, socialLinks, fullName } = req.body;
    const userId = req.user._id;
    const updates = {};

    if (fullName) updates.fullName = fullName;
    if (bio !== undefined) updates.bio = bio;
    if (customStatus !== undefined) updates.customStatus = customStatus;
    if (socialLinks) updates.socialLinks = socialLinks;

    if (profilePic) {
      if (profilePic.startsWith("data:")) {
        const uploaded = await cloudinary.uploader.upload(profilePic, { folder: "profile_pics" });
        updates.profilePic = uploaded.secure_url;
      } else {
        updates.profilePic = profilePic;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select(
      "-password -refreshToken"
    );

    // ── Broadcast profile update to all connected clients so other users
    //    see the new avatar/name in real-time without refreshing ─────────
    const { io } = await import("../lib/socket.js");
    io.emit("userProfileUpdated", {
      userId: updatedUser._id,
      fullName: updatedUser.fullName,
      profilePic: updatedUser.profilePic,
      customStatus: updatedUser.customStatus,
      bio: updatedUser.bio,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ message: "Public key is required" });
    await User.findByIdAndUpdate(req.user._id, { publicKey });
    res.json({ message: "Public key updated" });
  } catch (error) {
    console.error("Update public key error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPublicKey = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("publicKey fullName");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ publicKey: user.publicKey, userId: user._id, fullName: user.fullName });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
