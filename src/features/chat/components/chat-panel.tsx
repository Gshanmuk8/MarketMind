"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { ChatSource } from "../service";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  sources: ChatSource[] | null;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : "Request failed.");
  }
  return res.json();
}

/** The strategist's desk: grounded answers, cited sources, quiet typography. */
export function ChatPanel() {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data, isPending } = useQuery({
    queryKey: ["chat"],
    queryFn: () => jsonFetch<{ messages: Message[] }>("/api/chat"),
  });

  const ask = useMutation({
    mutationFn: (message: string) =>
      jsonFetch("/api/chat", { method: "POST", body: JSON.stringify({ message }) }),
    // A failed question must not vanish — put it back in the input to retry.
    onError: (_error, question) => setInput((current) => current || question),
    onSettled: () => qc.invalidateQueries({ queryKey: ["chat"] }),
  });

  const messages = data?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, ask.isPending]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || ask.isPending) return;
    setInput("");
    ask.mutate(question);
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ml-auto h-10 w-1/2" />
        <Skeleton className="h-16 w-2/3" />
      </div>
    );
  }

  return (
    <div className="rise flex min-h-[60vh] flex-col">
      <div className="flex-1">
        {messages.length === 0 && !ask.isPending && !ask.isError ? (
          <EmptyState
            icon={MessageSquare}
            eyebrow="The counsel is in"
            title="Ask anything about your market"
            description={'Try "What should I build next?", "Who is my biggest threat right now?", or "Compare me with my top competitor."'}
          />
        ) : (
          <ol className="flex flex-col gap-8 pb-8">
            {messages.map((message) => (
              <li key={message.id} className={cn("max-w-2xl", message.role === "USER" && "ml-auto")}>
                <p className="microlabel mb-2">
                  {message.role === "USER" ? "You" : "Strategist"}
                </p>
                <div
                  className={cn(
                    "whitespace-pre-wrap text-sm leading-relaxed",
                    message.role === "USER"
                      ? "rounded-lg border border-border bg-surface px-4 py-3"
                      : "text-foreground"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "ASSISTANT" && (message.sources?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="inference">Grounded in</Badge>
                    {message.sources!.map((source) => (
                      <Link
                        key={`${source.type}-${source.id}`}
                        href={source.type === "competitor" ? `/competitors/${source.id}` : "/dashboard"}
                        className="text-xs text-live hover:underline"
                      >
                        {source.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {ask.isPending && (
              <>
                {/* Echo the in-flight question — a 30s wait with the asked
                    question visible nowhere reads as a swallowed message. */}
                <li className="ml-auto max-w-2xl">
                  <p className="microlabel mb-2">You</p>
                  <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
                    {ask.variables}
                  </div>
                </li>
                <li className="max-w-2xl">
                  <p className="microlabel mb-2">Strategist</p>
                  <p className="text-sm text-faint">Reading your intelligence…</p>
                </li>
              </>
            )}
            {ask.isError && (
              <li className="max-w-2xl text-sm text-critical">{(ask.error as Error).message}</li>
            )}
            <div ref={endRef} />
          </ol>
        )}
      </div>

      <form onSubmit={submit} className="sticky bottom-6 mt-6">
        <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-overlay p-2 shadow-[var(--shadow-soft)]">
          <input
            className="h-10 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-faint"
            placeholder="Ask your strategist…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Ask your strategist"
          />
          <button
            type="submit"
            disabled={ask.isPending || input.trim().length < 2}
            className="flex size-10 items-center justify-center rounded-sm bg-ink-wash text-background transition-colors hover:bg-foreground disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </form>
    </div>
  );
}
