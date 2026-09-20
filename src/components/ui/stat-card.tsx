import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card px-4 py-4 shadow-[var(--shadow-xs)] sm:px-5 sm:py-[1.15rem]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="t-caption">{label}</p>
        {icon && <span className="text-[var(--text-subtle)]">{icon}</span>}
      </div>
      <p className="numeral mt-2 text-[1.9rem] leading-none text-[var(--text)]">{value}</p>
      {hint && <p className="t-meta mt-2">{hint}</p>}
    </div>
  );
}
