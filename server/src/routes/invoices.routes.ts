import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoices.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listInvoices);
router.post("/", createInvoice);
router.get("/:id", getInvoiceById);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

export default router;
