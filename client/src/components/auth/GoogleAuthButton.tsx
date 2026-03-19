function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.7h5.39a4.61 4.61 0 0 1-2 3.03v2.52h3.24c1.9-1.76 2.97-4.34 2.97-7.29Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.75-5.6-4.1H3.05v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9A6 6 0 0 1 6.08 12c0-.66.11-1.3.32-1.9V7.5H3.05A10 10 0 0 0 2 12c0 1.61.39 3.13 1.05 4.4l3.35-2.5Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.97c1.47 0 2.8.5 3.84 1.48l2.88-2.88C16.95 2.91 14.7 2 12 2A10 10 0 0 0 3.05 7.5l3.35 2.6c.79-2.36 3-4.13 5.6-4.13Z"
      />
    </svg>
  );
}

export default function GoogleAuthButton({
  label,
}: {
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = "/api/auth/google";
      }}
      className="flex h-10 w-full items-center justify-center gap-3 rounded-md border border-input bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted"
    >
      <GoogleLogo />
      {label}
    </button>
  );
}
