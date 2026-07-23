"use client";

import { cn } from "@/lib/utils";

/**
 * A premium switch — an accessible button (role="switch"), not a native
 * checkbox, so it's unmistakably clickable and animates on toggle. Sage
 * when on, hairline when off; palette-consistent.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  /** When set, the text becomes part of the switch — one large, focusable,
   *  clickable control (no dead label beside a tiny track). */
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  const track = (
    <span
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out",
        checked ? "bg-accent" : "bg-border-strong/25"
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-[var(--shadow-card)] transition-transform duration-200 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </span>
  );

  const focus =
    "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

  if (description) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("flex w-full items-center justify-between gap-4 rounded-lg text-left", focus)}
      >
        <span className="text-sm text-foreground">{description}</span>
        {track}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("inline-flex", focus)}
    >
      {track}
    </button>
  );
}
