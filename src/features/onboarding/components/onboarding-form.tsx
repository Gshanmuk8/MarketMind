"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function createCompany(url: string) {
  const res = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

/** The single-input company onboarding form. */
export function OnboardingForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const [url, setUrl] = useState("");

  const mutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      // Decisions ("New question" gating) and Settings read this cache —
      // stale "no company" would disable them for the rest of the session.
      qc.invalidateQueries({ queryKey: ["companies"] });
      router.push("/dashboard");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(url);
      }}
      className="flex flex-col gap-3"
    >
      <div className="relative">
        <Globe className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          className="h-14 pl-10 text-base"
          placeholder="yourcompany.com"
          aria-label="Your company website"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          required
        />
      </div>
      <p className="text-xs text-faint">
        Any form works — yourcompany.com, www.yourcompany.com, or the full link.
      </p>

      {mutation.isError && (
        <p className="text-sm text-critical">{(mutation.error as Error).message}</p>
      )}

      <Button type="submit" size="lg" loading={mutation.isPending}>
        {mutation.isPending ? "Starting analysis…" : "Analyze my market"}
        {!mutation.isPending && <ArrowRight className="size-4" />}
      </Button>

      <p className="text-center text-xs text-faint">
        We only read public information — your data is never shared.
      </p>
    </form>
  );
}
