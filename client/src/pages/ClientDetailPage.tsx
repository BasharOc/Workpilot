import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/api/axios";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  budget: string | null;
}

function getProjectStatusClass(status: string) {
  if (status === "in_progress")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "planned") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "completed")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "on_hold") return "bg-zinc-100 text-zinc-600 border-zinc-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function getProjectStatusLabel(status: string) {
  const map: Record<string, string> = {
    planned: "Planned",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

type EditValues = {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
  status: string;
};

function getStatusClass(status: string) {
  if (status === "active")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "lead") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "paused") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "inactive") return "bg-zinc-100 text-zinc-700 border-zinc-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editValues, setEditValues] = useState<EditValues>({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    notes: "",
    status: "",
  });

  useEffect(() => {
    async function fetchClient() {
      try {
        const [clientRes, projectsRes] = await Promise.all([
          api.get(`/clients/${id}`),
          api.get(`/clients/${id}/projects`),
        ]);
        setClient(clientRes.data);
        setProjects(projectsRes.data);
      } catch {
        setError("Client not found");
      } finally {
        setIsLoading(false);
      }
    }
    void fetchClient();
  }, [id]);

  function startEdit() {
    if (!client) return;
    setEditValues({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      company: client.company ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
      status: client.status,
    });
    setIsEditing(true);
    setError("");
  }

  function cancelEdit() {
    setIsEditing(false);
    setError("");
  }

  async function handleSave() {
    if (!editValues.name.trim()) {
      setError("Name is required");
      return;
    }
    if (
      editValues.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editValues.email)
    ) {
      setError("Invalid email address");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const { data } = await api.put(`/clients/${id}`, {
        name: editValues.name.trim(),
        email: editValues.email.trim() || null,
        phone: editValues.phone.trim() || null,
        company: editValues.company.trim() || null,
        address: editValues.address.trim() || null,
        notes: editValues.notes.trim() || null,
        status: editValues.status,
      });
      setClient(data);
      setIsEditing(false);
    } catch {
      setError("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Client not found.</p>
        <Link to="/clients" className="text-sm text-primary underline">
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            to="/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Clients
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.name}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusClass(client.status)}`}
              >
                {client.status}
              </span>
              {client.company && (
                <span className="text-sm text-muted-foreground">
                  {client.company}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="inline-flex h-9 cursor-pointer items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition hover:bg-muted"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Contact Info */}
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Contact Info
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            <InfoField
              label="Name"
              value={client.name}
              editing={isEditing}
              editValue={editValues.name}
              onChange={(v) => setEditValues((p) => ({ ...p, name: v }))}
            />
            <InfoField
              label="Email"
              value={client.email}
              editing={isEditing}
              editValue={editValues.email}
              inputType="email"
              onChange={(v) => setEditValues((p) => ({ ...p, email: v }))}
            />
            <InfoField
              label="Phone"
              value={client.phone}
              editing={isEditing}
              editValue={editValues.phone}
              inputType="tel"
              onChange={(v) => setEditValues((p) => ({ ...p, phone: v }))}
            />
            <InfoField
              label="Company"
              value={client.company}
              editing={isEditing}
              editValue={editValues.company}
              onChange={(v) => setEditValues((p) => ({ ...p, company: v }))}
            />
            <InfoField
              label="Address"
              value={client.address}
              editing={isEditing}
              editValue={editValues.address}
              onChange={(v) => setEditValues((p) => ({ ...p, address: v }))}
              span2
            />
          </dl>
        </div>

        {/* Status (nur im Edit-Modus) */}
        {isEditing && (
          <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </h2>
            </div>
            <div className="px-5 py-4">
              <select
                value={editValues.status}
                onChange={(e) =>
                  setEditValues((p) => ({ ...p, status: e.target.value }))
                }
                className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h2>
          </div>
          <div className="px-5 py-4">
            {isEditing ? (
              <textarea
                rows={4}
                value={editValues.notes}
                onChange={(e) =>
                  setEditValues((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Add a note…"
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : client.notes ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {client.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </div>
        </div>

        {/* Projects */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Projects ({projects.length})
            </h2>
            <Link
              to={`/projects?clientId=${client.id}`}
              className="text-xs text-primary transition hover:underline"
            >
              View all
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 transition hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      {p.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Due{" "}
                          {new Date(p.deadline).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`ml-3 shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getProjectStatusClass(p.status)}`}
                    >
                      {getProjectStatusLabel(p.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 text-right text-xs text-muted-foreground">
          Client since{" "}
          {new Date(client.createdAt).toLocaleDateString("de-DE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value: string | null | undefined;
  editing: boolean;
  editValue: string;
  onChange: (v: string) => void;
  inputType?: string;
  span2?: boolean;
}

function InfoField({
  label,
  value,
  editing,
  editValue,
  onChange,
  inputType = "text",
  span2,
}: InfoFieldProps) {
  return (
    <div
      className={`border-b border-border px-5 py-3.5 last:border-b-0 ${span2 ? "sm:col-span-2" : ""}`}
    >
      <dt className="mb-1 text-xs font-medium text-muted-foreground">
        {label}
      </dt>
      <dd>
        {editing ? (
          <input
            type={inputType}
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <span className="text-sm text-foreground">
            {value || <span className="text-muted-foreground">—</span>}
          </span>
        )}
      </dd>
    </div>
  );
}
