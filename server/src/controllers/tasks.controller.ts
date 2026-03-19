import type { Response } from "express";
import { z } from "zod";
import prisma from "../db/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  estimatedHours: z.number().nonnegative().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.partial();

const updatePositionSchema = z.object({
  status: z.enum(["todo", "in_progress", "in_review", "done"]),
  position: z.number().int().nonnegative(),
});

// Hilfsfunktion: prüft ob ein Task zum eingeloggten User gehört
async function findTaskForUser(taskId: string, userId: string | undefined) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      project: { client: { userId } },
    },
  });
}

export async function listTasks(req: AuthRequest, res: Response) {
  const projectId = String(req.params.projectId);

  // Sicherstellen, dass das Projekt dem User gehört
  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { userId: req.userId } },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });
    res.json(tasks);
  } catch {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
}

export async function createTask(req: AuthRequest, res: Response) {
  const projectId = String(req.params.projectId);
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { userId: req.userId } },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    const status = parsed.data.status ?? "todo";

    // Position = Anzahl Tasks in der gleichen Spalte
    const count = await prisma.task.count({ where: { projectId, status } });

    const task = await prisma.task.create({
      data: {
        projectId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status,
        priority: parsed.data.priority ?? "medium",
        position: count,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        estimatedHours: parsed.data.estimatedHours ?? null,
      },
    });
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: "Failed to create task" });
  }
}

export async function getTaskById(req: AuthRequest, res: Response) {
  try {
    const task = await findTaskForUser(String(req.params.id), req.userId);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch {
    res.status(500).json({ error: "Failed to fetch task" });
  }
}

export async function updateTask(req: AuthRequest, res: Response) {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const existing = await findTaskForUser(String(req.params.id), req.userId);
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...parsed.data,
        dueDate:
          parsed.data.dueDate !== undefined
            ? parsed.data.dueDate
              ? new Date(parsed.data.dueDate)
              : null
            : undefined,
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update task" });
  }
}

export async function updateTaskPosition(req: AuthRequest, res: Response) {
  const parsed = updatePositionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const existing = await findTaskForUser(String(req.params.id), req.userId);
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const { status, position } = parsed.data;
    const projectId = existing.projectId;

    // Wenn die Spalte geändert wurde, Positionen in beiden Spalten neu ordnen
    if (existing.status !== status) {
      // Lücke in der alten Spalte schließen
      await prisma.task.updateMany({
        where: {
          projectId,
          status: existing.status,
          position: { gt: existing.position },
        },
        data: { position: { decrement: 1 } },
      });

      // Platz in der neuen Spalte schaffen
      await prisma.task.updateMany({
        where: { projectId, status, position: { gte: position } },
        data: { position: { increment: 1 } },
      });
    } else {
      // Gleiche Spalte: Positionen zwischen altem und neuem Index verschieben
      if (position < existing.position) {
        await prisma.task.updateMany({
          where: {
            projectId,
            status,
            position: { gte: position, lt: existing.position },
            id: { not: existing.id },
          },
          data: { position: { increment: 1 } },
        });
      } else if (position > existing.position) {
        await prisma.task.updateMany({
          where: {
            projectId,
            status,
            position: { gt: existing.position, lte: position },
            id: { not: existing.id },
          },
          data: { position: { decrement: 1 } },
        });
      }
    }

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: { status, position },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update task position" });
  }
}

export async function deleteTask(req: AuthRequest, res: Response) {
  try {
    const existing = await findTaskForUser(String(req.params.id), req.userId);
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    await prisma.task.delete({ where: { id: existing.id } });

    // Positionen in der Spalte nach dem gelöschten Task neu ordnen
    await prisma.task.updateMany({
      where: {
        projectId: existing.projectId,
        status: existing.status,
        position: { gt: existing.position },
      },
      data: { position: { decrement: 1 } },
    });

    res.json({ message: "Task deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete task" });
  }
}
