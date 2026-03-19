import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  startTimer,
  stopTimer,
} from "../controllers/time-entries.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", startTimer);
router.patch("/:id/stop", stopTimer);

export default router;
