import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { formatAltShortcut } from "@/utils/shortcuts";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  budget: string | null;
  createdAt: string;
  client: { id: string; name: string };
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function getStatusClass(status: string) {
  if (status === "in_progress")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "planned") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "completed")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "on_hold") return "bg-zinc-100 text-zinc-600 border-zinc-200";
  return "bg-red-50 text-red-700 border-red-200"; // cancelled
}

function getStatusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [, setError] = useState("");

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addClientId, setAddClientId] = useState("");
  const [addStatus, setAddStatus] = useState("planned");
  const [addDeadline, setAddDeadline] = useState("");
  const [addBudget, setAddBudget] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function fetchProjects() {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch {
      setError("Failed to load projects");
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const [projectsRes, clientsRes] = await Promise.all([
          api.get("/projects"),
          api.get("/clients"),
        ]);
        setProjects(projectsRes.data);
        setClients(
          (clientsRes.data as Client[]).filter(
            (c: { status?: string } & Client) => c.status !== "archived",
          ),
        );
      } catch {
        setError("Failed to load data");
      }
    }
    void init();
  }, []);

  useGlobalShortcuts([
    {
      code: "KeyN",
      altKey: true,
      enabled: !isAddOpen,
      handler: openAddModal,
    },
    {
      code: "KeyF",
      altKey: true,
      handler: () => {
        searchRef.current?.focus();
        searchRef.current?.select();
      },
    },
  ]);

  function openAddModal() {
    setAddTitle("");
    setAddDescription("");
    setAddClientId(clients[0]?.id ?? "");
    setAddStatus("planned");
    setAddDeadline("");
    setAddBudget("");
    setAddError("");
    setIsAddOpen(true);
  }

  function closeAddModal() {
    setIsAddOpen(false);
    setAddError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addTitle.trim()) {
      setAddError("Title is required");
      return;
    }
    if (!addClientId) {
      setAddError("Please select a client");
      return;
    }
    setIsAdding(true);
    setAddError("");
    try {
      const { data } = await api.post("/projects", {
        title: addTitle.trim(),
        description: addDescription.trim() || undefined,
        clientId: addClientId,
        status: addStatus,
        deadline: addDeadline ? new Date(addDeadline).toISOString() : null,
        budget: addBudget ? parseFloat(addBudget) : null,
      });
      setIsAddOpen(false);
      await fetchProjects();
      navigate(`/projects/${data.id}`);
    } catch {
      setAddError("Failed to create project");
    } finally {
      setIsAdding(false);
    }
  }

  const filtered = projects.filter((p) => {
    const matchSearch =
      !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.client?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchClient = clientFilter === "all" || p.clientId === clientFilter;
    return matchSearch && matchStatus && matchClient;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              All projects across your clients.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            title={`Add Project (${formatAltShortcut("N")})`}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <span className="text-base leading-none">+</span>
            Add Project
            <kbd className="rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-xs">
              {formatAltShortcut("N")}
            </kbd>
          </button>
        </div>

        <div className="mb-3">
          <SearchBar
            ref={searchRef}
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by title or client…"
          />
        </div>

        <div className="mb-3 flex items-center gap-2">
          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>

          {/* Client filter */}
          <div className="relative">
            <select
              value={clientFilter}
              onChange={(e) => {
                setClientFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[20%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Deadline
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Budget
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      {search.trim() ||
                      statusFilter !== "all" ||
                      clientFilter !== "all"
                        ? "No projects match your filters."
                        : "No projects yet."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/30"
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <td className="px-4 py-3 align-middle font-medium">
                        {p.title}
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        <Link
                          to={`/clients/${p.client?.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="transition hover:text-foreground hover:underline"
                        >
                          {p.client?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusClass(p.status)}`}
                        >
                          {getStatusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {p.deadline
                          ? new Date(p.deadline).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {p.budget != null
                          ? `€ ${parseFloat(p.budget).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <svg
                          className="ml-auto h-4 w-4 text-muted-foreground"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={Math.ceil(filtered.length / PAGE_SIZE)}
            total={filtered.length}
            itemLabel="Projects"
            onPageChange={setPage}
          />
        </div>

        {/* Add Project Modal */}
        {isAddOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onKeyDown={(e) => {
              if (e.key === "Escape") closeAddModal();
            }}
          >
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-lg font-semibold">Add Project</h2>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-md text-2xl leading-none text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3 px-5 py-4">
                <input
                  autoFocus
                  placeholder="Title *"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />

                <div className="relative">
                  <select
                    value={addClientId}
                    onChange={(e) => setAddClientId(e.target.value)}
                    className="w-full appearance-none rounded-md border border-border bg-card px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select client *</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value)}
                    className="w-full appearance-none rounded-md border border-border bg-card px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </div>

                <input
                  type="date"
                  placeholder="Deadline"
                  value={addDeadline}
                  onChange={(e) => setAddDeadline(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />

                <input
                  type="number"
                  placeholder="Budget (€)"
                  value={addBudget}
                  min="0"
                  step="0.01"
                  onChange={(e) => setAddBudget(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />

                <textarea
                  placeholder="Description"
                  rows={3}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  className="w-full resize-y rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />

                {addError && <p className="text-xs text-red-600">{addError}</p>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isAdding ? "Creating…" : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
