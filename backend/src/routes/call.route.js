import express from "express";
import { initiateCall, updateCallStatus, getCallHistory } from "../controllers/call.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/", protectRoute, initiateCall);
router.put("/:id", protectRoute, updateCallStatus);
router.get("/history", protectRoute, getCallHistory);
export default router;
