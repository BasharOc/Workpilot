import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  getProfile,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/profile", requireAuth, getProfile);

export default router;
