import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/**
 * Crafted editorial buttons. Primary is an ink block with paper-coloured
 * type (the luxury-print signature); the rest are hairline or quiet.
 * No gradients or glows — presence comes from weight and space. Pass
 * `loading` while an action is in flight: a spinner leads and the button
 * disables itself.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[0.005em] transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "bg-ink-wash text-background shadow-[var(--shadow-card)] hover:bg-foreground hover:-translate-y-px hover:shadow-[var(--shadow-lifted)]",
        secondary:
          "border border-border-strong bg-transparent text-foreground hover:-translate-y-px hover:bg-surface-raised hover:shadow-[var(--shadow-card)]",
        ghost: "text-muted hover:bg-surface-raised hover:text-foreground",
        danger:
          "border border-critical/40 bg-transparent text-critical hover:bg-critical/10 hover:border-critical/60",
      },
      size: {
        sm: "h-8 px-4 text-sm",
        md: "h-10 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a leading spinner and disable the button while an action runs. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export { buttonVariants };
