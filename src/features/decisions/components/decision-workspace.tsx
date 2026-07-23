"use client";

import { useState } from "react";
import type { Decision } from "@prisma/client";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionCard } from "./decision-card";
import { useCompanies, useCreateDecision, useDecisions } from "../hooks/use-decisions";

const NODE_COLOR: Record<Decision["status"], string> = {
  CONSIDERING: "var(--color-live)",
  DECIDED: "var(--color-accent)",
  REVISIT: "var(--color-warning)",
  REVERSED: "var(--color-faint)",
};

/** The War Room (docs 14–15): open questions to decide, then the record of the past. */
export function DecisionWorkspace() {
  const { data, isLoading, isError, refetch } = useDecisions();
  const { data: companiesData } = useCompanies();
  const create = useCreateDecision();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  // A failed load must never masquerade as "no decisions" — the founder's
  // decision memory looking wiped is far worse than an error message.
  if (isError) {
    return (
      <EmptyState
        icon={Scale}
        eyebrow="Something went wrong"
        title="Couldn't load your decisions"
        description="Your decision memory is safe — this is a loading problem, not data loss."
        action={
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const decisions = data?.decisions ?? [];
  const open = decisions.filter((d) => d.status === "CONSIDERING");
  const record = decisions
    .filter((d) => d.status !== "CONSIDERING")
    .sort(
      (a, b) =>
        new Date(b.decidedAt ?? b.updatedAt).getTime() - new Date(a.decidedAt ?? a.updatedAt).getTime()
    );
  const company = companiesData?.companies?.[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    create.mutate(
      { companyId: company.id, title, context },
      { onSuccess: () => { setCreating(false); setTitle(""); setContext(""); } }
    );
  }

  return (
    <div className="flex flex-col gap-14">
      {/* Open questions — the front of the war room */}
      <section>
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-baseline gap-3">
            <h2 className="microlabel">Open questions</h2>
            {open.length > 0 && <span className="font-data text-xs text-faint">{open.length} live</span>}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCreating(true)}
            disabled={!company}
            title={company ? undefined : "Add your company first (onboarding)"}
          >
            <Plus className="size-3.5" /> New question
          </Button>
        </div>

        {creating && (
          <Card className="mb-4">
            <form onSubmit={submit} className="flex flex-col gap-2">
              <Input
                autoFocus
                aria-label="Decision question"
                placeholder="The question — e.g. Should we build voice coaching?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
              />
              <Input
                aria-label="Context for this decision"
                placeholder="Context — what's prompting this, right now?"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                required
              />
              {create.isError && <p className="text-xs text-critical">{(create.error as Error).message}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={create.isPending}>
                  Open question
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {open.length === 0 && !creating ? (
          <EmptyState
            icon={Scale}
            title="No open questions"
            description="Frame a strategic question and gather evidence before you decide. Signals and insights can be attached as evidence."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {open.map((d) => (
              <DecisionCard key={d.id} decision={d} />
            ))}
          </div>
        )}
      </section>

      {/* Decision record — the timeline of what was decided and how it played out */}
      {record.length > 0 && (
        <section>
          <div className="mb-6 flex items-baseline gap-3 border-b border-border pb-3">
            <h2 className="microlabel">Decision record</h2>
            <span className="font-data text-xs text-faint">{record.length} on the books</span>
          </div>

          <div className="relative">
            {/* the rail */}
            <span aria-hidden className="absolute bottom-3 left-[6px] top-3 w-px bg-border" />
            <div className="flex flex-col gap-6">
              {record.map((d) => (
                <div key={d.id} className="grid grid-cols-[14px_1fr] gap-5">
                  <div className="relative flex justify-start">
                    <span
                      aria-hidden
                      className="mt-5 size-3.5 rounded-full border-2 bg-background"
                      style={{ borderColor: NODE_COLOR[d.status] }}
                    />
                  </div>
                  <DecisionCard decision={d} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
