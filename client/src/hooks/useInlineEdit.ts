import { useRef, useState } from "react";

export type EditableField = "name" | "email" | "company";

type EditValues = { name: string; email: string; company: string };

interface UseInlineEditOptions {
  onSave: (id: string, values: EditValues) => Promise<void>;
  onAfterSave?: () => void;
}

export function useInlineEdit({ onSave, onAfterSave }: UseInlineEditOptions) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    name: "",
    email: "",
    company: "",
  });
  const [savingField, setSavingField] = useState<{
    id: string;
    field: EditableField;
  } | null>(null);
  const isSavingRef = useRef(false);

  function stopEdit() {
    setEditingId(null);
    setActiveField(null);
  }

  function startEditField(
    client: { id: string; name: string; email: string | null; company: string | null },
    field: EditableField,
  ) {
    setEditingId(client.id);
    setActiveField(field);
    setEditValues({
      name: client.name,
      email: client.email ?? "",
      company: client.company ?? "",
    });
  }

  function updateField(field: EditableField, value: string) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(id: string, field: EditableField) {
    if (isSavingRef.current) return;

    const trimmedName = editValues.name.trim();
    if (!trimmedName) {
      stopEdit();
      return;
    }

    isSavingRef.current = true;
    setSavingField({ id, field });

    try {
      await onSave(id, {
        name: trimmedName,
        email: editValues.email.trim(),
        company: editValues.company.trim(),
      });
      stopEdit();
      onAfterSave?.();
    } catch {
      // onSave ist für die Fehleranzeige verantwortlich; Edit-Mode bleibt offen
    } finally {
      isSavingRef.current = false;
      setSavingField(null);
    }
  }

  function handleEditKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string,
    field: EditableField,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSave(id, field);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (!isSavingRef.current) stopEdit();
    }
  }

  function isSaving(id: string, field: EditableField) {
    return savingField?.id === id && savingField.field === field;
  }

  return {
    editingId,
    activeField,
    editValues,
    startEditField,
    stopEdit,
    updateField,
    handleSave,
    handleEditKeyDown,
    isSaving,
  };
}
