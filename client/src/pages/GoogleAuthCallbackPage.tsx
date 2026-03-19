import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

export default function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const completeOAuth = useAuthStore((s) => s.completeOAuth);
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const oauthError = searchParams.get("error");
    const isNewUser = searchParams.get("isNewUser") === "1";

    if (oauthError) {
      setError(oauthError);
      return;
    }

    if (!accessToken) {
      setError("Google login failed. Please try again.");
      return;
    }

    completeOAuth(accessToken, isNewUser)
      .then(() => {
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        setError("Google login failed. Please try again.");
      });
  }, [completeOAuth, navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        {error ? (
          <>
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Finishing Google sign-in...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
