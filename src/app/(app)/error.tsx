"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for the authenticated app. Recoverable by design:
 * `reset()` re-renders the segment before falling back to a full reload. We
 * surface a calm message, never a stack trace, and log the digest for triage.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="microlabel text-critical">Something broke</p>
        <h1 className="font-display mt-4 text-3xl leading-tight text-foreground">
          We couldn&apos;t load this view.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          A transient error interrupted this screen. Your data is safe — try again, and if it
          keeps happening, head back to the dashboard.
        </p>
        {error.digest && (
          <p className="font-data mt-4 text-[11px] text-faint">Reference · {error.digest}</p>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
