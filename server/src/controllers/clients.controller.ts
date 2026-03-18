import type { Response } from "express";
import { z } from "zod";
import prisma from "../db/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateClientSchema = createClientSchema.partial();

export async function listClients(req: AuthRequest, res: Response) {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(clients);
  } catch {
    res.status(500).json({ error: "Failed to fetch clients" });
  }
}

export async function getClientById(req: AuthRequest, res: Response) {
  try {
    const client = await prisma.client.findFirst({
      where: { id: String(req.params.id), userId: req.userId },
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.json(client);
  } catch {
    res.status(500).json({ error: "Failed to fetch client" });
  }
}

export async function createClient(req: AuthRequest, res: Response) {
  const parsed = createClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const client = await prisma.client.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        userId: req.userId!,
      },
    });
    res.status(201).json(client);
  } catch {
    res.status(500).json({ error: "Failed to create client" });
  }
}

export async function updateClient(req: AuthRequest, res: Response) {
  const parsed = updateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const existing = await prisma.client.findFirst({
      where: { id: String(req.params.id), userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update client" });
  }
}

export async function deleteClient(req: AuthRequest, res: Response) {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: String(req.params.id), userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    await prisma.client.delete({ where: { id: existing.id } });
    res.json({ message: "Client deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete client" });
  }
}
