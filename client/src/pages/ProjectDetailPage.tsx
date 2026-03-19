import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { LayoutGrid, List, Plus } from "lucide-react";
import api from "@/api/axios";
import type { Task } from "@/types/task";
import type { TimeEntry } from "@/types/time-entry";
import { formatDuration } from "@/types/time-entry";
import KanbanBoard from "@/components/tasks/KanbanBoard";
import TaskListView from "@/components/tasks/TaskListView";
import TaskModal from "@/components/tasks/TaskModal";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { formatAltShortcut } from "@/utils/shortcuts";

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

type EditValues = {
  title: string;
  description: string;
  status: string;
  deadline: string;
  budget: string;
};

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
  return "bg-red-50 text-red-700 border-red-200";
}

function getStatusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

// Fortschrittsbalken — bleibt 0% bis Phase 5 (Tasks)
function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editValues, setEditValues] = useState<EditValues>({
    title: "",
    description: "",
    status: "planned",
    deadline: "",
    budget: "",
  });

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Time tracking state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    async function fetchProject() {
      try {
        const [projectRes, tasksRes, timeRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/projects/${id}/tasks`),
          api.get<TimeEntry[]>(`/projects/${id}/time-entries`),
        ]);
        setProject(projectRes.data as Project);
        setTasks(tasksRes.data as Task[]);
        setTimeEntries(timeRes.data);
      } catch {
        setError("Project not found");
      } finally {
        setIsLoading(false);
      }
    }
    void fetchProject();
  }, [id]);

  function startEdit() {
    if (!project) return;
    setEditValues({
      title: project.title,
      description: project.description ?? "",
      status: project.status,
      deadline: project.deadline
        ? new Date(project.deadline).toISOString().slice(0, 10)
        : "",
      budget: project.budget != null ? String(parseFloat(project.budget)) : "",
    });
    setIsEditing(true);
    setError("");
  }

  function cancelEdit() {
    setIsEditing(false);
    setError("");
  }

  async function handleSave() {
    if (!editValues.title.trim()) {
      setError("Title is required");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const { data } = await api.put(`/projects/${id}`, {
        title: editValues.title.trim(),
        description: editValues.description.trim() || null,
        status: editValues.status,
        deadline: editValues.deadline
          ? new Date(editValues.deadline).toISOString()
          : null,
        budget: editValues.budget ? parseFloat(editValues.budget) : null,
      });
      setProject(data);
      setIsEditing(false);
    } catch {
      setError("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  function openAddTask() {
    setEditingTask(null);
    setModalOpen(true);
  }

  // Alt+N → open add-task modal
  useGlobalShortcuts([
    {
      code: "KeyN",
      altKey: true,
      enabled: !modalOpen,
      handler: () => {
        setEditingTask(null);
        setModalOpen(true);
      },
    },
  ]);

  function openEditTask(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleTaskSaved(saved: Task) {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      return exists
        ? prev.map((t) => (t.id === saved.id ? saved : t))
        : [...prev, saved];
    });
    setModalOpen(false);
    setEditingTask(null);
  }

  async function handleDeleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await api.delete(`/tasks/${taskId}`);
    } catch {
      // Re-fetch to restore on error
      const { data } = await api.get(`/projects/${id}/tasks`);
      setTasks(data as Task[]);
    }
  }

  const activeTimers: Record<string, TimeEntry> = {};
  for (const entry of timeEntries) {
    if (!entry.endedAt) activeTimers[entry.taskId] = entry;
  }

  const totalTrackedSeconds = timeEntries.reduce((sum, e) => {
    if (e.durationSeconds != null) return sum + e.durationSeconds;
    if (!e.endedAt)
      return (
        sum + Math.floor((Date.now() - new Date(e.startedAt).getTime()) / 1000)
      );
    return sum;
  }, 0);

  async function handleTimerStart(taskId: string) {
    try {
      const { data } = await api.post<TimeEntry>("/time-entries", { taskId });
      setTimeEntries((prev) => {
        // Stop existing active entry for this task in local state
        const filtered = prev.map((e) =>
          e.taskId === taskId && !e.endedAt
            ? { ...e, endedAt: new Date().toISOString(), durationSeconds: 0 }
            : e,
        );
        return [...filtered, data];
      });
    } catch {
      // ignore
    }
  }

  async function handleTimerStop(entryId: string) {
    try {
      const { data } = await api.patch<TimeEntry>(
        `/time-entries/${entryId}/stop`,
      );
      setTimeEntries((prev) => prev.map((e) => (e.id === entryId ? data : e)));
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Link to="/projects" className="text-sm text-primary underline">
          Go to Projects
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {project.title}
              </h1>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusClass(project.status)}`}
                >
                  {getStatusLabel(project.status)}
                </span>
                <Link
                  to={`/clients/${project.client.id}`}
                  className="text-sm text-muted-foreground transition hover:text-foreground hover:underline"
                >
                  {project.client.name}
                </Link>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="inline-flex h-9 cursor-pointer items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startEdit}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
                >
                  Edit
                </button>
              )}
              <Link
                to={`/tasks?projectId=${id}`}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
              >
                <LayoutGrid className="h-4 w-4" />
                Tasks
              </Link>
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Top grid: Description + Details sidebar */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Linke Spalte: Description */}
            <div className="space-y-4 lg:col-span-2">
              {/* Description */}
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Description
                  </h2>
                </div>
                <div className="px-5 py-4">
                  {isEditing ? (
                    <textarea
                      rows={4}
                      value={editValues.description}
                      onChange={(e) =>
                        setEditValues((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe the project…"
                      className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : project.description ? (
                    <p className="whitespace-pre-wrap text-sm">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No description yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rechte Spalte: Meta-Infos */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Details
                  </h2>
                </div>
                <dl className="divide-y divide-border">
                  {/* Status */}
                  <div className="px-5 py-3">
                    <dt className="mb-1 text-xs font-medium text-muted-foreground">
                      Status
                    </dt>
                    <dd>
                      {isEditing ? (
                        <div className="relative">
                          <select
                            value={editValues.status}
                            onChange={(e) =>
                              setEditValues((p) => ({
                                ...p,
                                status: e.target.value,
                              }))
                            }
                            className="w-full appearance-none rounded-md border border-border bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusClass(project.status)}`}
                        >
                          {getStatusLabel(project.status)}
                        </span>
                      )}
                    </dd>
                  </div>

                  {/* Deadline */}
                  <div className="px-5 py-3">
                    <dt className="mb-1 text-xs font-medium text-muted-foreground">
                      Deadline
                    </dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editValues.deadline}
                          onChange={(e) =>
                            setEditValues((p) => ({
                              ...p,
                              deadline: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <span className="text-sm">
                          {project.deadline ? (
                            new Date(project.deadline).toLocaleDateString(
                              "de-DE",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              },
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      )}
                    </dd>
                  </div>

                  {/* Budget */}
                  <div className="px-5 py-3">
                    <dt className="mb-1 text-xs font-medium text-muted-foreground">
                      Budget
                    </dt>
                    <dd>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValues.budget}
                          onChange={(e) =>
                            setEditValues((p) => ({
                              ...p,
                              budget: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <span className="text-sm">
                          {project.budget != null ? (
                            `€ ${parseFloat(project.budget).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      )}
                    </dd>
                  </div>

                  {/* Title (nur im Edit-Modus) */}
                  {isEditing && (
                    <div className="px-5 py-3">
                      <dt className="mb-1 text-xs font-medium text-muted-foreground">
                        Title
                      </dt>
                      <dd>
                        <input
                          type="text"
                          value={editValues.title}
                          onChange={(e) =>
                            setEditValues((p) => ({
                              ...p,
                              title: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </dd>
                    </div>
                  )}

                  {/* Client */}
                  <div className="px-5 py-3">
                    <dt className="mb-1 text-xs font-medium text-muted-foreground">
                      Client
                    </dt>
                    <dd>
                      <Link
                        to={`/clients/${project.client.id}`}
                        className="text-sm text-primary underline"
                      >
                        {project.client.name}
                      </Link>
                    </dd>
                  </div>

                  {/* Tracked time */}
                  <div className="px-5 py-3">
                    <dt className="mb-1 text-xs font-medium text-muted-foreground">
                      Tracked time
                    </dt>
                    <dd className="text-sm font-medium">
                      {totalTrackedSeconds > 0 ? (
                        formatDuration(totalTrackedSeconds)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="text-right text-xs text-muted-foreground">
                Created{" "}
                {new Date(project.createdAt).toLocaleDateString("de-DE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Progress – full width */}
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Progress
              </h2>
            </div>
            <div className="px-5 py-4">
              {(() => {
                const total = tasks.length;
                const done = tasks.filter((t) => t.status === "done").length;
                const percent =
                  total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Task completion
                      </span>
                      <span className="font-medium">
                        {done}/{total} ({percent}%)
                      </span>
                    </div>
                    <ProgressBar percent={percent} />
                  </>
                );
              })()}
            </div>
          </div>

          {/* Tasks – full width */}
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Tasks
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border border-border bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setViewMode("kanban")}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-l-md transition ${
                      viewMode === "kanban"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="Kanban view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-r-md transition ${
                      viewMode === "list"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openAddTask}
                  className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                  <kbd className="hidden rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1 py-0.5 font-mono text-xs sm:inline">
                    {formatAltShortcut("N")}
                  </kbd>
                </button>
              </div>
            </div>
            <div className="p-4">
              {viewMode === "kanban" ? (
                <KanbanBoard
                  tasks={tasks}
                  onTasksChange={setTasks}
                  onEdit={openEditTask}
                  onDelete={(taskId) => void handleDeleteTask(taskId)}
                  activeTimers={activeTimers}
                  onTimerStart={(taskId) => void handleTimerStart(taskId)}
                  onTimerStop={(entryId) => void handleTimerStop(entryId)}
                />
              ) : (
                <TaskListView
                  tasks={tasks}
                  onEdit={openEditTask}
                  onDelete={(taskId) => void handleDeleteTask(taskId)}
                  activeTimers={activeTimers}
                  onTimerStart={(taskId) => void handleTimerStart(taskId)}
                  onTimerStop={(entryId) => void handleTimerStop(entryId)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <TaskModal
          projectId={id!}
          task={editingTask}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSaved={handleTaskSaved}
        />
      )}
    </>
  );
}
