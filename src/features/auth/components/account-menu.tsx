"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings2, Sparkles } from "lucide-react";
import { useAuth, useCurrentUser } from "@/features/auth/hooks/use-auth";

/**
 * Account chip + workspace menu — replaces the bare initial with an identity
 * card and quick actions. Closes on outside click; signing out clears the
 * query cache so the next account never sees cached data.
 */
export function AccountMenu() {
  const router = useRouter();
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);

  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0] ?? "You";
  const email = user?.email ?? "";
  const initial = (name[0] ?? "·").toUpperCase();

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    qc.clear();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        aria-expanded={open}
        className="flex size-8 items-center justify-center rounded-full border border-border-strong bg-surface font-display text-sm text-foreground transition-shadow duration-200 hover:shadow-[var(--shadow-card)]"
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border-strong/25 bg-surface-overlay shadow-[var(--shadow-float)]">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-display text-sm text-foreground">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{name}</p>
                  {email && <p className="truncate font-data text-[11px] text-faint">{email}</p>}
                </div>
              </div>
              <p className="microlabel mt-3 flex items-center gap-1.5 text-accent">
                <Sparkles className="size-3" strokeWidth={1.5} /> Personal workspace
              </p>
            </div>
            <div className="p-1.5">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-raised"
              >
                <Settings2 className="size-4 text-muted" strokeWidth={1.5} /> Settings &amp; delivery
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-raised"
              >
                <LogOut className="size-4 text-muted" strokeWidth={1.5} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
