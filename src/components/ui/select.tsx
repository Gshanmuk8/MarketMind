import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled native <select>. We keep the real element — free keyboard nav,
 * screen-reader semantics, and native mobile pickers — but strip the OS
 * chrome (`appearance-none`) and draw our own chevron + focus ring so it
 * reads as a designed control, not an admin-panel dropdown. Same tokens in
 * every theme.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <span className="relative inline-flex w-full">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-md border border-border bg-surface-overlay pl-3 pr-9 text-sm text-foreground outline-none transition-colors",
          "hover:border-border-strong/40 focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint"
      />
    </span>
  );
}
