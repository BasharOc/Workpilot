import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, Printer } from "lucide-react";
import api from "@/api/axios";
import type { Invoice } from "@/types/invoice";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  computeTotal,
  formatMoney,
} from "@/types/invoice";
import InvoiceModal from "@/components/invoices/InvoiceModal";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<Invoice>(`/invoices/${id}`)
      .then(({ data }) => setInvoice(data))
      .catch(() => setInvoice(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleStatusChange(newStatus: Invoice["status"]) {
    if (!invoice) return;
    setIsUpdating(true);
    try {
      const { data } = await api.put<Invoice>(`/invoices/${invoice.id}`, {
        status: newStatus,
      });
      setInvoice(data);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    if (
      !confirm(
        `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`,
      )
    )
      return;
    try {
      await api.delete(`/invoices/${invoice.id}`);
      navigate("/invoices");
    } catch {
      alert("Failed to delete invoice.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium">Invoice not found.</p>
        <Link
          to="/invoices"
          className="text-sm text-primary underline underline-offset-2"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  const total = computeTotal(invoice.items);

  return (
    <>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10 print:px-0 print:py-0">
        <div className="mx-auto max-w-3xl">
          {/* Toolbar — hidden on print */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <Link
              to="/invoices"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              ← All Invoices
            </Link>

            <div className="flex items-center gap-2">
              {/* Status selector */}
              <div className="relative">
                <select
                  value={invoice.status}
                  disabled={isUpdating}
                  onChange={(e) =>
                    void handleStatusChange(e.target.value as Invoice["status"])
                  }
                  className="h-9 appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
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

              {/* Print */}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>

              {/* Edit — only draft */}
              {invoice.status === "draft" && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}

              {/* Delete — only draft */}
              {invoice.status === "draft" && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Invoice document */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
            {/* Doc header */}
            <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border px-8 py-8 print:px-0">
              <div>
                <p className="text-2xl font-bold tracking-tight">INVOICE</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {invoice.invoiceNumber}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[invoice.status]}`}
                >
                  {STATUS_LABELS[invoice.status]}
                </span>
              </div>
            </div>

            {/* Bill to + dates */}
            <div className="grid grid-cols-2 gap-6 px-8 py-6 print:px-0">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bill To
                </p>
                <p className="font-medium">{invoice.client.name}</p>
                {invoice.client.company && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.client.company}
                  </p>
                )}
                {invoice.client.email && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.client.email}
                  </p>
                )}
                {invoice.client.address && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {invoice.client.address}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Issue Date
                  </p>
                  <p className="text-sm">
                    {new Date(invoice.issueDate).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {invoice.dueDate && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Due Date
                    </p>
                    <p className="text-sm">
                      {new Date(invoice.dueDate).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items table */}
            <div className="px-8 print:px-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/40">
                    <th className="py-2.5 text-left font-semibold text-muted-foreground">
                      Description
                    </th>
                    <th className="py-2.5 text-center font-semibold text-muted-foreground">
                      Qty
                    </th>
                    <th className="py-2.5 text-right font-semibold text-muted-foreground">
                      Unit Price
                    </th>
                    <th className="py-2.5 text-right font-semibold text-muted-foreground">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3">{item.description}</td>
                      <td className="py-3 text-center tabular-nums text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">
                        {formatMoney(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="py-3 text-right tabular-nums font-medium">
                        {formatMoney(
                          item.quantity * item.unitPrice,
                          invoice.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end px-8 py-6 print:px-0">
              <div className="w-56 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    {formatMoney(total, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatMoney(total, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t border-border px-8 py-5 print:px-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <InvoiceModal
          invoice={invoice}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setInvoice(updated);
            setEditOpen(false);
          }}
        />
      )}
    </>
  );
}
