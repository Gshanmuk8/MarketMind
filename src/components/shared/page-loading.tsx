import { Spinner } from "@/components/ui/spinner";

/**
 * Full-page loading state, rendered by each route's `loading.tsx` while the
 * server component streams — so every navigation shows a loader, everywhere.
 */
export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[55vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-muted">
        <Spinner className="size-6 text-accent" label={label} />
        <span className="microlabel">{label}</span>
      </div>
    </div>
  );
}
