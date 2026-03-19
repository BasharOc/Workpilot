import { Router } from "express";
import {
  register,
  login,
  googleStart,
  googleCallback,
  refresh,
  logout,
  getProfile,
  seedDemoData,
  forgotPassword,
  resetPassword,
  deleteAccount,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/google", googleStart);
router.get("/google/callback", googleCallback);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/profile", requireAuth, getProfile);
router.post("/seed-demo", requireAuth, seedDemoData);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.delete("/account", requireAuth, deleteAccount);

export default router;
