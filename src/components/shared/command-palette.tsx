"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  Clock,
  FileText,
  MessageSquare,
  Radar,
  Scale,
  Settings2,
  Sparkles,
} from "lucide-react";
import { mainNav, secondaryNav } from "@/config/navigation";

interface SearchResults {
  competitors: { id: string; name: string }[];
  signals: { id: string; title: string; competitorId: string | null }[];
  decisions: { id: string; title: string }[];
  reports: { id: string; title: string }[];
}

interface Recent {
  label: string;
  href: string;
}

const RECENTS_KEY = "mm_recents";
function getRecents(): Recent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    return Array.isArray(raw) ? raw.slice(0, 5) : [];
  } catch {
    return [];
  }
}
function pushRecent(item: Recent) {
  try {
    const next = [item, ...getRecents().filter((r) => r.href !== item.href)].slice(0, 5);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

const ACTIONS = [
  { label: "Ask the strategist a question", href: "/dashboard#ask", icon: Sparkles },
  { label: "Open the landscape map", href: "/competitors", icon: Radar },
  { label: "Generate an intelligence report", href: "/reports", icon: FileText },
  { label: "Open a new decision", href: "/decisions", icon: Scale },
  { label: "Open the strategist chat", href: "/chat", icon: MessageSquare },
  { label: "Delivery & preferences", href: "/settings", icon: Settings2 },
];

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground data-[selected=true]:bg-surface-raised";
const groupClass =
  "[&_[cmdk-group-heading]]:microlabel [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2";

/**
 * ⌘K — the operating layer of the app. Any typed text becomes an "ask the
 * strategist" action (routed to the grounded dashboard query); plus curated
 * actions, recent destinations, and search across all intelligence.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<Recent[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mm:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mm:open-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setRecents(getRecents());
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", query],
    queryFn: async (): Promise<SearchResults> => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: open && query.trim().length >= 2,
    staleTime: 10_000,
  });

  function go(href: string, recent?: Recent) {
    if (recent) pushRecent(recent);
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function ask(q: string) {
    setOpen(false);
    setQuery("");
    router.push(`/dashboard?q=${encodeURIComponent(q)}`);
  }

  if (!open) return null;

  const q = query.trim();
  const typing = q.length >= 2;
  const match = (text: string) => text.toLowerCase().includes(q.toLowerCase());
  const nav = [...mainNav, ...secondaryNav];
  const navMatches = nav.filter((i) => !typing || match(i.title));
  const actionMatches = ACTIONS.filter((a) => !typing || match(a.label));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/25 pt-[16vh] backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl px-4">
        <Command
          shouldFilter={false}
          className="overflow-hidden rounded-2xl border border-border-strong/25 bg-surface-overlay shadow-[var(--shadow-float)]"
        >
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Sparkles className="size-4 shrink-0 text-accent" strokeWidth={1.5} />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Ask anything, or search competitors, signals, decisions…"
              className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-faint"
            />
            {isFetching && <Spinner />}
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {/* Ask row — any typed text becomes a grounded question */}
            {typing && (
              <Command.Group heading="Ask" className={groupClass}>
                <Command.Item value={`ask ${q}`} onSelect={() => ask(q)} className={itemClass}>
                  <Sparkles className="size-4 shrink-0 text-accent" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate">
                    Ask the strategist: <span className="text-muted">“{q}”</span>
                  </span>
                  <Kbd>↵</Kbd>
                </Command.Item>
              </Command.Group>
            )}

            {/* Recents when idle */}
            {!typing && recents.length > 0 && (
              <Command.Group heading="Recent" className={groupClass}>
                {recents.map((r) => (
                  <Command.Item key={r.href} value={`recent ${r.label}`} onSelect={() => go(r.href)} className={itemClass}>
                    <Clock className="size-4 shrink-0 text-faint" strokeWidth={1.5} />
                    <span className="truncate">{r.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Actions */}
            {actionMatches.length > 0 && (
              <Command.Group heading="Actions" className={groupClass}>
                {actionMatches.map((a) => (
                  <Command.Item
                    key={a.href}
                    value={`action ${a.label}`}
                    onSelect={() => (a.href.includes("#ask") ? ask("") : go(a.href))}
                    className={itemClass}
                  >
                    <a.icon className="size-4 shrink-0 text-muted" strokeWidth={1.5} />
                    <span className="truncate">{a.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Search results */}
            {data?.competitors.map((c) => (
              <Command.Item
                key={c.id}
                value={`competitor ${c.name} ${c.id}`}
                onSelect={() => go(`/competitors/${c.id}`, { label: c.name, href: `/competitors/${c.id}` })}
                className={itemClass}
              >
                <span className="microlabel">Competitor</span>
                <span className="truncate">{c.name}</span>
              </Command.Item>
            ))}
            {data?.signals.map((s) => (
              <Command.Item
                key={s.id}
                value={`signal ${s.title} ${s.id}`}
                onSelect={() => go(s.competitorId ? `/competitors/${s.competitorId}` : "/dashboard")}
                className={itemClass}
              >
                <span className="microlabel">Signal</span>
                <span className="line-clamp-1">{s.title}</span>
              </Command.Item>
            ))}
            {data?.decisions.map((d) => (
              <Command.Item key={d.id} value={`decision ${d.title} ${d.id}`} onSelect={() => go("/decisions")} className={itemClass}>
                <span className="microlabel">Decision</span>
                <span className="truncate">{d.title}</span>
              </Command.Item>
            ))}
            {data?.reports.map((r) => (
              <Command.Item
                key={r.id}
                value={`report ${r.title} ${r.id}`}
                onSelect={() => go(`/reports/${r.id}`, { label: r.title, href: `/reports/${r.id}` })}
                className={itemClass}
              >
                <span className="microlabel">Report</span>
                <span className="truncate">{r.title}</span>
              </Command.Item>
            ))}

            {/* Navigation */}
            {navMatches.length > 0 && (
              <Command.Group heading="Go to" className={groupClass}>
                {navMatches.map((item) => (
                  <Command.Item key={item.href} value={`page ${item.title}`} onSelect={() => go(item.href)} className={itemClass}>
                    <span className="size-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-faint">
            <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> navigate</span>
            <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> select</span>
            <span className="flex items-center gap-1.5"><Kbd>esc</Kbd> close</span>
            <span className="ml-auto flex items-center gap-1.5">
              <Sparkles className="size-3 text-accent" strokeWidth={1.5} /> ask · search · act
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-data rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted">
      {children}
    </kbd>
  );
}

function Spinner() {
  return (
    <span
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent motion-reduce:animate-none"
      aria-label="Searching"
    />
  );
}
