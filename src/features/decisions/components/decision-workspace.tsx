"use client";

import { useState } from "react";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionCard } from "./decision-card";
import { useCompanies, useCreateDecision, useDecisions } from "../hooks/use-decisions";

/** Decision Workspace + Memory log (docs 14–15): open questions first. */
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
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
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
  const memory = decisions.filter((d) => d.status !== "CONSIDERING");
  const company = companiesData?.companies?.[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    create.mutate(
      { companyId: company.id, title, context },
      {
        onSuccess: () => {
          setCreating(false);
          setTitle("");
          setContext("");
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="microlabel">
            Open questions
          </h2>
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
                placeholder="The question — e.g. Should we build voice coaching?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
              />
              <Input
                placeholder="Context — what's prompting this, right now?"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                required
              />
              {create.isError && (
                <p className="text-xs text-critical">{(create.error as Error).message}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={create.isPending}>
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
          <div className="flex flex-col gap-3">
            {open.map((d) => (
              <DecisionCard key={d.id} decision={d} />
            ))}
          </div>
        )}
      </section>

      {memory.length > 0 && (
        <section>
          <h2 className="mb-3 microlabel">
            Decision memory
          </h2>
          <div className="flex flex-col gap-3">
            {memory.map((d) => (
              <DecisionCard key={d.id} decision={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
