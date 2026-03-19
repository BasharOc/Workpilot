import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { usePortalMenu } from "@/hooks/usePortalMenu";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { formatAltShortcut } from "@/utils/shortcuts";
import { EditableCell } from "@/components/EditableCell";
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";

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

const PAGE_SIZE = 7;

export default function ClientsPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [, setError] = useState("");
  const [search, setSearch] = useState("");
  const [emailWarning, setEmailWarning] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inlineEmailError, setInlineEmailError] = useState("");
  const menu = usePortalMenu();
  const inlineEdit = useInlineEdit({
    onSave: async (id, values) => {
      if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        setInlineEmailError("Invalid email address");
        throw new Error("invalid email");
      }
      setInlineEmailError("");
      try {
        await api.put(`/clients/${id}`, values);
      } catch (err) {
        setError("Failed to update client");
        throw err;
      }
    },
    onAfterSave: () => void fetchClients(),
  });

  // Clear email error when user edits the email field
  const updateFieldWithClear = (
    field: Parameters<typeof inlineEdit.updateField>[0],
    value: string,
  ) => {
    if (field === "email") setInlineEmailError("");
    inlineEdit.updateField(field, value);
  };

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

  useGlobalShortcuts([
    {
      code: "KeyN",
      altKey: true,
      enabled: !isAddModalOpen,
      handler: () => {
        setError("");
        setIsAddModalOpen(true);
      },
    },
    {
      code: "KeyF",
      altKey: true,
      handler: () => {
        searchRef.current?.focus();
        searchRef.current?.select();
      },
    },
    {
      code: "KeyA",
      altKey: true,
      enabled: selectedIds.size > 0 && !isAddModalOpen,
      handler: () => {
        void Promise.all(
          [...selectedIds].map((id) =>
            api.put(`/clients/${id}`, { status: "archived" }),
          ),
        ).then(() => {
          setSelectedIds(new Set());
          void fetchClients();
        });
      },
    },
    {
      code: "KeyD",
      altKey: true,
      enabled: selectedIds.size > 0 && !isAddModalOpen,
      handler: () => {
        void Promise.all(
          [...selectedIds].map((id) => api.delete(`/clients/${id}`)),
        ).then(() => {
          setSelectedIds(new Set());
          void fetchClients();
        });
      },
    },
    {
      key: "Escape",
      enabled: selectedIds.size > 0 && !isAddModalOpen,
      handler: () => setSelectedIds(new Set()),
    },
  ]);

  function closeAddModal() {
    setIsAddModalOpen(false);
    setName("");
    setEmail("");
    setCompany("");
    setError("");
    setEmailWarning(false);
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
      setSelectedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      fetchClients();
    } catch {
      setError("Failed to delete client");
    }
  }

  async function handleBulkArchive() {
    await Promise.all(
      [...selectedIds].map((id) =>
        api.put(`/clients/${id}`, { status: "archived" }),
      ),
    );
    setSelectedIds(new Set());
    fetchClients();
  }

  async function handleBulkDelete() {
    await Promise.all(
      [...selectedIds].map((id) => api.delete(`/clients/${id}`)),
    );
    setSelectedIds(new Set());
    fetchClients();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  }

  function toggleSelectAll() {
    if (paginatedActive.every((c) => selectedIds.has(c.id))) {
      setSelectedIds((prev) => {
        const s = new Set(prev);
        paginatedActive.forEach((c) => s.delete(c.id));
        return s;
      });
    } else {
      setSelectedIds((prev) => {
        const s = new Set(prev);
        paginatedActive.forEach((c) => s.add(c.id));
        return s;
      });
    }
  }

  async function handleArchive(id: string) {
    try {
      await api.put(`/clients/${id}`, { status: "archived" });
      menu.close();
      fetchClients();
    } catch {
      setError("Failed to archive client");
    }
  }

  async function handleRestore(id: string) {
    try {
      await api.put(`/clients/${id}`, { status: "inactive" });
      fetchClients();
    } catch {
      setError("Failed to restore client");
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

  const activeClients = clients.filter((c) => c.status !== "archived");
  const archivedClients = clients.filter((c) => c.status === "archived");

  const filteredClients = activeClients.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedActive = filteredClients.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );
  const paginatedArchived = archivedClients.slice(
    (archivedPage - 1) * PAGE_SIZE,
    archivedPage * PAGE_SIZE,
  );

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
        <div className="mb-5 flex items-end justify-between">
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
            title={`Add Client (${formatAltShortcut("N")})`}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <span className="text-base leading-none">+</span>
            Add Client
            <kbd className="rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-xs">
              {formatAltShortcut("N")}
            </kbd>
          </button>
        </div>

        <div className="mb-3">
          <SearchBar
            ref={searchRef}
            value={search}
            onChange={(v) => {
              setSearch(v);
              setActivePage(1);
            }}
            placeholder={`Search by name, email or company… (${formatAltShortcut("F")})`}
          />
        </div>

        <div className="mb-3 flex h-9 items-center justify-between">
          {selectedIds.size > 0 ? (
            <>
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleBulkArchive()}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
                >
                  Archive
                  <span className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-xs text-muted-foreground">
                    {formatAltShortcut("A")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  Delete
                  <span className="rounded border border-red-200 bg-red-100 px-1 py-0.5 font-mono text-xs text-red-500">
                    {formatAltShortcut("D")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="inline-flex h-9 cursor-pointer items-center rounded-md px-2 text-muted-foreground transition hover:bg-muted"
                >
                  ✕
                </button>
              </div>
            </>
          ) : (
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setActivePage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All statuses</option>
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
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
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[3%]" />
                <col className="w-[25%]" />
                <col className="w-[25%]" />
                <col className="w-[21%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="cursor-pointer rounded"
                      checked={
                        paginatedActive.length > 0 &&
                        paginatedActive.every((c) => selectedIds.has(c.id))
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
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
                {filteredClients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      {search.trim()
                        ? "No clients match your search."
                        : "No clients yet."}
                    </td>
                  </tr>
                ) : (
                  paginatedActive.map((c) => (
                    <tr
                      key={c.id}
                      onMouseDown={
                        inlineEdit.editingId === c.id
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                      className={`border-b border-border last:border-b-0 hover:bg-muted/30 ${
                        selectedIds.has(c.id) ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="checkbox"
                          className="cursor-pointer rounded"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
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
                          updateField={updateFieldWithClear}
                          onKeyDown={inlineEdit.handleEditKeyDown}
                          onSave={inlineEdit.handleSave}
                          onStartEdit={() =>
                            inlineEdit.startEditField(c, "email")
                          }
                          error={
                            inlineEdit.editingId === c.id
                              ? inlineEmailError
                              : undefined
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
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm capitalize transition hover:bg-muted ${
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
                              className="h-5 w-5"
                            >
                              <circle cx="12" cy="5" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>
                          {menu.isOpen(`actions-${c.id}`) && (
                            <PortalMenu pos={menu.pos}>
                              <button
                                type="button"
                                onClick={() => {
                                  menu.close();
                                  navigate(`/clients/${c.id}`);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                              >
                                View details
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleArchive(c.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                              >
                                Archive
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  menu.close();
                                  void handleDelete(c.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-muted"
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
          <Pagination
            page={activePage}
            totalPages={Math.ceil(filteredClients.length / PAGE_SIZE)}
            total={filteredClients.length}
            itemLabel="Clients"
            onPageChange={setActivePage}
          />
        </div>

        {archivedClients.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-base font-semibold text-muted-foreground">
              Archived ({archivedClients.length})
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm opacity-70">
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
                    {paginatedArchived.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 py-3 align-middle font-medium text-muted-foreground">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 align-middle text-muted-foreground">
                          {c.email || "-"}
                        </td>
                        <td className="px-4 py-3 align-middle text-muted-foreground">
                          {c.company || "-"}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium capitalize text-red-700">
                            archived
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void handleRestore(c.id)}
                              className="rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(c.id)}
                              className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-muted"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={archivedPage}
                totalPages={Math.ceil(archivedClients.length / PAGE_SIZE)}
                total={archivedClients.length}
                itemLabel="Archived Clients"
                onPageChange={setArchivedPage}
              />
            </div>
          </div>
        )}

        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onKeyDown={(e) => {
              if (e.key === "Escape") closeAddModal();
            }}
          >
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
                  autoFocus
                  placeholder="Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2"
                />
                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailWarning(false);
                  }}
                  onBlur={() => {
                    if (
                      email.trim() &&
                      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                    ) {
                      setEmailWarning(true);
                    } else {
                      setEmailWarning(false);
                    }
                  }}
                  className={`w-full rounded-md border px-3 py-2 ${
                    emailWarning
                      ? "border-amber-400 focus:outline-amber-400"
                      : "border-border"
                  }`}
                />
                {emailWarning && (
                  <p className="-mt-1 text-xs text-amber-600">
                    Are you sure this is a valid email address?
                  </p>
                )}
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
                    className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
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
