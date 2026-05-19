import express from "express";

import { getUsers } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import { updateUserProfile } from "../controllers/authController.js";

const router = express.Router();

router.get("/", protect, getUsers);
router.put("/profile", protect, updateUserProfile);

export default router;