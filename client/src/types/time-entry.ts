export interface TimeEntry {
  id: string;
  taskId: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  task?: { id: string; title: string };
}

/** Formatiert Sekunden als "Xh Ym" oder "Ym Zs" oder "Zs" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
