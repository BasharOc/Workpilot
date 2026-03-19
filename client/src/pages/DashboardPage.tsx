import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FolderOpen,
  ListChecks,
  Clock,
  TrendingUp,
  Hourglass,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "@/api/axios";
import {
  STATUS_LABELS as INV_STATUS_LABELS,
  STATUS_STYLES as INV_STATUS_STYLES,
  computeTotal,
  formatMoney,
  type Invoice,
} from "@/types/invoice";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RecentProject {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  createdAt: string;
  client: { id: string; name: string };
}

interface DashboardData {
  stats: {
    totalClients: number;
    activeProjects: number;
    openTasks: number;
    loggedHoursThisMonth: number;
    paidRevenue: Record<string, number>;
    outstanding: Record<string, number>;
  };
  recentInvoices: Invoice[];
  recentProjects: RecentProject[];
  monthlyRevenue: { month: string; revenue: number }[];
  invoiceStatusCounts: Record<string, number>;
  overdueInvoices: Invoice[];
  overdueProjects: RecentProject[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PROJECT_STATUS_STYLES: Record<string, string> = {
  planned: "bg-zinc-100   text-zinc-600   border-zinc-200",
  in_progress: "bg-blue-50    text-blue-700   border-blue-200",
  on_hold: "bg-amber-50   text-amber-700  border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50     text-red-600    border-red-200",
};

function formatRevenueSummary(totals: Record<string, number>): string {
  const symbols: Record<string, string> = { EUR: "€", USD: "$", CHF: "CHF " };
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  if (entries.length === 0) return "—";
  return entries
    .map(
      ([cur, val]) =>
        `${symbols[cur] ?? cur}${val.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    )
    .join(" · ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── StatCard ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: "default" | "emerald" | "amber" | "blue";
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "default",
}: StatCardProps) {
  const accentMap = {
    default: "text-muted-foreground",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
  };

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-1 truncate text-2xl font-semibold ${accentMap[accent]}`}
        >
          {value}
        </p>
      </div>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" />
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function RevenueBarChart({
  data,
}: {
  data: { month: string; revenue: number }[];
}) {
  const hasData = data.some((d) => d.revenue > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Noch keine bezahlten Rechnungen.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        barSize={26}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(0,0,0,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
          width={36}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value: unknown) => [
            `€${Number(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
            "Umsatz",
          ]}
        />
        <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS: Record<string, string> = {
  draft: "#a1a1aa",
  sent: "#60a5fa",
  paid: "#34d399",
  cancelled: "#f87171",
};

const PIE_LABELS: Record<string, string> = {
  draft: "Entwurf",
  sent: "Gesendet",
  paid: "Bezahlt",
  cancelled: "Storniert",
};

function InvoiceStatusDonut({ counts }: { counts: Record<string, number> }) {
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({
      name: PIE_LABELS[status] ?? status,
      value: count,
      status,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Noch keine Rechnungen vorhanden.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={76}
          innerRadius={46}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={PIE_COLORS[entry.status] ?? "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span style={{ fontSize: 12, color: "#6b7280" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(({ data: d }) => setData(d))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = data?.stats;
  const recentInvoices = data?.recentInvoices ?? [];
  const recentProjects = data?.recentProjects ?? [];
  const overdueInvoices = data?.overdueInvoices ?? [];
  const overdueProjects = data?.overdueProjects ?? [];
  const hasOverdue = overdueInvoices.length > 0 || overdueProjects.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hier ist deine aktuelle Übersicht.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Kunden"
          value={stats?.totalClients ?? 0}
          icon={Users}
        />
        <StatCard
          label="Aktive Projekte"
          value={stats?.activeProjects ?? 0}
          icon={FolderOpen}
        />
        <StatCard
          label="Offene Aufgaben"
          value={stats?.openTasks ?? 0}
          icon={ListChecks}
        />
        <StatCard
          label="Stunden diesen Monat"
          value={`${stats?.loggedHoursThisMonth ?? 0} h`}
          icon={Clock}
        />
        <StatCard
          label="Bezahlt"
          value={formatRevenueSummary(stats?.paidRevenue ?? {})}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="Ausstehend"
          value={formatRevenueSummary(stats?.outstanding ?? {})}
          icon={Hourglass}
        />
      </div>

      {/* Overdue warning */}
      {hasOverdue && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-red-700 dark:text-red-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              !
            </span>
            {overdueInvoices.length + overdueProjects.length} Überfällige
            {overdueInvoices.length + overdueProjects.length === 1
              ? "r Eintrag"
              : " Einträge"}
          </h2>
          <div className="space-y-2">
            {overdueInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-red-200 bg-card px-4 py-2.5 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    {inv.invoiceNumber}
                  </p>
                  <p className="text-xs text-red-500 dark:text-red-500">
                    {inv.client.name} · fällig {formatDate(inv.dueDate!)}
                  </p>
                </div>
                <span className="ml-3 shrink-0 text-sm font-semibold text-red-700 dark:text-red-400">
                  {formatMoney(computeTotal(inv.items), inv.currency)}
                </span>
              </div>
            ))}
            {overdueProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-red-200 bg-card px-4 py-2.5 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    {proj.title}
                  </p>
                  <p className="text-xs text-red-500 dark:text-red-500">
                    {proj.client.name} · Deadline {formatDate(proj.deadline!)}
                  </p>
                </div>
                <span className="ml-3 shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  Projekt
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Monatlicher Umsatz</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
            Letzte 6 Monate · bezahlte Rechnungen (€)
          </p>
          <RevenueBarChart data={data?.monthlyRevenue ?? []} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Rechnungen nach Status</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
            Alle Rechnungen insgesamt
          </p>
          <InvoiceStatusDonut counts={data?.invoiceStatusCounts ?? {}} />
        </div>
      </div>

      {/* Bottom sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent invoices */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Letzte Rechnungen</h2>
            <button
              onClick={() => navigate("/invoices")}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Alle anzeigen →
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Noch keine Rechnungen vorhanden.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5 text-left">Nummer</th>
                    <th className="px-4 py-2.5 text-left">Kunde</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-right">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="cursor-pointer border-b border-border/50 transition hover:bg-muted/50 last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {inv.client.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${INV_STATUS_STYLES[inv.status]}`}
                        >
                          {INV_STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(computeTotal(inv.items), inv.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent projects */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Letzte Projekte</h2>
            <button
              onClick={() => navigate("/projects")}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Alle anzeigen →
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Noch keine Projekte vorhanden.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border/50">
              {recentProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  className="flex cursor-pointer items-start justify-between gap-3 px-4 py-3 transition hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{proj.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {proj.client.name}
                      {proj.deadline && (
                        <> · fällig {formatDate(proj.deadline)}</>
                      )}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS_STYLES[proj.status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}
                  >
                    {PROJECT_STATUS_LABELS[proj.status] ?? proj.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
