"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav, secondaryNav, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

function IndexEntry({ item, index }: { item: NavItem; index: number }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative -mx-3 flex items-baseline gap-4 rounded-lg px-3 py-2 transition-all duration-200 ease-out",
        active
          ? "bg-accent-dim text-foreground"
          : "text-muted hover:bg-surface-raised hover:text-foreground"
      )}
    >
      {/* Accent rail on the active entry — a quiet Linear-style marker */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent"
        />
      )}
      <span
        aria-hidden
        className={cn(
          "font-data text-[11px] tracking-wide transition-colors",
          active ? "text-accent" : "text-faint group-hover:text-muted"
        )}
      >
        {String(index).padStart(2, "0")}
      </span>
      <span className="text-sm">{item.title}</span>
    </Link>
  );
}

/**
 * The app reads as a bound index: wordmark, numbered contents, hairline
 * rules. Nav items come from config/navigation.ts — add them there.
 */
export function IndexNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border px-8 py-10 lg:flex">
      <Link href="/dashboard" className="block">
        <span className="font-display text-xl tracking-tight text-foreground">
          MarketMind
        </span>
        <span className="microlabel mt-2 block">Competitive Intelligence</span>
      </Link>

      <nav aria-label="Primary" className="mt-14 flex flex-1 flex-col">
        {mainNav.map((item, i) => (
          <IndexEntry key={item.href} item={item} index={i + 1} />
        ))}
      </nav>

      <nav aria-label="Secondary" className="flex flex-col border-t border-border pt-5">
        {secondaryNav.map((item, i) => (
          <IndexEntry key={item.href} item={item} index={mainNav.length + i + 1} />
        ))}
      </nav>
    </aside>
  );
}
