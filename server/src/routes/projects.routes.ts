import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projects.controller.js";
import { listTasks, createTask } from "../controllers/tasks.controller.js";
import { listByProject } from "../controllers/time-entries.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProjectById);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);
router.get("/:projectId/tasks", listTasks);
router.post("/:projectId/tasks", createTask);
router.get("/:projectId/time-entries", listByProject);

export default router;
