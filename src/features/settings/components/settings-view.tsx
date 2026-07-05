"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Company } from "@prisma/client";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useCurrentUser } from "@/features/auth/hooks/use-auth";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed.");
  }
  return res.json();
}

const STATUS_BADGE: Record<string, "accent" | "live" | "critical" | "default"> = {
  COMPLETE: "accent",
  ANALYZING: "live",
  PENDING: "live",
  FAILED: "critical",
};

/** Account + company workshop: profile, re-analysis, sign out, danger zone. */
export function SettingsView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const { data: user } = useCurrentUser();
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");

  const { data, isPending, isError } = useQuery({
    queryKey: ["companies"],
    queryFn: () => jsonFetch<{ companies: Company[] }>("/api/companies"),
  });

  const reanalyze = useMutation({
    mutationFn: (id: string) =>
      jsonFetch(`/api/companies/${id}`, { method: "PATCH", body: JSON.stringify({ action: "reanalyze" }) }),
    onSuccess: () => {
      setNotice("Re-analysis queued — the dashboard fills in as it completes.");
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e) => setNotice((e as Error).message),
  });

  const changeUrl = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) =>
      jsonFetch(`/api/companies/${id}`, { method: "PATCH", body: JSON.stringify({ url }) }),
    onSuccess: () => {
      setEditingId(null);
      setNewUrl("");
      setNotice("Website changed — a fresh analysis of the new market is running now.");
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e) => setNotice((e as Error).message),
  });

  const removeCompany = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/companies/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
    onError: (e) => setNotice((e as Error).message),
  });

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="rise flex max-w-2xl flex-col gap-14">
      {/* Account */}
      <section>
        <p className="microlabel mb-4">Account</p>
        <div className="border-t border-border">
          <div className="flex items-baseline justify-between border-b border-border py-4">
            <span className="text-sm text-muted">Name</span>
            <span className="text-sm">{(user?.user_metadata?.full_name as string) ?? "—"}</span>
          </div>
          <div className="flex items-baseline justify-between border-b border-border py-4">
            <span className="text-sm text-muted">Email</span>
            <span className="font-data text-sm">{user?.email ?? "—"}</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="mt-5" onClick={handleSignOut}>
          <LogOut className="size-3.5" strokeWidth={1.5} /> Sign out
        </Button>
      </section>

      {/* Company */}
      <section>
        <p className="microlabel mb-4">Company profile</p>
        {isPending ? (
          <Skeleton className="h-24" />
        ) : isError ? (
          <p className="text-sm text-critical">Couldn&apos;t load your company — refresh to retry.</p>
        ) : (data?.companies.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">
            No company yet —{" "}
            <a href="/onboarding" className="text-accent hover:underline">
              add yours
            </a>{" "}
            to begin monitoring.
          </p>
        ) : (
          <div className="border-t border-border">
            {data!.companies.map((company) => (
              <div key={company.id} className="border-b border-border py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-sans text-sm font-medium">{company.name ?? company.domain}</span>
                  <span className="microlabel">{company.domain}</span>
                  <Badge variant={STATUS_BADGE[company.analysisStatus] ?? "default"}>
                    {company.analysisStatus.toLowerCase()}
                  </Badge>
                </div>
                {company.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{company.description}</p>
                )}
                {editingId === company.id && (
                  <form
                    className="mt-4 flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (
                        confirm(
                          "Changing the website clears this company's competitors, signals, and reports (a new market means new intelligence). Your decisions are kept. Continue?"
                        )
                      ) {
                        changeUrl.mutate({ id: company.id, url: newUrl });
                      }
                    }}
                  >
                    <Input
                      autoFocus
                      placeholder="newwebsite.com"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      required
                      className="max-w-xs"
                    />
                    <Button type="submit" size="sm" disabled={changeUrl.isPending}>
                      {changeUrl.isPending ? "Switching…" : "Switch"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </form>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingId(editingId === company.id ? null : company.id);
                      setNewUrl("");
                    }}
                  >
                    Change website
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={reanalyze.isPending}
                    onClick={() => reanalyze.mutate(company.id)}
                  >
                    Re-run analysis
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={removeCompany.isPending}
                    onClick={() => {
                      if (confirm(`Delete ${company.name ?? company.domain} and ALL its intelligence — competitors, signals, reports, decisions? This cannot be undone.`)) {
                        removeCompany.mutate(company.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {notice && <p className="mt-4 text-xs text-muted">{notice}</p>}
      </section>
    </div>
  );
}
