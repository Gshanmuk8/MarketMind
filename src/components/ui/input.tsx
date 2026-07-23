import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Elegant field — porcelain, hairline, a quiet sage focus ring. */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface-overlay px-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgb(35_35_31/0.03)]",
        "placeholder:text-faint transition-all duration-200 hover:border-border-strong/40",
        "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20",
        className
      )}
      {...props}
    />
  );
}
