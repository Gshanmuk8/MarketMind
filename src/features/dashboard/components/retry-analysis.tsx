"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Retry a FAILED analysis in place. Re-onboarding can't do this — the
 * company already exists, so the onboarding form would just 409.
 */
export function RetryAnalysis({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reanalyze" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string" ? data.error : "Retry failed. Please try again."
        );
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={retry}
        disabled={pending}
        className="underline hover:text-foreground disabled:opacity-50"
      >
        {pending ? "Retrying…" : "Try again"}
      </button>
      {error && <span className="ml-2 text-critical">{error}</span>}
    </span>
  );
}
