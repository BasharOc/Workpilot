import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Calendar, Play, Square } from "lucide-react";
import type { Task } from "@/types/task";
import { PRIORITY_LABELS, PRIORITY_STYLES } from "@/types/task";
import type { TimeEntry } from "@/types/time-entry";
import { formatDuration } from "@/types/time-entry";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  activeTimer?: TimeEntry | null;
  onTimerStart?: (taskId: string) => void;
  onTimerStop?: (entryId: string) => void;
}

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

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  activeTimer,
  onTimerStart,
  onTimerStop,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border bg-card shadow-sm transition-shadow ${
        isDragging ? "opacity-40 shadow-lg" : "hover:shadow-md"
      }`}
      {...attributes}
    >
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        {/* Drag handle */}
        <button
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/40 transition hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Drag handle"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {/* Priority badge */}
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>

            {/* Due date */}
            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  isOverdue ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}

            {/* Timer */}
            {onTimerStart && onTimerStop && (
              <button
                type="button"
                onClick={() =>
                  activeTimer
                    ? onTimerStop(activeTimer.id)
                    : onTimerStart(task.id)
                }
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium transition ${
                  activeTimer
                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {activeTimer ? (
                  <>
                    <Square className="h-3 w-3" />
                    <LiveTimer startedAt={activeTimer.startedAt} />
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    Track
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1 border-t border-border/50 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Edit task"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
