import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import api from "@/api/axios";
import type { Invoice, InvoiceItem } from "@/types/invoice";
import { computeTotal, formatMoney } from "@/types/invoice";

interface Client {
  id: string;
  name: string;
  status: string;
}

interface Props {
  invoice?: Invoice; // when editing
  onClose: () => void;
  onSaved: (inv: Invoice) => void;
}

const emptyItem = (): InvoiceItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

export default function InvoiceModal({ invoice, onClose, onSaved }: Props) {
  const isEdit = !!invoice;

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [issueDate, setIssueDate] = useState(
    invoice
      ? invoice.issueDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ? invoice.dueDate.split("T")[0] : "",
  );
  const [currency, setCurrency] = useState<Invoice["currency"]>(
    invoice?.currency ?? "EUR",
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items.length ? invoice.items : [emptyItem()],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Client[]>("/clients")
      .then(({ data }) => {
        const active = data.filter((c) => c.status !== "archived");
        setClients(active);
        if (!clientId && active.length > 0) setClientId(active[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateItem(
    index: number,
    field: keyof InvoiceItem,
    value: string | number,
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      setError("All line items need a description.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        clientId,
        issueDate: new Date(issueDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        currency,
        notes: notes.trim() || undefined,
        items,
      };

      const { data } = isEdit
        ? await api.put<Invoice>(`/invoices/${invoice.id}`, payload)
        : await api.post<Invoice>("/invoices", payload);

      onSaved(data);
    } catch {
      setError("Failed to save invoice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const total = computeTotal(items);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Invoice" : "New Invoice"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xl text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            {/* Client + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Client *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) =>
                    setCurrency(e.target.value as Invoice["currency"])
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Issue Date *
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="mb-1.5 grid grid-cols-[1fr_80px_100px_32px] gap-2 text-xs font-medium text-muted-foreground">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span />
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_80px_100px_32px] gap-2"
                  >
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(i, "description", e.target.value)
                      }
                      placeholder="Description"
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      min={0.01}
                      step={0.01}
                      onChange={(e) =>
                        updateItem(
                          i,
                          "quantity",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="h-9 rounded-md border border-border bg-background px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={item.unitPrice}
                      min={0}
                      step={0.01}
                      onChange={(e) =>
                        updateItem(
                          i,
                          "unitPrice",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="h-9 rounded-md border border-border bg-background px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      className="inline-flex h-9 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-red-500 disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add line
              </button>
            </div>

            {/* Total */}
            <div className="flex justify-end text-sm font-semibold">
              Total: {formatMoney(total, currency)}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes for the client…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {isSaving
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
