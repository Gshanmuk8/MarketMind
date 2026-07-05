"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
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
      <div className="mb-6 flex items-center justify-between">
        <p className="microlabel">{reports.length} in the record</p>
        <div className="flex items-center gap-3">
          {notice && <p className="text-xs text-muted">{notice}</p>}
          <Button size="sm" variant="secondary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            Generate report now
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
        <ol className="border-t border-border">
          {reports.map((report) => (
            <li key={report.id} className="border-b border-border py-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{report.type.toLowerCase()}</Badge>
                <span className="microlabel">
                  {new Date(report.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
                  {new Date(report.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <Badge variant="inference">AI-reasoned</Badge>
              </div>
              <Link href={`/reports/${report.id}`} className="mt-3 block font-sans text-base font-medium hover:underline">
                {report.title}
              </Link>
              <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted">
                {report.executiveSummary}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
