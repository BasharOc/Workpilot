import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "@/api/axios";
import { usePortalMenu } from "@/hooks/usePortalMenu";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { EditableCell } from "@/components/EditableCell";

// Hook für das Dropdown-Menü, das sowohl für den Status als auch für die Aktionen verwendet wird
function PortalMenu({
  pos,
  children,
}: {
  pos: { top: number; left: number };
  children: React.ReactNode;
}) {
  return createPortal(
    <div
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}

// interface Client entspricht dem Prisma-Modell, angepasst an die Felder, die wir in der UI verwenden
interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [, setError] = useState("");
  const menu = usePortalMenu();
  const inlineEdit = useInlineEdit({
    onSave: async (id, values) => {
      try {
        await api.put(`/clients/${id}`, values);
      } catch (err) {
        setError("Failed to update client");
        throw err;
      }
    },
    onAfterSave: () => void fetchClients(),
  });

  async function fetchClients() {
    try {
      const { data } = await api.get("/clients");
      setClients(data);
    } catch {
      setError("Failed to load clients");
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  function closeAddModal() {
    setIsAddModalOpen(false);
    setName("");
    setEmail("");
    setCompany("");
    setError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      await api.post("/clients", {
        name: name.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
      });
      closeAddModal();
      fetchClients();
    } catch {
      setError("Failed to create client");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/clients/${id}`);
      if (inlineEdit.editingId === id) inlineEdit.stopEdit();
      fetchClients();
    } catch {
      setError("Failed to delete client");
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      await api.put(`/clients/${id}`, { status: newStatus });
      menu.close();
      fetchClients();
    } catch {
      setError("Failed to update status");
    }
  }

  function getStatusClass(status: string) {
    if (status === "active")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "lead") return "bg-blue-50 text-blue-700 border-blue-200";
    if (status === "paused")
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "inactive")
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
    return "bg-red-50 text-red-700 border-red-200"; // archived
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage contacts in a clean, table-first workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <span className="text-base leading-none">+</span>
            Add Client
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[26%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"></th>
                </tr>
              </thead>

              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No clients yet.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr
                      key={c.id}
                      onMouseDown={
                        inlineEdit.editingId === c.id
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                      className="border-b border-border last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 align-middle">
                        <EditableCell
                          clientId={c.id}
                          field="name"
                          displayValue={c.name}
                          isBold
                          editingId={inlineEdit.editingId}
                          activeField={inlineEdit.activeField}
                          editValues={inlineEdit.editValues}
                          isSaving={inlineEdit.isSaving}
                          updateField={inlineEdit.updateField}
                          onKeyDown={inlineEdit.handleEditKeyDown}
                          onSave={inlineEdit.handleSave}
                          onStartEdit={() =>
                            inlineEdit.startEditField(c, "name")
                          }
                        />
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <EditableCell
                          clientId={c.id}
                          field="email"
                          displayValue={c.email}
                          placeholder="Email"
                          editingId={inlineEdit.editingId}
                          activeField={inlineEdit.activeField}
                          editValues={inlineEdit.editValues}
                          isSaving={inlineEdit.isSaving}
                          updateField={inlineEdit.updateField}
                          onKeyDown={inlineEdit.handleEditKeyDown}
                          onSave={inlineEdit.handleSave}
                          onStartEdit={() =>
                            inlineEdit.startEditField(c, "email")
                          }
                        />
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <EditableCell
                          clientId={c.id}
                          field="company"
                          displayValue={c.company}
                          placeholder="Company"
                          editingId={inlineEdit.editingId}
                          activeField={inlineEdit.activeField}
                          editValues={inlineEdit.editValues}
                          isSaving={inlineEdit.isSaving}
                          updateField={inlineEdit.updateField}
                          onKeyDown={inlineEdit.handleEditKeyDown}
                          onSave={inlineEdit.handleSave}
                          onStartEdit={() =>
                            inlineEdit.startEditField(c, "company")
                          }
                        />
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div onMouseDown={(e) => e.stopPropagation()}>
                          <button
                            ref={(el) => {
                              menu.refs.current[`status-${c.id}`] = el;
                            }}
                            type="button"
                            onClick={() => menu.toggle(`status-${c.id}`)}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize transition hover:opacity-80 ${getStatusClass(c.status)}`}
                          >
                            {c.status}
                            <svg
                              className="h-3 w-3 opacity-60"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>

                          {menu.isOpen(`status-${c.id}`) && (
                            <PortalMenu pos={menu.pos}>
                              {(
                                [
                                  "lead",
                                  "active",
                                  "paused",
                                  "inactive",
                                  "archived",
                                ] as const
                              ).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() =>
                                    void handleStatusChange(c.id, s)
                                  }
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs capitalize transition hover:bg-muted ${
                                    c.status === s ? "font-semibold" : ""
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                                      s === "active"
                                        ? "bg-emerald-500"
                                        : s === "lead"
                                          ? "bg-blue-500"
                                          : s === "paused"
                                            ? "bg-amber-500"
                                            : s === "inactive"
                                              ? "bg-zinc-400"
                                              : "bg-red-400"
                                    }`}
                                  />
                                  {s}
                                </button>
                              ))}
                            </PortalMenu>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div
                          className="flex items-center justify-end"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            ref={(el) => {
                              menu.refs.current[`actions-${c.id}`] = el;
                            }}
                            type="button"
                            onClick={() => menu.toggle(`actions-${c.id}`)}
                            className="rounded p-1 text-muted-foreground transition hover:bg-muted"
                            aria-label="More options"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-4 w-4"
                            >
                              <circle cx="12" cy="5" r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>
                          {menu.isOpen(`actions-${c.id}`) && (
                            <PortalMenu pos={menu.pos}>
                              <button
                                type="button"
                                onClick={() => {
                                  menu.close();
                                  void handleDelete(c.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 transition hover:bg-muted"
                              >
                                Delete
                              </button>
                            </PortalMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-lg font-semibold cursor-pointer">
                  Add Client
                </h2>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-md text-2xl leading-none text-muted-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-3 px-5 py-4">
                <input
                  placeholder="Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2"
                />
                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2"
                />
                <input
                  placeholder="Company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
