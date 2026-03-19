import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getTaskById,
  updateTask,
  updateTaskPosition,
  deleteTask,
} from "../controllers/tasks.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", getTaskById);
router.put("/:id", updateTask);
router.patch("/:id/position", updateTaskPosition);
router.delete("/:id", deleteTask);

export default router;
