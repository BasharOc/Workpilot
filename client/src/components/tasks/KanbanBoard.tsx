import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import api from "@/api/axios";
import type { Task } from "@/types/task";
import { TASK_STATUSES, STATUS_LABELS } from "@/types/task";
import type { TimeEntry } from "@/types/time-entry";
import TaskCard from "./TaskCard";

// ── Column droppable ──────────────────────────────────────────────────────────

function KanbanColumn({
  colId,
  label,
  tasks,
  onEdit,
  onDelete,
  activeTimers = {},
  onTimerStart,
  onTimerStop,
}: {
  colId: Task["status"];
  label: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  activeTimers?: Record<string, TimeEntry>;
  onTimerStart?: (taskId: string) => void;
  onTimerStop?: (entryId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[160px] flex-col rounded-xl border p-3 transition-colors ${
        isOver ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              activeTimer={activeTimers[task.id]}
              onTimerStart={onTimerStart}
              onTimerStop={onTimerStop}
            />
          ))}
          {tasks.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground/50">
              No tasks
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

interface Props {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  activeTimers?: Record<string, TimeEntry>;
  onTimerStart?: (taskId: string) => void;
  onTimerStop?: (entryId: string) => void;
}

const COLUMNS = TASK_STATUSES.map((id) => ({
  id,
  label: STATUS_LABELS[id],
}));

export default function KanbanBoard({
  tasks,
  onTasksChange,
  onEdit,
  onDelete,
  activeTimers = {},
  onTimerStart,
  onTimerStop,
}: Props) {
  const [localTasks, setLocalTasks] = useState<Task[]>([...tasks]);
  const [snapshotTasks, setSnapshotTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Sync when parent pushes updates (add / delete / edit)
  useEffect(() => {
    setLocalTasks([...tasks]);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function getColumnTasks(status: Task["status"]) {
    return localTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(localTasks.find((t) => t.id === active.id) ?? null);
    setSnapshotTasks([...localTasks]);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;

    const task = localTasks.find((t) => t.id === active.id);
    if (!task) return;

    const overTask = localTasks.find((t) => t.id === over.id);
    const toStatus = (overTask?.status ?? over.id) as Task["status"];

    if (!TASK_STATUSES.includes(toStatus)) return;
    if (task.status === toStatus) return;

    // Optimistically move to new column (position will be fixed in handleDragEnd)
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: toStatus } : t)),
    );
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    const task = localTasks.find((t) => t.id === active.id);
    setActiveTask(null);

    if (!over || !task) {
      setLocalTasks(snapshotTasks);
      return;
    }

    const overTask = localTasks.find((t) => t.id === over.id);
    const toStatus = (overTask?.status ?? over.id) as Task["status"];

    if (!TASK_STATUSES.includes(toStatus)) {
      setLocalTasks(snapshotTasks);
      return;
    }

    const originalStatus = snapshotTasks.find((t) => t.id === task.id)?.status;

    // Other tasks in the target column (already updated by handleDragOver)
    const colTasks = localTasks
      .filter((t) => t.status === toStatus && t.id !== task.id)
      .sort((a, b) => a.position - b.position);

    // Determine insert index
    let toPosition: number;
    if (overTask && overTask.id !== task.id && overTask.status === toStatus) {
      toPosition = colTasks.findIndex((t) => t.id === overTask.id);
      if (toPosition === -1) toPosition = colTasks.length;
    } else {
      toPosition = colTasks.length;
    }

    // Build new column with proper positions
    const inserted = [...colTasks];
    inserted.splice(toPosition, 0, { ...task, status: toStatus });
    const numbered = inserted.map((t, i) => ({ ...t, position: i }));

    // Apply to full task list
    let updated = localTasks.map((t) => {
      const found = numbered.find((n) => n.id === t.id);
      return found ?? t;
    });

    // Re-number source column if cross-column move
    if (originalStatus && originalStatus !== toStatus) {
      const srcTasks = updated
        .filter((t) => t.status === originalStatus)
        .sort((a, b) => a.position - b.position)
        .map((t, i) => ({ ...t, position: i }));
      updated = updated.map((t) => srcTasks.find((s) => s.id === t.id) ?? t);
    }

    setLocalTasks(updated);

    try {
      await api.patch(`/tasks/${task.id}/position`, {
        status: toStatus,
        position: toPosition,
      });
      onTasksChange(updated);
    } catch {
      setLocalTasks(snapshotTasks);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(e) => void handleDragEnd(e)}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            colId={col.id}
            label={col.label}
            tasks={getColumnTasks(col.id)}
            onEdit={onEdit}
            onDelete={onDelete}
            activeTimers={activeTimers}
            onTimerStart={onTimerStart}
            onTimerStop={onTimerStop}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-1 opacity-90 shadow-2xl">
            <TaskCard task={activeTask} onEdit={onEdit} onDelete={onDelete} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
