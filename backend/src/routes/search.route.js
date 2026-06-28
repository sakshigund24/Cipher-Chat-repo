import express from "express";
import { globalSearch } from "../controllers/search.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/", protectRoute, globalSearch);
export default router;
