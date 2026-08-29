import express from "express";

import { getUsers } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import { updateUserProfile } from "../controllers/authController.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";

const router = express.Router();

router.get("/", protect, cacheMiddleware("user_directory", 30), getUsers);
router.put("/profile", protect, updateUserProfile);

export default router;