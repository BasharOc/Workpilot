import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  Receipt,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Clients im Blick",
    desc: "Alle Kundendaten, Projekte und Rechnungen an einem Ort – übersichtlich und jederzeit abrufbar.",
  },
  {
    icon: Briefcase,
    title: "Projekte & Aufgaben",
    desc: "Behalte den Fortschritt jedes Projekts im Überblick und vergiss keine Deadline mehr.",
  },
  {
    icon: Receipt,
    title: "Rechnungen versenden",
    desc: "Erstelle professionelle Rechnungen in Sekunden und exportiere sie direkt als PDF.",
  },
];

const perks = [
  "Keine monatlichen Gebühren",
  "Einfache Einrichtung in Minuten",
  "Alles in einer App",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img
            src="/workpilot_no_bg.png"
            alt="Workpilot"
            className="h-8 w-8 object-contain"
          />
          <span className="text-lg font-bold tracking-tight">Workpilot</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Anmelden
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Kostenlos starten
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Dein Freelance-Business,{" "}
          <span className="text-primary">endlich organisiert.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Clients, Projekte, Aufgaben und Rechnungen – alles in einem Tool.
          Workpilot wurde für Freelancer gebaut, die sich auf ihre Arbeit
          konzentrieren wollen.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Jetzt loslegen <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold transition hover:bg-muted"
          >
            Einloggen
          </Link>
        </div>

        {/* App Screenshot */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-border shadow-2xl">
          <img
            src="/app-picture.png"
            alt="Workpilot Dashboard"
            className="w-full object-cover object-top"
          />
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Alles was du brauchst – nichts was du nicht brauchst.
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Bereit, loszulegen?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Kostenlos registrieren und in wenigen Minuten starten.
        </p>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {perks.map((p) => (
            <li
              key={p}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {p}
            </li>
          ))}
        </ul>
        <Link
          to="/register"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Kostenlos registrieren <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Workpilot · Freelance Management
      </footer>
    </div>
  );
}
