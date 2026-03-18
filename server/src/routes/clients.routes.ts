import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/clients.controller.js";
import { listProjectsByClient } from "../controllers/projects.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listClients);
router.post("/", createClient);
router.get("/:id", getClientById);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);
router.get("/:id/projects", listProjectsByClient);

export default router;
