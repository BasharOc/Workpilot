import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "@/api/axios";

type Screen = "email" | "otp" | "success";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("email");

  // Screen 1
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // Screen 2
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setSendError("");
    if (!email.trim()) {
      setSendError("Bitte E-Mail eingeben.");
      return;
    }
    setIsSending(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setScreen("otp");
    } catch {
      setSendError("Fehler beim Senden. Bitte versuche es erneut.");
    } finally {
      setIsSending(false);
    }
  }

  function handleOtpInput(i: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("");
    const next = [...otp];
    digits.forEach((d, idx) => {
      if (idx < 6) next[idx] = d;
    });
    setOtp(next);
    const lastFilled = Math.min(digits.length, 5);
    inputRefs.current[lastFilled]?.focus();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    const code = otp.join("");
    if (code.length < 6) {
      setResetError("Bitte 6-stelligen Code eingeben.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setIsResetting(true);
    try {
      await api.post("/auth/reset-password", { email, otp: code, newPassword });
      setScreen("success");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setResetError(
        msg || "Fehler beim Zurücksetzen. Bitte versuche es erneut.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  async function handleResend() {
    setSendError("");
    setOtp(["", "", "", "", "", ""]);
    setResetError("");
    setIsSending(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } catch {
      // silent - always show same message
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Screen 1: E-Mail eingeben */}
        {screen === "email" && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Passwort vergessen?
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Gib deine E-Mail-Adresse ein. Wir senden dir einen 6-stelligen
              Bestätigungscode.
            </p>

            <form onSubmit={handleSendCode} className="mt-6 space-y-4">
              <input
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {sendError && <p className="text-xs text-red-600">{sendError}</p>}
              <button
                type="submit"
                disabled={isSending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {isSending && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                )}
                {isSending ? "Wird gesendet…" : "Code senden"}
              </button>
            </form>

            <Link
              to="/login"
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück zum Login
            </Link>
          </div>
        )}

        {/* Screen 2: OTP + neues Passwort */}
        {screen === "otp" && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Code eingeben
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Wir haben einen Code an{" "}
              <span className="font-medium text-foreground">{email}</span>{" "}
              gesendet. Er ist 15 Minuten gültig.
            </p>

            <form onSubmit={handleResetPassword} className="mt-6 space-y-5">
              {/* OTP inputs */}
              <div
                className="flex justify-between gap-2"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={i === 0}
                    onChange={(e) => handleOtpInput(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-12 w-12 rounded-lg border border-border bg-background text-center text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ))}
              </div>

              {/* New password */}
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Neues Passwort (min. 8 Zeichen)"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {resetError && (
                <p className="text-xs text-red-600">{resetError}</p>
              )}

              <button
                type="submit"
                disabled={isResetting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {isResetting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                )}
                {isResetting ? "Wird gespeichert…" : "Passwort ändern"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setScreen("email")}
                className="flex items-center gap-1.5 transition hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                E-Mail ändern
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleResend}
                className="transition hover:text-foreground disabled:opacity-50"
              >
                {isSending ? "Wird gesendet…" : "Code erneut senden"}
              </button>
            </div>
          </div>
        )}

        {/* Screen 3: Erfolg */}
        {screen === "success" && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Passwort geändert!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Dein Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt
              damit anmelden.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Zum Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
