import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import MaintenancePage from "@/pages/MaintenancePage";
import ClientsPage from "@/pages/ClientsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function DashboardPlaceholder() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-primary">FreelanceFlow</h1>
      <p className="text-muted-foreground">
        Welcome, {user?.first_name} {user?.last_name}!
      </p>
      <Link
        to="/clients"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Clients
      </Link>
      <button
        onClick={logout}
        className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
      >
        Sign out
      </button>
    </div>
  );
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    let isMounted = true;

    async function ping() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 1500);

      try {
        const res = await fetch("/api/health", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!isMounted) return;
        setBackendUp(res.ok);
      } catch {
        if (!isMounted) return;
        setBackendUp(false);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    // Sofort prüfen und dann alle 2 Sekunden erneut.
    ping();
    const interval = window.setInterval(ping, 2000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  // Wenn das Backend down ist, zeigen wir eine Wartungsseite.
  if (backendUp === false) {
    return <MaintenancePage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPlaceholder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
