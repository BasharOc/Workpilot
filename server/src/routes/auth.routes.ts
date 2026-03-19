import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  getProfile,
  seedDemoData,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/profile", requireAuth, getProfile);
router.post("/seed-demo", requireAuth, seedDemoData);

export default router;
