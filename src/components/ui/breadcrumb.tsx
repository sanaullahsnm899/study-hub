import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-[0.8rem] text-[var(--text-subtle)]">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />}
            {item.href ? (
              <Link
                href={item.href}
                className="rounded px-0.5 transition-colors hover:text-[var(--text)]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="px-0.5 text-[var(--text-muted)]" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
