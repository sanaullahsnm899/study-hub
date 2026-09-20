import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[var(--border)] px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--text-subtle)]">
          {icon}
        </div>
      )}
      <h3 className="t-h3">{title}</h3>
      {description && (
        <p className="t-caption mt-1.5 max-w-sm text-balance">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--danger-soft)]/40 px-6 py-10 text-center">
      <h3 className="t-h3 text-[var(--danger)]">{title}</h3>
      {description && <p className="t-caption mt-1.5">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
