import type { Response } from "express";
import prisma from "../db/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

function computeRevenueByCurrency(
  invoices: { items: unknown; currency: string }[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const inv of invoices) {
    const items = Array.isArray(inv.items)
      ? (inv.items as { quantity: number; unitPrice: number }[])
      : [];
    const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    totals[inv.currency] = (totals[inv.currency] ?? 0) + total;
  }
  return totals;
}

const MONTH_NAMES_DE = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      totalClients,
      activeProjects,
      openTasks,
      hoursAgg,
      paidInvoices,
      sentInvoices,
      recentInvoices,
      recentProjects,
      paidForChart,
      statusGroups,
      overdueInvoices,
      overdueProjects,
    ] = await Promise.all([
      prisma.client.count({ where: { userId } }),

      prisma.project.count({
        where: { status: "in_progress", client: { userId } },
      }),

      prisma.task.count({
        where: {
          status: { in: ["todo", "in_progress", "in_review"] },
          project: { client: { userId } },
        },
      }),

      prisma.timeEntry.aggregate({
        where: {
          endedAt: { not: null },
          startedAt: { gte: monthStart },
          task: { project: { client: { userId } } },
        },
        _sum: { durationSeconds: true },
      }),

      prisma.invoice.findMany({
        where: { userId, status: "paid" },
        select: { items: true, currency: true },
      }),

      prisma.invoice.findMany({
        where: { userId, status: "sent" },
        select: { items: true, currency: true },
      }),

      prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { client: { select: { id: true, name: true } } },
      }),

      prisma.project.findMany({
        where: { client: { userId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { client: { select: { id: true, name: true } } },
      }),

      prisma.invoice.findMany({
        where: { userId, status: "paid", issueDate: { gte: sixMonthsAgo } },
        select: { items: true, issueDate: true },
      }),

      prisma.invoice.groupBy({
        by: ["status"],
        where: { userId },
        _count: { id: true },
      }),

      prisma.invoice.findMany({
        where: {
          userId,
          status: { in: ["sent", "draft"] },
          dueDate: { lt: now },
        },
        orderBy: { dueDate: "asc" },
        include: { client: { select: { id: true, name: true } } },
      }),

      prisma.project.findMany({
        where: {
          client: { userId },
          status: { notIn: ["completed", "cancelled"] },
          deadline: { lt: now },
        },
        orderBy: { deadline: "asc" },
        include: { client: { select: { id: true, name: true } } },
      }),
    ]);

    const loggedHoursThisMonth =
      Math.round(((hoursAgg._sum.durationSeconds ?? 0) / 3600) * 10) / 10;

    // Build monthly revenue map (last 6 months)
    const monthMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = 0;
    }
    for (const inv of paidForChart) {
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthMap) {
        const items = Array.isArray(inv.items)
          ? (inv.items as { quantity: number; unitPrice: number }[])
          : [];
        monthMap[key] += items.reduce(
          (s, i) => s + i.quantity * i.unitPrice,
          0,
        );
      }
    }
    const monthlyRevenue = Object.entries(monthMap).map(([key, value]) => ({
      month: MONTH_NAMES_DE[parseInt(key.split("-")[1], 10) - 1],
      revenue: Math.round(value * 100) / 100,
    }));

    // Invoice status counts
    const invoiceStatusCounts: Record<string, number> = {
      draft: 0,
      sent: 0,
      paid: 0,
      cancelled: 0,
    };
    for (const g of statusGroups) {
      invoiceStatusCounts[g.status] = g._count.id;
    }

    res.json({
      stats: {
        totalClients,
        activeProjects,
        openTasks,
        loggedHoursThisMonth,
        paidRevenue: computeRevenueByCurrency(paidInvoices),
        outstanding: computeRevenueByCurrency(sentInvoices),
      },
      recentInvoices,
      recentProjects,
      monthlyRevenue,
      invoiceStatusCounts,
      overdueInvoices,
      overdueProjects,
    });
  } catch {
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
}
