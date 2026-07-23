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
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-border-strong/25"
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-[var(--shadow-card)] transition-transform duration-200 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
