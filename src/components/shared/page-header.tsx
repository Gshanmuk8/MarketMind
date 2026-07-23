interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: React.ReactNode;
}

/** Editorial page opening: mono eyebrow, Fraunces title, hairline close. */
export function PageHeader({ title, eyebrow, description, children }: PageHeaderProps) {
  return (
    <div className="rise mb-10 border-b border-border pb-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          {eyebrow && <p className="microlabel mb-4 text-accent">{eyebrow}</p>}
          <h1 className="display-2 break-words text-foreground">{title}</h1>
          {description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {children && <div className="flex shrink-0 items-center gap-2 pb-1">{children}</div>}
      </div>
    </div>
  );
}
