import type { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  refreshTokens,
  getUserById,
} from "../services/auth.service.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { z } from "zod/v4";
import prisma from "../db/prisma.js";

const registerSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const loginSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const REFRESH_TOKEN_COOKIE = "refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email, password, firstName, lastName } = parsed.data;
    const result = await registerUser(email, password, firstName, lastName);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Email already registered") {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email, password } = parsed.data;
    const result = await loginUser(email, password);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid email or password") {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!token) {
      res.status(401).json({ error: "Refresh token required" });
      return;
    }

    const result = await refreshTokens(token);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch {
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    res.status(401).json({ error: "Invalid refresh token" });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(REFRESH_TOKEN_COOKIE);
  res.json({ message: "Logged out" });
}

export async function getProfile(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const user = await getUserById(req.userId!);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function seedDemoData(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.userId!;
  try {
    const existing = await prisma.client.count({ where: { userId } });
    if (existing > 0) {
      res.status(400).json({ error: "Demo-Daten existieren bereits" });
      return;
    }

    const client = await prisma.client.create({
      data: {
        userId,
        name: "Mustermann GmbH",
        email: "kontakt@mustermann.de",
        phone: "+49 30 12345678",
        company: "Mustermann GmbH",
        address: "Musterstraße 1, 10115 Berlin",
        notes: "Stammkunde. Bevorzugt Kommunikation per E-Mail.",
        status: "active",
      },
    });

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 28);

    const project = await prisma.project.create({
      data: {
        clientId: client.id,
        title: "Website Redesign",
        description:
          "Komplettes Redesign der Unternehmenswebsite mit modernem Look & Feel und verbesserter Performance.",
        status: "in_progress",
        deadline,
        budget: 4500,
      },
    });

    await prisma.task.createMany({
      data: [
        {
          projectId: project.id,
          title: "Design-Konzept & Wireframes erstellen",
          status: "done",
          priority: "high",
          position: 0,
        },
        {
          projectId: project.id,
          title: "Homepage Layout umsetzen",
          status: "in_progress",
          priority: "high",
          position: 1,
        },
        {
          projectId: project.id,
          title: "Responsive Design testen",
          status: "todo",
          priority: "medium",
          position: 2,
        },
        {
          projectId: project.id,
          title: "SEO-Optimierung durchführen",
          status: "todo",
          priority: "low",
          position: 3,
        },
      ],
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const year = new Date().getFullYear();
    await prisma.invoice.create({
      data: {
        userId,
        clientId: client.id,
        invoiceNumber: `INV-${year}-001`,
        status: "sent",
        issueDate: new Date(),
        dueDate,
        currency: "EUR",
        notes: "Anzahlung 50% für Website Redesign Projekt",
        items: [
          {
            description: "Designkonzept & Wireframes",
            quantity: 1,
            unitPrice: 800,
          },
          {
            description: "Frontend-Entwicklung (Anzahlung)",
            quantity: 1,
            unitPrice: 1350,
          },
        ],
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Seed demo error:", err);
    res.status(500).json({ error: "Fehler beim Erstellen der Demo-Daten" });
  }
}
