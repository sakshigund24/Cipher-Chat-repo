import express from "express";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
  deleteGroup,
  makeAdmin,
  getGroupMessages,
  sendGroupMessage,
  searchGroups,
  markGroupMessagesSeen,
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getMyGroups);
router.get("/search", protectRoute, searchGroups);
router.post("/", protectRoute, createGroup);
router.get("/:id", protectRoute, getGroupById);
router.put("/:id", protectRoute, updateGroup);
router.delete("/:id", protectRoute, deleteGroup);
router.post("/:id/members", protectRoute, addMembers);
router.delete("/:id/members/:memberId", protectRoute, removeMember);
router.put("/:id/members/:memberId/admin", protectRoute, makeAdmin);
router.post("/:id/leave", protectRoute, leaveGroup);
router.get("/:id/messages", protectRoute, getGroupMessages);
router.post("/:id/messages", protectRoute, sendGroupMessage);
router.post("/:id/seen", protectRoute, markGroupMessagesSeen);

export default router;
