"use client";

import { useState } from "react";
import type { Decision } from "@prisma/client";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDeleteDecision, useUpdateDecision } from "../hooks/use-decisions";

const STATUS: Record<Decision["status"], { label: string; color: string }> = {
  CONSIDERING: { label: "Considering", color: "var(--color-live)" },
  DECIDED: { label: "Decided", color: "var(--color-accent)" },
  REVISIT: { label: "Revisit", color: "var(--color-warning)" },
  REVERSED: { label: "Reversed", color: "var(--color-faint)" },
};

const OUTCOME: Record<Decision["outcome"], { label: string; className: string }> = {
  PENDING: { label: "Outcome pending", className: "text-faint" },
  VALIDATED: { label: "Validated", className: "text-accent" },
  MIXED: { label: "Mixed", className: "text-warning" },
  REGRETTED: { label: "Regretted", className: "text-critical" },
};

interface Alternative {
  option: string;
  reason?: string;
}

/** One decision, typeset as a permanent record: context → the call → outcome. */
export function DecisionCard({ decision }: { decision: Decision }) {
  const update = useUpdateDecision();
  const remove = useDeleteDecision();

  const [deciding, setDeciding] = useState(false);
  const [choice, setChoice] = useState("");
  const [rationale, setRationale] = useState("");

  const s = STATUS[decision.status];
  const evidenceCount = Array.isArray(decision.evidence) ? decision.evidence.length : 0;
  const alternatives = Array.isArray(decision.alternatives)
    ? (decision.alternatives as unknown as Alternative[])
    : [];
  const conviction = Math.min(1, evidenceCount / 4);
  const stampDate = decision.decidedAt ?? decision.createdAt;
  const dateLabel = stampDate
    ? new Date(stampDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  function submitDecision(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({ id: decision.id, status: "DECIDED", choice, rationale }, { onSuccess: () => setDeciding(false) });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-lifted)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-data text-[11px] uppercase tracking-[0.15em]" style={{ color: s.color }}>
              {s.label}
            </span>
          </span>
          {dateLabel && <span className="font-data text-[11px] text-faint">{dateLabel}</span>}
        </div>
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

      <h3 className="mt-2.5 font-sans text-base font-medium leading-snug text-foreground">{decision.title}</h3>

      {/* The record */}
      <div className="mt-4 space-y-3 border-l-2 border-border pl-4">
        <RecordRow label="Context" body={decision.context} />
        {decision.choice && <RecordRow label="The call" body={decision.choice} strong />}
        {decision.rationale && <RecordRow label="Why" body={decision.rationale} />}
        {alternatives.length > 0 && (
          <div>
            <p className="microlabel mb-1.5">Rejected</p>
            <ul className="space-y-1">
              {alternatives.map((a, i) => (
                <li key={i} className="text-sm leading-relaxed text-muted">
                  <span className="text-faint">✕ </span>
                  {a.option}
                  {a.reason ? ` — ${a.reason}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Meters — conviction + outcome + revisit */}
      {(decision.status !== "CONSIDERING" || evidenceCount > 0 || decision.revisitAt) && (
        <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-3">
          <div>
            <p className="microlabel mb-2">Conviction · {evidenceCount} evidence</p>
            <ConvictionMeter value={conviction} />
          </div>
          {decision.status !== "CONSIDERING" && (
            <div>
              <p className="microlabel mb-2">Result</p>
              <span className={cn("text-sm font-medium", OUTCOME[decision.outcome].className)}>
                {OUTCOME[decision.outcome].label}
              </span>
              {decision.outcomeNotes && (
                <p className="mt-0.5 max-w-sm text-xs leading-relaxed text-muted">{decision.outcomeNotes}</p>
              )}
            </div>
          )}
          {decision.revisitAt && (
            <div>
              <p className="microlabel mb-2">Revisit</p>
              <span className="font-data text-sm text-foreground">
                {new Date(decision.revisitAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Founder-only transitions (doc 15: the AI never mutates decisions) */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
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

      {(update.isError || remove.isError) && (
        <p className="mt-2 text-xs text-critical">
          {((update.error ?? remove.error) as Error)?.message ?? "That didn't save — try again."}
        </p>
      )}

      {deciding && (
        <form onSubmit={submitDecision} className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <Input
            autoFocus
            aria-label="What did you decide?"
            placeholder="What did you decide?"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            required
          />
          <Input
            aria-label="Why did you decide this?"
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
    </div>
  );
}

function RecordRow({ label, body, strong }: { label: string; body: string; strong?: boolean }) {
  return (
    <div>
      <p className="microlabel mb-1">{label}</p>
      <p className={cn("text-sm leading-relaxed", strong ? "font-medium text-foreground" : "text-muted")}>{body}</p>
    </div>
  );
}

/** A 10-segment conviction bar (evidence-backed), War-Room style. */
function ConvictionMeter({ value }: { value: number }) {
  const filled = Math.round(value * 10);
  return (
    <div className="flex gap-0.5" aria-label={`${filled * 10}% conviction`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className={cn("h-2.5 w-2.5 rounded-[2px]", i < filled ? "bg-accent" : "bg-border")}
        />
      ))}
    </div>
  );
}
