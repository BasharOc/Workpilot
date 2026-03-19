import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import api from "@/api/axios";
import type { Invoice } from "@/types/invoice";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  computeTotal,
  formatMoney,
} from "@/types/invoice";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { formatAltShortcut } from "@/utils/shortcuts";
import InvoiceModal from "@/components/invoices/InvoiceModal";

export default function InvoicesPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useGlobalShortcuts([
    {
      code: "KeyN",
      altKey: true,
      enabled: !modalOpen,
      handler: () => setModalOpen(true),
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

  async function fetchInvoices() {
    try {
      const { data } = await api.get<Invoice[]>("/invoices");
      setInvoices(data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchInvoices();
  }, []);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.client.name.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function getStatusChip(status: Invoice["status"]) {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
      >
        {STATUS_LABELS[status]}
      </span>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Invoices
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create and manage client invoices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              title={`Add Invoice (${formatAltShortcut("N")})`}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Invoice
              <kbd className="rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-xs">
                {formatAltShortcut("N")}
              </kbd>
            </button>
          </div>

          {/* Search */}
          <div className="mb-3">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search by invoice number or client… (${formatAltShortcut("F")})`}
                className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Filter row */}
          <div className="mb-3 flex items-center justify-end gap-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
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

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {filtered.length === 0 ? (
              <div className="px-4 py-16 text-center text-muted-foreground">
                {invoices.length === 0
                  ? "No invoices yet. Create your first invoice."
                  : "No invoices match your search."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[24%]" />
                    <col className="w-[13%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Invoice #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Issued
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => {
                      const total = computeTotal(inv.items);
                      const isOverdue =
                        inv.dueDate &&
                        inv.status !== "paid" &&
                        inv.status !== "cancelled" &&
                        new Date(inv.dueDate) < new Date();
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-medium">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {inv.client.name}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusChip(inv.status)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            {formatMoney(total, inv.currency)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(inv.issueDate).toLocaleDateString(
                              "de-DE",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}
                          >
                            {inv.dueDate
                              ? new Date(inv.dueDate).toLocaleDateString(
                                  "de-DE",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-border px-4 py-2 text-right text-xs text-muted-foreground">
              {filtered.length} Invoice{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <InvoiceModal
          onClose={() => setModalOpen(false)}
          onSaved={(inv) => {
            setInvoices((prev) => [inv, ...prev]);
            setModalOpen(false);
            navigate(`/invoices/${inv.id}`);
          }}
        />
      )}
    </>
  );
}
