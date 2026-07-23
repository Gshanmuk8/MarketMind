import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Elegant field — porcelain, hairline, a quiet sage focus ring. */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-sm border border-border bg-surface-overlay px-3 text-sm text-foreground",
        "placeholder:text-faint transition-colors duration-200",
        "focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20",
        className
      )}
      {...props}
    />
  );
}
