import { useEffect, useState } from "react";
import api from "@/api/axios";

type EditableField = "name" | "email" | "company";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [editValues, setEditValues] = useState({
    name: "",
    email: "",
    company: "",
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

  async function handleAdd(e: React.FormEvent) {
    //Verhinder den Seitenreload
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    // .trim() entfernt überflüssige Leerzeichen
    try {
      await api.post("/clients", {
        name: name.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
      });
      setName("");
      setEmail("");
      setCompany("");
      fetchClients();
    } catch {
      setError("Failed to create client");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch {
      setError("Failed to delete client");
    }
  }

  function startEdit(client: Client) {
    setError("");
    setEditingId(client.id);
    setActiveField(null);
    setEditValues({
      name: client.name,
      email: client.email ?? "",
      company: client.company ?? "",
    });
  }

  function stopEdit() {
    setEditingId(null);
    setActiveField(null);
  }

  async function handleSave(id: string) {
    const trimmedName = editValues.name.trim();

    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    try {
      await api.put(`/clients/${id}`, {
        name: trimmedName,
        email: editValues.email.trim() || "",
        company: editValues.company.trim() || "",
      });
      stopEdit();
      fetchClients();
    } catch {
      setError("Failed to update client");
    }
  }

  function handleEditKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSave(id);
    }
  }

  function updateField(field: EditableField, value: string) {
    setEditValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Clients</h1>

      <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2">
        <input
          placeholder="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Add Client
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {clients.length === 0 ? (
        <p className="text-muted-foreground">No clients yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clients.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded border px-4 py-3"
            >
              <div className="min-w-0 flex-1 pr-4">
                {editingId === c.id && activeField === "name" ? (
                  <input
                    autoFocus
                    value={editValues.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, c.id)}
                    onBlur={() => setActiveField(null)}
                    className="w-full rounded border px-2 py-1 font-medium"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      editingId === c.id ? setActiveField("name") : undefined
                    }
                    className="w-full text-left font-medium"
                  >
                    {editingId === c.id
                      ? editValues.name || "(No name)"
                      : c.name}
                  </button>
                )}

                {editingId === c.id && activeField === "company" ? (
                  <input
                    autoFocus
                    value={editValues.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, c.id)}
                    onBlur={() => setActiveField(null)}
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    placeholder="Company"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      editingId === c.id ? setActiveField("company") : undefined
                    }
                    className="mt-1 w-full text-left text-sm text-muted-foreground"
                  >
                    {editingId === c.id
                      ? editValues.company || "Company"
                      : c.company || "Company"}
                  </button>
                )}

                {editingId === c.id && activeField === "email" ? (
                  <input
                    autoFocus
                    value={editValues.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, c.id)}
                    onBlur={() => setActiveField(null)}
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    placeholder="Email"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      editingId === c.id ? setActiveField("email") : undefined
                    }
                    className="mt-1 w-full text-left text-sm text-muted-foreground"
                  >
                    {editingId === c.id
                      ? editValues.email || "Email"
                      : c.email || "Email"}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {editingId === c.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave(c.id)}
                      className="text-sm text-green-700 hover:underline"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={stopEdit}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label={`Edit ${c.name}`}
                    title="Edit client"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M12 20h9" />
                      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
