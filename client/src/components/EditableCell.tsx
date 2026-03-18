import type { EditableField } from "@/hooks/useInlineEdit";

interface EditableCellProps {
  clientId: string;
  field: EditableField;
  displayValue: string | null;
  placeholder?: string;
  isBold?: boolean;
  editingId: string | null;
  activeField: EditableField | null;
  editValues: { name: string; email: string; company: string };
  isSaving: (id: string, field: EditableField) => boolean;
  updateField: (field: EditableField, value: string) => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: string,
    field: EditableField,
  ) => void;
  onSave: (id: string, field: EditableField) => Promise<void>;
  onStartEdit: () => void;
}

export function EditableCell({
  clientId,
  field,
  displayValue,
  placeholder,
  isBold = false,
  editingId,
  activeField,
  editValues,
  isSaving,
  updateField,
  onKeyDown,
  onSave,
  onStartEdit,
}: EditableCellProps) {
  const isEditing = editingId === clientId && activeField === field;
  const saving = isSaving(clientId, field);

  if (isEditing) {
    return (
      <div className="relative">
        <input
          autoFocus
          value={editValues[field]}
          onChange={(e) => updateField(field, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, clientId, field)}
          onBlur={() => void onSave(clientId, field)}
          placeholder={placeholder}
          className={`w-full bg-transparent p-0 pr-5 outline-none border-0 border-b border-foreground/40 focus:border-foreground/70 ${
            isBold ? "font-medium" : "text-muted-foreground"
          }`}
        />
        {saving && (
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg
              className="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.25"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      onClick={onStartEdit}
      className={`block w-full cursor-text ${isBold ? "font-medium" : "text-muted-foreground"}`}
    >
      {displayValue || "-"}
    </span>
  );
}
