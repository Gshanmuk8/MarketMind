"use client";

import { useState } from "react";
import type { Decision } from "@prisma/client";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDeleteDecision, useUpdateDecision } from "../hooks/use-decisions";

const STATUS_BADGE: Record<
  Decision["status"],
  { label: string; variant: "live" | "accent" | "warning" | "default" }
> = {
  CONSIDERING: { label: "Considering", variant: "live" },
  DECIDED: { label: "Decided", variant: "accent" },
  REVISIT: { label: "Revisit", variant: "warning" },
  REVERSED: { label: "Reversed", variant: "default" },
};

const OUTCOME_LABEL: Record<Decision["outcome"], string> = {
  PENDING: "Outcome pending",
  VALIDATED: "Validated",
  MIXED: "Mixed",
  REGRETTED: "Regretted",
};

export function DecisionCard({ decision }: { decision: Decision }) {
  const update = useUpdateDecision();
  const remove = useDeleteDecision();

  const [deciding, setDeciding] = useState(false);
  const [choice, setChoice] = useState("");
  const [rationale, setRationale] = useState("");

  const status = STATUS_BADGE[decision.status];
  const evidenceCount = Array.isArray(decision.evidence) ? decision.evidence.length : 0;

  function submitDecision(e: React.FormEvent) {
    e.preventDefault();
    update.mutate(
      { id: decision.id, status: "DECIDED", choice, rationale },
      { onSuccess: () => setDeciding(false) }
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{decision.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{decision.context}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Button
            variant="ghost"
            size="sm"
            loading={remove.isPending}
            onClick={() => remove.mutate(decision.id)}
            aria-label="Delete decision"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {decision.choice && (
        <div className="mt-3 rounded-md border border-border bg-surface-raised/50 p-3">
          <p className="text-sm">
            <span className="font-semibold text-accent">Decision:</span> {decision.choice}
          </p>
          {decision.rationale && (
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-foreground">Why:</span> {decision.rationale}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-faint">
        {evidenceCount > 0 && <span>{evidenceCount} evidence items</span>}
        {decision.decidedAt && (
          <span className="font-data">
            decided {new Date(decision.decidedAt).toLocaleDateString()}
          </span>
        )}
        {decision.revisitAt && (
          <span className="font-data">
            revisit {new Date(decision.revisitAt).toLocaleDateString()}
          </span>
        )}
        {decision.status !== "CONSIDERING" && <span>{OUTCOME_LABEL[decision.outcome]}</span>}
      </div>

      {/* Founder-only transitions (doc 15: the AI never mutates decisions) */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {decision.status === "CONSIDERING" && !deciding && (
          <Button size="sm" onClick={() => setDeciding(true)}>
            <CheckCircle2 className="size-3.5" /> Decide
          </Button>
        )}
        {decision.status === "DECIDED" && (
          <>
            <Button
              variant="secondary"
              size="sm"
              loading={update.isPending && update.variables?.status === "REVISIT"}
              onClick={() => update.mutate({ id: decision.id, status: "REVISIT" })}
            >
              <RotateCcw className="size-3.5" /> Mark for revisit
            </Button>
            {decision.outcome === "PENDING" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={update.isPending && update.variables?.outcome === "VALIDATED"}
                  onClick={() => update.mutate({ id: decision.id, outcome: "VALIDATED" })}
                >
                  Validated
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={update.isPending && update.variables?.outcome === "REGRETTED"}
                  onClick={() => update.mutate({ id: decision.id, outcome: "REGRETTED" })}
                >
                  Regretted
                </Button>
              </>
            )}
          </>
        )}
        {decision.status === "REVISIT" && (
          <>
            {/* A revisit can end either way — re-confirming must not be a dead end. */}
            <Button
              variant="secondary"
              size="sm"
              loading={update.isPending && update.variables?.status === "DECIDED"}
              onClick={() => update.mutate({ id: decision.id, status: "DECIDED" })}
            >
              Stand by decision
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={update.isPending && update.variables?.status === "REVERSED"}
              onClick={() => update.mutate({ id: decision.id, status: "REVERSED" })}
            >
              Reverse decision
            </Button>
          </>
        )}
      </div>

      {/* A silently failed transition reads as recorded — always surface it. */}
      {(update.isError || remove.isError) && (
        <p className="mt-2 text-xs text-critical">
          {((update.error ?? remove.error) as Error)?.message ?? "That didn't save — try again."}
        </p>
      )}

      {deciding && (
        <form onSubmit={submitDecision} className="mt-3 flex flex-col gap-2">
          <Input
            autoFocus
            placeholder="What did you decide?"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            required
          />
          <Input
            placeholder="Why? (the argument that won)"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={update.isPending}>
              Record decision
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDeciding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
