import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Users,
  Briefcase,
  CheckSquare2,
  Receipt,
  Rocket,
  ArrowRight,
  X,
} from "lucide-react";
import api from "@/api/axios";

interface OnboardingWizardProps {
  onClose: () => void;
}

const steps = [
  {
    icon: Sparkles,
    iconBg:
      "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    title: "Willkommen bei Workpilot!",
    description:
      "Dein All-in-One Dashboard für Freelancer. Verwalte Clients, Projekte, Aufgaben und Rechnungen – alles an einem Ort.",
    hint: null,
  },
  {
    icon: Users,
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    title: "Clients",
    description:
      "Clients sind deine Auftraggeber. Du speicherst Kontaktdaten, Firma, Notizen und den Status (aktiv, inaktiv, Lead) – damit du immer den Überblick behältst.",
    hint: 'Starte mit deinem ersten Client unter "Clients" in der Seitenleiste.',
  },
  {
    icon: Briefcase,
    iconBg:
      "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
    title: "Projekte",
    description:
      "Weise jedem Client Projekte zu. Ein Projekt hat einen Status (Planned, In Progress, …), ein Budget und eine Deadline. Der Fortschrittsbalken zeigt dir, wie viele Tasks erledigt sind.",
    hint: 'Projekte findest du unter "Projects" oder direkt in der Client-Detailansicht.',
  },
  {
    icon: CheckSquare2,
    iconBg:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    title: "Tasks & Zeit",
    description:
      "Innerhalb eines Projekts verwaltest du Aufgaben im Kanban-Board oder als Liste. Jede Aufgabe hat eine Priorität und einen Status. Du kannst einen Timer direkt am Task starten – die Zeit wird automatisch erfasst.",
    hint: 'Wechsle in "Tasks" und waehle ein Projekt, um loszulegen.',
  },
  {
    icon: Receipt,
    iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    title: "Rechnungen",
    description:
      "Erstelle Rechnungen für deine Clients, füge Positionen hinzu und verfolge den Zahlungsstatus (Entwurf → Versendet → Bezahlt). Du kannst jede Rechnung direkt als PDF exportieren.",
    hint: 'Gehe zu "Invoices", um deine erste Rechnung zu erstellen.',
  },
  {
    icon: Rocket,
    iconBg: "bg-primary/10 text-primary",
    title: "Bereit zum Loslegen!",
    description:
      "Du kannst sofort starten – oder Demo-Daten laden, um Workpilot direkt mit echten Beispielen auszuprobieren. Die Demo erstellt einen Musterclient, ein Projekt, Aufgaben und eine Rechnung.",
    hint: null,
  },
];

export default function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState("");
  const navigate = useNavigate();

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  async function handleLoadDemo() {
    setIsLoadingDemo(true);
    setDemoError("");
    try {
      await api.post("/auth/seed-demo");
      onClose();
      navigate("/dashboard");
      // Small delay so dashboard loads fresh data
      setTimeout(() => window.location.reload(), 100);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Demo-Daten konnten nicht geladen werden.";
      setDemoError(msg);
    } finally {
      setIsLoadingDemo(false);
    }
  }

  function handleSkipOrFinish() {
    onClose();
  }

  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={handleSkipOrFinish}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="px-8 pb-6 pt-8">
          {/* Icon */}
          <div
            className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${current.iconBg}`}
          >
            <Icon className="h-7 w-7" />
          </div>

          {/* Text */}
          <h2 className="text-xl font-semibold tracking-tight">
            {current.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>

          {current.hint && (
            <div className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm text-foreground/70">
              {current.hint}
            </div>
          )}

          {/* Last step: Demo-Daten option */}
          {isLast && (
            <div className="mt-5 space-y-2">
              {demoError && <p className="text-xs text-red-600">{demoError}</p>}
              <button
                type="button"
                onClick={handleLoadDemo}
                disabled={isLoadingDemo}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {isLoadingDemo ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Demo-Daten werden geladen…
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Demo-Daten laden
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSkipOrFinish}
                className="flex w-full items-center justify-center rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Ohne Demo starten
              </button>
            </div>
          )}
        </div>

        {/* Footer: progress + navigation */}
        <div className="flex items-center justify-between border-t border-border px-8 py-4">
          {/* Dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === step
                    ? "w-5 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Schritt ${i + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Zurück
              </button>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {isFirst ? "Tour starten" : "Weiter"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
