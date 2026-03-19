import { PawPrint } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
        <div className="flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PawPrint size={34} />
          </div>
        </div>

        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight">
          Wir sind gleich wieder da
        </h1>
        <p className="mt-3 text-center text-muted-foreground">
          Gerade läuft eine kurze Wartung. Bitte versuch es in ein paar Minuten
          erneut.
        </p>
      </div>
    </div>
  );
}
