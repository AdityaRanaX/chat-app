import express from "express";

import { getMessages } from "../controllers/messageController.js";
import protect from "../middleware/authMiddleware.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";

const router = express.Router();

router.get("/:senderId/:receiverId", protect, cacheMiddleware((req) => `messages_${req.params.senderId}_${req.params.receiverId}`, 30), getMessages);

export default router;