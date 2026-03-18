interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  itemLabel = "items",
  onPageChange,
}: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-end gap-4 border-t border-border px-4 py-3 text-sm">
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded px-2 py-1 text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`el-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`rounded px-2.5 py-1 transition ${
                  p === page
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded px-2 py-1 text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}
      <span className="text-muted-foreground">
        {total} {itemLabel}
      </span>
    </div>
  );
}
