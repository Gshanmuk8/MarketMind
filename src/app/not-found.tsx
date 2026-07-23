import Link from "next/link";

/**
 * 404 — kept in the editorial register: a hairline eyebrow, a large serif
 * statement, and one clear way back. No illustration, no noise.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <p className="microlabel text-faint">Error · 404</p>
        <h1 className="display-2 mt-4 text-foreground">This page isn&apos;t on the map.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The link may be old, or the intelligence you&apos;re after has moved. Let&apos;s get
          you back to the workspace.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md bg-ink-wash px-6 text-sm font-medium text-background shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-px hover:bg-foreground"
          >
            Back to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
