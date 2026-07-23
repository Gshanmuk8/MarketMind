import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field as errored — sets aria-invalid and a critical border/ring. */
  invalid?: boolean;
}

/** Elegant field — porcelain, hairline, a quiet sage focus ring. When
 *  `invalid`, the field itself carries the error (border + aria-invalid), not
 *  just a message beside it. */
export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-md border bg-surface-overlay px-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgb(35_35_31/0.03)]",
        "placeholder:text-faint transition-all duration-200 focus:outline-none focus:ring-2",
        invalid
          ? "border-critical/60 focus:border-critical focus:ring-critical/20"
          : "border-border hover:border-border-strong/40 focus:border-accent/50 focus:ring-accent/20",
        className
      )}
      {...props}
    />
  );
}
