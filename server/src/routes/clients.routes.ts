import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/clients.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listClients);
router.post("/", createClient);
router.get("/:id", getClientById);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

export default router;
