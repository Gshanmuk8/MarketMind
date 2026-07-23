"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

interface ReportRow {
  id: string;
  title: string;
  type: string;
  executiveSummary: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed.");
  }
  return res.json();
}

/** Report archive with on-demand generation. */
export function ReportList() {
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["reports"],
    queryFn: () => jsonFetch<{ reports: ReportRow[] }>("/api/reports"),
    refetchInterval: 30_000,
  });
  const generate = useMutation({
    mutationFn: () => jsonFetch("/api/reports", { method: "POST" }),
    onSuccess: () => {
      setNotice("Report queued — it appears below in under a minute.");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["reports"] }), 20_000);
    },
    onError: (e) => setNotice((e as Error).message),
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
        <p className="text-sm text-critical">{(error as Error).message}</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  const reports = data.reports;

  return (
    <div className="rise">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="microlabel">{reports.length} in the record</p>
        <div className="flex items-center gap-3">
          {notice && <p className="text-xs text-muted">{notice}</p>}
          <Button size="sm" variant="secondary" onClick={() => generate.mutate()} loading={generate.isPending}>
            {generate.isPending ? "Queuing…" : "Generate report now"}
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Weekly reports generate automatically every Monday once signals are flowing — or generate one now."
        />
      ) : (
        <ol className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {reports.map((report) => (
            <li key={report.id}>
              <Link
                href={`/reports/${report.id}`}
                className="group relative block h-full overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-px hover:border-border-strong/30 hover:shadow-[var(--shadow-lifted)]"
              >
                {/* accent rail — the shared DNA */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-0.5 bg-accent/0 transition-colors duration-200 group-hover:bg-accent"
                />
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="accent">{report.type.toLowerCase()}</Badge>
                  <span className="font-data text-[11px] text-faint">
                    {new Date(report.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
                    {new Date(report.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <Badge variant="inference" className="ml-auto">AI-reasoned</Badge>
                </div>
                <h3 className="font-display mt-3 text-xl leading-snug text-foreground">{report.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                  {report.executiveSummary}
                </p>
                <span className="font-data mt-4 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-accent">
                  Read the brief
                  <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
