import express from "express";
import multer from "multer";
import {
  getConversations,
  getUsersForSidebar,
  getMessages,
  sendMessage,
  uploadFile,
  editMessage,
  deleteMessage,
  markAsSeen,
  pinMessage,
  searchMessages,
  getPinnedMessages,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/", "video/", "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument",
      "application/vnd.ms-powerpoint", "application/zip",
      "application/x-zip-compressed", "text/plain",
    ];
    const isAllowed = allowed.some((t) => file.mimetype.startsWith(t) || file.mimetype.includes(t));
    cb(null, isAllowed);
  },
});

// New conversation-summary endpoint
router.get("/conversations", protectRoute, getConversations);
// Legacy user list (used by group creation)
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, searchMessages);
router.get("/:id", protectRoute, getMessages);
router.get("/:userId/pinned", protectRoute, getPinnedMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.post("/upload", protectRoute, upload.single("file"), uploadFile);
router.put("/:id/edit", protectRoute, editMessage);
router.put("/:id/delete", protectRoute, deleteMessage);
router.put("/:id/pin", protectRoute, pinMessage);
router.post("/seen", protectRoute, markAsSeen);

export default router;
