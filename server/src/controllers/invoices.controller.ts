import type { Response } from "express";
import { z } from "zod";
import prisma from "../db/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  currency: z.enum(["EUR", "USD", "CHF"]).optional(),
});

const updateInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  status: z.enum(["draft", "sent", "paid", "cancelled"]).optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  items: z.array(invoiceItemSchema).min(1).optional(),
  notes: z.string().optional(),
  currency: z.enum(["EUR", "USD", "CHF"]).optional(),
});

async function generateInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the highest number for this user in the current year
  const last = await prisma.invoice.findFirst({
    where: {
      userId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
  });

  let next = 1;
  if (last) {
    const parts = last.invoiceNumber.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) next = lastNum + 1;
  }

  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function listInvoices(req: AuthRequest, res: Response) {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.userId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
}

export async function getInvoiceById(req: AuthRequest, res: Response) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: String(req.params.id), userId: req.userId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
            company: true,
          },
        },
      },
    });
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json(invoice);
  } catch {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
}

export async function createInvoice(req: AuthRequest, res: Response) {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  // Verify client belongs to user
  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, userId: req.userId },
  });
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  try {
    const invoiceNumber = await generateInvoiceNumber(req.userId!);
    const invoice = await prisma.invoice.create({
      data: {
        userId: req.userId!,
        clientId: parsed.data.clientId,
        invoiceNumber,
        issueDate: parsed.data.issueDate
          ? new Date(parsed.data.issueDate)
          : new Date(),
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        items: parsed.data.items,
        notes: parsed.data.notes ?? null,
        currency: parsed.data.currency ?? "EUR",
      },
      include: { client: { select: { id: true, name: true } } },
    });
    res.status(201).json(invoice);
  } catch {
    res.status(500).json({ error: "Failed to create invoice" });
  }
}

export async function updateInvoice(req: AuthRequest, res: Response) {
  const parsed = updateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const existing = await prisma.invoice.findFirst({
    where: { id: String(req.params.id), userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  // Validate new clientId if provided
  if (parsed.data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, userId: req.userId },
    });
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
  }

  try {
    const updated = await prisma.invoice.update({
      where: { id: existing.id },
      data: {
        ...parsed.data,
        issueDate: parsed.data.issueDate
          ? new Date(parsed.data.issueDate)
          : undefined,
        dueDate:
          parsed.data.dueDate !== undefined
            ? parsed.data.dueDate
              ? new Date(parsed.data.dueDate)
              : null
            : undefined,
      },
      include: { client: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update invoice" });
  }
}

export async function deleteInvoice(req: AuthRequest, res: Response) {
  const existing = await prisma.invoice.findFirst({
    where: { id: String(req.params.id), userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  if (existing.status !== "draft") {
    res.status(400).json({ error: "Only draft invoices can be deleted" });
    return;
  }

  try {
    await prisma.invoice.delete({ where: { id: existing.id } });
    res.json({ message: "Invoice deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
}
