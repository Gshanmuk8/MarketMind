"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { mainNav, secondaryNav } from "@/config/navigation";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/utils";

const allNav = [...mainNav, ...secondaryNav];

function useToday() {
  // Rendered client-side only to avoid a server/client hydration mismatch.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date())
    );
  }, []);
  return today;
}

/** Thin folio line: current section, date, search, account. */
export function FolioBar() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const today = useToday();

  const section = allNav.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const initial =
    (user?.user_metadata?.full_name as string | undefined)?.[0] ??
    user?.email?.[0] ??
    "·";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:px-10">
        <div className="flex items-baseline gap-4">
          <Link href="/dashboard" className="font-display text-base text-foreground lg:hidden">
            MarketMind
          </Link>
          <p className="microlabel hidden lg:block">{section?.title ?? "MarketMind"}</p>
          {today && <p aria-hidden className="microlabel hidden sm:block">{today}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-faint shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-px hover:border-border-strong hover:text-muted hover:shadow-[var(--shadow-lifted)]"
            aria-label="Open global search"
            onClick={() => window.dispatchEvent(new Event("mm:open-search"))}
          >
            <Search className="size-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden font-data text-[10px] text-faint sm:inline">⌘K</kbd>
          </button>
          <div
            className="flex size-8 items-center justify-center rounded-full border border-border-strong bg-surface font-display text-sm text-foreground"
            aria-label="Account"
          >
            {initial.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Compact contents strip for small screens */}
      <nav
        aria-label="Primary"
        className="flex gap-5 overflow-x-auto border-t border-border px-4 py-2 sm:px-6 lg:hidden"
      >
        {allNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap text-xs transition-colors",
                active ? "text-foreground" : "text-faint hover:text-muted"
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
