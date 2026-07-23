"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CornerDownLeft, Sparkles } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface AskResult {
  answer: string;
  sources: { type: "signal" | "competitor"; id: string; label: string }[];
}

const SUGGESTIONS = [
  "What changed this week?",
  "Which competitors are most dangerous right now?",
  "What should I build next?",
  "Where is my biggest opening?",
];

/**
 * Conversational market query — the dashboard's question-driven intelligence
 * layer. Deliberately a search/command surface (Spotlight / Perplexity), NOT
 * a chat window: no bubbles, no avatar. Answers are grounded in the founder's
 * own intelligence and cite the competitors/signals they draw on.
 */
export function MarketQuery() {
  const [q, setQ] = useState("");

  const ask = useMutation({
    mutationFn: async (question: string): Promise<AskResult> => {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(typeof d?.error === "string" ? d.error : "Couldn't answer that.");
      }
      return res.json();
    },
  });

  function run(question: string) {
    const trimmed = question.trim();
    if (trimmed.length < 2 || ask.isPending) return;
    setQ(trimmed);
    ask.mutate(trimmed);
  }

  // Auto-run a question handed over from the ⌘K palette (/dashboard?q=…).
  const searchParams = useSearchParams();
  const lastRun = useRef<string | null>(null);
  useEffect(() => {
    const urlQ = searchParams.get("q")?.trim();
    if (urlQ && urlQ.length >= 2 && lastRun.current !== urlQ) {
      lastRun.current = urlQ;
      setQ(urlQ);
      ask.mutate(urlQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="border-b border-[var(--t-line)] px-5 py-5 sm:px-7">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <div className="flex items-center gap-3 rounded-xl border border-[var(--t-line)] bg-white/[0.03] px-4 transition-colors focus-within:border-[var(--t-accent)]/45">
          <Sparkles className="size-4 shrink-0 text-[var(--t-accent)]" strokeWidth={1.5} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask anything about your market…"
            aria-label="Ask about your market"
            className="h-11 flex-1 bg-transparent text-sm text-[var(--t-text)] outline-none placeholder:text-[var(--t-faint)]"
          />
          <button
            type="submit"
            disabled={ask.isPending || q.trim().length < 2}
            className="flex items-center gap-1.5 text-[var(--t-faint)] transition-colors hover:text-[var(--t-accent)] disabled:opacity-40"
            aria-label="Ask"
          >
            {ask.isPending ? (
              <Spinner className="size-4 text-[var(--t-accent)]" />
            ) : (
              <>
                <span className="font-data hidden text-[10px] uppercase tracking-wider sm:inline">ask</span>
                <CornerDownLeft className="size-3.5" strokeWidth={1.5} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggestions while idle */}
      {!ask.data && !ask.isPending && !ask.isError && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => run(s)}
              className="rounded-full border border-[var(--t-line)] px-3 py-1 text-xs text-[var(--t-muted)] transition-colors hover:border-[var(--t-accent)]/30 hover:text-[var(--t-text)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {ask.isPending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--t-faint)]">
          <Spinner className="size-4 text-[var(--t-accent)]" label="Thinking" /> Reading your intelligence…
        </div>
      )}

      {ask.isError && !ask.isPending && (
        <p className="mt-4 text-sm text-[var(--t-critical)]">{(ask.error as Error).message}</p>
      )}

      {/* Answer — a result panel, not a chat bubble */}
      {ask.data && !ask.isPending && (
        <div className="rise mt-4 rounded-xl border border-[var(--t-line)] bg-white/[0.02] p-4">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--t-text)]">
            {ask.data.answer}
          </p>
          {ask.data.sources.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--t-line)] pt-3">
              <span className="font-data text-[10px] uppercase tracking-wider text-[var(--t-pewter)]">
                grounded in
              </span>
              {ask.data.sources.map((src) => (
                <Link
                  key={`${src.type}-${src.id}`}
                  href={src.type === "competitor" ? `/competitors/${src.id}` : "#latest-intelligence"}
                  className="rounded-full border border-[var(--t-line)] bg-white/[0.03] px-2.5 py-1 text-xs text-[var(--t-live)] transition-colors hover:text-[var(--t-text)]"
                >
                  {src.label}
                </Link>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              ask.reset();
              setQ("");
            }}
            className="font-data mt-3 text-[10px] uppercase tracking-wider text-[var(--t-faint)] transition-colors hover:text-[var(--t-accent)]"
          >
            ask another →
          </button>
        </div>
      )}
    </div>
  );
}
