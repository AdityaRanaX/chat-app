import express from "express";
import protect from "../middleware/.authMiddlewarejs";

import {
  registerUser,
  loginUser,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

export default router;