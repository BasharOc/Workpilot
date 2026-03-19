import { RequestHandler } from "express";
import { z } from "zod";
import prisma from "../db/prisma.js";

const MAX_TIMER_SECONDS = 8 * 60 * 60; // 8 hours

// POST /api/time-entries — Start timer for a task
export const startTimer: RequestHandler = async (req, res) => {
  const schema = z.object({ taskId: z.string().uuid() });

  let taskId: string;
  try {
    ({ taskId } = schema.parse(req.body));
  } catch {
    res.status(400).json({ error: "taskId (UUID) is required" });
    return;
  }

  const userId = (req as unknown as { userId: string }).userId;

  // Verify task belongs to user
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { client: { userId } } },
  });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  // Stop any existing active timer for this task
  const existing = await prisma.timeEntry.findFirst({
    where: { taskId, endedAt: null },
  });
  if (existing) {
    const rawDuration = Math.round(
      (Date.now() - existing.startedAt.getTime()) / 1000,
    );
    const durationSeconds = Math.min(rawDuration, MAX_TIMER_SECONDS);
    const endedAt = new Date(
      existing.startedAt.getTime() + durationSeconds * 1000,
    );
    await prisma.timeEntry.update({
      where: { id: existing.id },
      data: { endedAt, durationSeconds },
    });
  }

  const entry = await prisma.timeEntry.create({
    data: { taskId, projectId: task.projectId },
  });

  res.status(201).json(entry);
};

// PATCH /api/time-entries/:id/stop — Stop a running timer
export const stopTimer: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const userId = (req as unknown as { userId: string }).userId;

  const entry = await prisma.timeEntry.findFirst({
    where: { id: String(id), task: { project: { client: { userId } } } },
  });
  if (!entry) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }
  if (entry.endedAt) {
    res.status(400).json({ error: "Timer already stopped" });
    return;
  }

  const rawDuration = Math.round(
    (Date.now() - entry.startedAt.getTime()) / 1000,
  );
  const durationSeconds = Math.min(rawDuration, MAX_TIMER_SECONDS);
  const endedAt = new Date(entry.startedAt.getTime() + durationSeconds * 1000);

  const updated = await prisma.timeEntry.update({
    where: { id: String(id) },
    data: { endedAt, durationSeconds },
  });

  res.json(updated);
};

// GET /api/projects/:projectId/time-entries — All entries for a project
export const listByProject: RequestHandler = async (req, res) => {
  const { projectId } = req.params;
  const userId = (req as unknown as { userId: string }).userId;

  const project = await prisma.project.findFirst({
    where: { id: String(projectId), client: { userId } },
  });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const entries = await prisma.timeEntry.findMany({
    where: { projectId: String(projectId) },
    include: { task: { select: { id: true, title: true } } },
    orderBy: { startedAt: "desc" },
  });

  res.json(entries);
};
