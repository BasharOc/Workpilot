import { useState } from "react";
import {
  LogOut,
  User as UserIcon,
  Mail,
  CalendarDays,
  KeyRound,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

const CONFIRM_PHRASE = "Account löschen!";

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (confirmText !== CONFIRM_PHRASE) return;
    setIsDeleting(true);
    try {
      await api.delete("/auth/account");
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setIsDeleting(false);
    }
  }

  if (!user) return null;

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  const joined = new Date(user.createdAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      {/* Avatar + Name */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Kontoinformationen
        </h2>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground w-24 shrink-0">Name</span>
            <span className="font-medium">
              {user.firstName} {user.lastName}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground w-24 shrink-0">E-Mail</span>
            <span className="font-medium">{user.email}</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground w-24 shrink-0">
              Dabei seit
            </span>
            <span className="font-medium">{joined}</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Sitzung
        </h2>
        <div className="space-y-2">
          <button
            onClick={() =>
              navigate(
                `/forgot-password?email=${encodeURIComponent(user.email)}`,
              )
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            <KeyRound className="h-4 w-4" />
            Passwort ändern
          </button>
          <button
            onClick={() => void logout()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-card p-5 dark:border-red-900/40">
        <h2 className="mb-1 text-sm font-semibold text-red-600 uppercase tracking-wide dark:text-red-400">
          Gefahrenzone
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Dein Account und alle zugehörigen Daten werden unwiderruflich
          gelöscht. Tippe{" "}
          <span className="font-mono font-semibold text-foreground">
            {CONFIRM_PHRASE}
          </span>{" "}
          um fortzufahren.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400"
        />
        <button
          onClick={() => void handleDeleteAccount()}
          disabled={confirmText !== CONFIRM_PHRASE || isDeleting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Wird gelöscht…" : "Account unwiderruflich löschen"}
        </button>
      </div>
    </div>
  );
}
