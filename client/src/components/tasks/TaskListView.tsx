import { useEffect, useState } from "react";
import { Pencil, Trash2, Calendar, Play, Square } from "lucide-react";
import type { Task } from "@/types/task";
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_STYLES } from "@/types/task";
import type { TimeEntry } from "@/types/time-entry";
import { formatDuration } from "@/types/time-entry";

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  );
  useEffect(() => {
    const id = setInterval(
      () =>
        setElapsed(
          Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
        ),
      1000,
    );
    return () => clearInterval(id);
  }, [startedAt]);
  return <span>{formatDuration(elapsed)}</span>;
}

const STATUS_STYLES: Record<Task["status"], string> = {
  todo: "bg-zinc-100 text-zinc-600 border-zinc-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  in_review: "bg-purple-50 text-purple-700 border-purple-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  activeTimers?: Record<string, TimeEntry>;
  onTimerStart?: (taskId: string) => void;
  onTimerStop?: (entryId: string) => void;
}

export default function TaskListView({
  tasks,
  onEdit,
  onDelete,
  activeTimers = {},
  onTimerStart,
  onTimerStop,
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 font-semibold text-muted-foreground">
              Title
            </th>
            <th className="hidden px-4 py-3 font-semibold text-muted-foreground sm:table-cell">
              Status
            </th>
            <th className="hidden px-4 py-3 font-semibold text-muted-foreground md:table-cell">
              Priority
            </th>
            <th className="hidden px-4 py-3 font-semibold text-muted-foreground lg:table-cell">
              Due date
            </th>
            <th className="hidden px-4 py-3 text-center font-semibold text-muted-foreground xl:table-cell">
              Time
            </th>
            <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.map((task) => {
            const isOverdue =
              task.dueDate &&
              task.status !== "done" &&
              new Date(task.dueDate) < new Date();

            return (
              <tr key={task.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                </td>

                <td className="hidden px-4 py-3 sm:table-cell">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </td>

                <td className="hidden px-4 py-3 md:table-cell">
                  <span
                    className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </td>

                <td className="hidden px-4 py-3 lg:table-cell">
                  {task.dueDate ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        isOverdue ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {onTimerStart && onTimerStop && (
                      <button
                        type="button"
                        onClick={() => {
                          const active = activeTimers[task.id];
                          active
                            ? onTimerStop(active.id)
                            : onTimerStart(task.id);
                        }}
                        className={`inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition ${
                          activeTimers[task.id]
                            ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
                            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                        aria-label="Toggle timer"
                      >
                        {activeTimers[task.id] ? (
                          <>
                            <Square className="h-3 w-3" />
                            <LiveTimer startedAt={activeTimers[task.id].startedAt} />
                          </>
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label="Edit task"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
