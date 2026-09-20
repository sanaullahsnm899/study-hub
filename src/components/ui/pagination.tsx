import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass } from "./button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  total,
  buildHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const pages = pageRange(page, pageCount);

  return (
    <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="t-meta hidden sm:block">
        Page {page} of {pageCount} · {total} results
      </p>
      <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-end">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={cn(buttonClass("secondary", "sm"), page === 1 && "pointer-events-none opacity-40")}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-[var(--text-subtle)]">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={buildHref(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  buttonClass(p === page ? "primary" : "ghost", "sm"),
                  "min-w-9 px-0 tabular-nums",
                )}
              >
                {p}
              </Link>
            ),
          )}
        </div>
        <Link
          href={buildHref(Math.min(pageCount, page + 1))}
          aria-disabled={page === pageCount}
          className={cn(
            buttonClass("secondary", "sm"),
            page === pageCount && "pointer-events-none opacity-40",
          )}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}

function pageRange(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pageCount - 1) out.push("…");
  out.push(pageCount);
  return out;
}
