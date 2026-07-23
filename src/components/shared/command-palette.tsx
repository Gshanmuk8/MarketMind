"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { Spinner } from "@/components/ui/spinner";
import { mainNav, secondaryNav } from "@/config/navigation";

interface SearchResults {
  competitors: { id: string; name: string }[];
  signals: { id: string; title: string; competitorId: string | null }[];
  decisions: { id: string; title: string }[];
  reports: { id: string; title: string }[];
}

/** ⌘K palette: navigate anywhere, search competitors, signals, decisions, reports. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 pt-[18vh]"
      onClick={() => setOpen(false)}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg px-4">
        <Command
          shouldFilter={query.trim().length < 2}
          className="overflow-hidden rounded-lg border border-border-strong bg-surface-overlay shadow-[var(--shadow-soft)]"
        >
          <div className="relative border-b border-border">
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search competitors, signals, decisions, reports…"
              className="h-12 w-full bg-transparent px-4 pr-11 text-sm outline-none placeholder:text-faint"
            />
            {isFetching && (
              <Spinner className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" label="Searching" />
            )}
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-faint">
              Nothing found.
            </Command.Empty>

            <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:microlabel [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
              {[...mainNav, ...secondaryNav].map((item) => (
                <Command.Item
                  key={item.href}
                  value={`page ${item.title}`}
                  onSelect={() => go(item.href)}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-surface-raised"
                >
                  {item.title}
                </Command.Item>
              ))}
            </Command.Group>

            {data?.competitors.map((c) => (
              <Command.Item key={c.id} value={`competitor ${c.name} ${c.id}`} onSelect={() => go(`/competitors/${c.id}`)} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-surface-raised">
                <span className="microlabel mr-3">Competitor</span>
                {c.name}
              </Command.Item>
            ))}
            {data?.signals.map((s) => (
              <Command.Item key={s.id} value={`signal ${s.title} ${s.id}`} onSelect={() => go(s.competitorId ? `/competitors/${s.competitorId}` : "/dashboard")} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-surface-raised">
                <span className="microlabel mr-3">Signal</span>
                <span className="line-clamp-1">{s.title}</span>
              </Command.Item>
            ))}
            {data?.decisions.map((d) => (
              <Command.Item key={d.id} value={`decision ${d.title} ${d.id}`} onSelect={() => go("/decisions")} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-surface-raised">
                <span className="microlabel mr-3">Decision</span>
                {d.title}
              </Command.Item>
            ))}
            {data?.reports.map((r) => (
              <Command.Item key={r.id} value={`report ${r.title} ${r.id}`} onSelect={() => go(`/reports/${r.id}`)} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-surface-raised">
                <span className="microlabel mr-3">Report</span>
                {r.title}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
