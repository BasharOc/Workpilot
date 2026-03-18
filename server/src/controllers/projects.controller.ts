import type { Response } from "express";
import { z } from "zod";
import prisma from "../db/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

const createProjectSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z
    .enum(["planned", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
  budget: z.number().nonnegative().optional().nullable(),
});

const updateProjectSchema = createProjectSchema
  .omit({ clientId: true })
  .partial();

export async function listProjects(req: AuthRequest, res: Response) {
  const { clientId, status } = req.query as {
    clientId?: string;
    status?: string;
  };

  try {
    const projects = await prisma.project.findMany({
      where: {
        client: { userId: req.userId },
        ...(clientId ? { clientId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}

export async function getProjectById(req: AuthRequest, res: Response) {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: String(req.params.id),
        client: { userId: req.userId },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(project);
  } catch {
    res.status(500).json({ error: "Failed to fetch project" });
  }
}

export async function createProject(req: AuthRequest, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  // Sicherstellen, dass der Client dem eingeloggten User gehört
  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, userId: req.userId },
  });

  if (!client) {
    res.status(403).json({ error: "Client not found or access denied" });
    return;
  }

  try {
    const project = await prisma.project.create({
      data: {
        clientId: parsed.data.clientId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status ?? "planned",
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        budget: parsed.data.budget ?? null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(project);
  } catch {
    res.status(500).json({ error: "Failed to create project" });
  }
}

export async function updateProject(req: AuthRequest, res: Response) {
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const existing = await prisma.project.findFirst({
      where: {
        id: String(req.params.id),
        client: { userId: req.userId },
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...parsed.data,
        deadline:
          parsed.data.deadline !== undefined
            ? parsed.data.deadline
              ? new Date(parsed.data.deadline)
              : null
            : undefined,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update project" });
  }
}

export async function deleteProject(req: AuthRequest, res: Response) {
  try {
    const existing = await prisma.project.findFirst({
      where: {
        id: String(req.params.id),
        client: { userId: req.userId },
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    await prisma.project.delete({ where: { id: existing.id } });
    res.json({ message: "Project deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete project" });
  }
}

export async function listProjectsByClient(req: AuthRequest, res: Response) {
  try {
    const client = await prisma.client.findFirst({
      where: { id: String(req.params.id), userId: req.userId },
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const projects = await prisma.project.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}
