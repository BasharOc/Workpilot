import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, LayoutGrid, List, ChevronDown } from "lucide-react";
import api from "@/api/axios";
import type { Task } from "@/types/task";
import type { TimeEntry } from "@/types/time-entry";
import KanbanBoard from "@/components/tasks/KanbanBoard";
import TaskListView from "@/components/tasks/TaskListView";
import TaskModal from "@/components/tasks/TaskModal";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { formatAltShortcut } from "@/utils/shortcuts";

interface ProjectOption {
  id: string;
  title: string;
  client: { name: string };
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export default function TasksPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  const [searchParams] = useSearchParams();

  // Alt+N → open add-task modal
  useGlobalShortcuts([
    {
      code: "KeyN",
      altKey: true,
      enabled: !modalOpen && !!selectedProjectId,
      handler: () => {
        setEditingTask(null);
        setModalOpen(true);
      },
    },
  ]);

  // Load all projects for the selector
  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data } = await api.get<ProjectOption[]>("/projects");
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        const fromUrl = searchParams.get("projectId");
        const initial =
          fromUrl && list.find((p) => p.id === fromUrl)
            ? fromUrl
            : (list[0]?.id ?? "");
        setSelectedProjectId(initial);
      } finally {
        setIsLoadingProjects(false);
      }
    }
    void fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load tasks whenever selected project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    setIsLoadingTasks(true);
    Promise.all([
      api.get<Task[]>(`/projects/${selectedProjectId}/tasks`),
      api.get<TimeEntry[]>(`/projects/${selectedProjectId}/time-entries`),
    ])
      .then(([tasksRes, timeRes]) => {
        setTasks(tasksRes.data);
        setTimeEntries(timeRes.data);
      })
      .catch(() => {
        setTasks([]);
        setTimeEntries([]);
      })
      .finally(() => setIsLoadingTasks(false));
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const percent =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  function openAddTask() {
    setEditingTask(null);
    setModalOpen(true);
  }

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
      if (selectedProjectId) {
        const { data } = await api.get<Task[]>(
          `/projects/${selectedProjectId}/tasks`,
        );
        setTasks(data);
      }
    }
  }

  const activeTimers: Record<string, TimeEntry> = {};
  for (const entry of timeEntries) {
    if (!entry.endedAt) activeTimers[entry.taskId] = entry;
  }

  async function handleTimerStart(taskId: string) {
    try {
      const { data } = await api.post<TimeEntry>("/time-entries", { taskId });
      setTimeEntries((prev) => {
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

  if (isLoadingProjects) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
              {selectedProject && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selectedProject.client.name} /{" "}
                  <Link
                    to={`/projects/${selectedProject.id}`}
                    className="transition hover:text-foreground hover:underline"
                  >
                    {selectedProject.title}
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Project selector */}
              {projects.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="h-9 appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} — {p.client.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              )}

              {/* View toggle */}
              <div className="flex rounded-md border border-border bg-muted/30">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-l-md transition ${
                    viewMode === "kanban"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Kanban view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-r-md transition ${
                    viewMode === "list"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Add task */}
              <button
                type="button"
                onClick={openAddTask}
                disabled={!selectedProjectId}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add task
                <kbd className="hidden rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 text-xs font-mono sm:inline">
                  {formatAltShortcut("N")}
                </kbd>
              </button>
            </div>
          </div>

          {/* No projects state */}
          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
              <p className="text-base font-medium">No projects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a project first to manage tasks.
              </p>
              <Link
                to="/projects"
                className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Go to Projects
              </Link>
            </div>
          )}

          {projects.length > 0 && (
            <>
              {/* Progress bar */}
              <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Task completion</span>
                  <span className="font-medium">
                    {doneTasks}/{totalTasks} ({percent}%)
                  </span>
                </div>
                <ProgressBar percent={percent} />
              </div>

              {/* Board / List */}
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {isLoadingTasks ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <div className="p-4">
                    {viewMode === "kanban" ? (
                      <KanbanBoard
                        tasks={tasks}
                        onTasksChange={setTasks}
                        onEdit={openEditTask}
                        onDelete={(id) => void handleDeleteTask(id)}
                        activeTimers={activeTimers}
                        onTimerStart={(taskId) => void handleTimerStart(taskId)}
                        onTimerStop={(entryId) => void handleTimerStop(entryId)}
                      />
                    ) : (
                      <TaskListView
                        tasks={tasks}
                        onEdit={openEditTask}
                        onDelete={(id) => void handleDeleteTask(id)}
                        activeTimers={activeTimers}
                        onTimerStart={(taskId) => void handleTimerStart(taskId)}
                        onTimerStop={(entryId) => void handleTimerStop(entryId)}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && selectedProjectId && (
        <TaskModal
          projectId={selectedProjectId}
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
