"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

export type FilterConfig = {
  semesters: FilterOption[];
  subjects: (FilterOption & { semester?: string })[];
  categories: FilterOption[];
};

const FILE_TYPES: FilterOption[] = [
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
  { value: "presentation", label: "Slides" },
  { value: "sheet", label: "Spreadsheet" },
  { value: "image", label: "Image" },
  { value: "link", label: "External link" },
];

const DATES: FilterOption[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
];

const SORTS: FilterOption[] = [
  { value: "recent", label: "Newest first" },
  { value: "popular", label: "Most downloaded" },
  { value: "title", label: "Title A–Z" },
];

export function FilterBar({ config, resultCount }: { config: FilterConfig; resultCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  const current = {
    semester: params.get("semester") || "",
    subject: params.get("subject") || "",
    category: params.get("category") || "",
    type: params.get("type") || "",
    days: params.get("days") || "",
    sort: params.get("sort") || "recent",
  };

  const activeCount = [current.semester, current.subject, current.category, current.type, current.days]
    .filter(Boolean).length;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "semester") next.delete("subject");
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  function clearAll() {
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  const subjects = current.semester
    ? config.subjects.filter((s) => s.semester === current.semester)
    : config.subjects;

  const controls = (
    <>
      <Select
        aria-label="Filter by semester"
        value={current.semester}
        onChange={(e) => update("semester", e.target.value)}
      >
        <option value="">All semesters</option>
        {config.semesters.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter by subject"
        value={current.subject}
        onChange={(e) => update("subject", e.target.value)}
      >
        <option value="">All subjects</option>
        {subjects.map((o) => (
          <option key={`${o.semester}-${o.value}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter by category"
        value={current.category}
        onChange={(e) => update("category", e.target.value)}
      >
        <option value="">All categories</option>
        {config.categories.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select aria-label="Filter by file type" value={current.type} onChange={(e) => update("type", e.target.value)}>
        <option value="">Any file type</option>
        {FILE_TYPES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select aria-label="Filter by date added" value={current.days} onChange={(e) => update("days", e.target.value)}>
        <option value="">Any time</option>
        {DATES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select aria-label="Sort results" value={current.sort} onChange={(e) => update("sort", e.target.value)}>
        {SORTS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </>
  );

  return (
    <div className="mb-6">
      {/* Desktop */}
      <div className="hidden gap-2 md:grid md:grid-cols-3 lg:grid-cols-6">{controls}</div>

      {/* Mobile */}
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-[var(--accent)] px-1.5 text-[0.7rem] text-[var(--on-accent)]">
              {activeCount}
            </span>
          )}
        </Button>
        <p className="t-meta tabular-nums">
          {pending ? "Loading…" : `${resultCount} ${resultCount === 1 ? "result" : "results"}`}
        </p>
      </div>

      <div className="mt-3 hidden items-center gap-3 md:flex">
        <p className="t-meta tabular-nums">
          {pending ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </span>
          ) : (
            `${resultCount} ${resultCount === 1 ? "result" : "results"}`
          )}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="t-meta text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div
            className="absolute inset-0 bg-[rgba(10,18,15,0.45)]"
            style={{ animation: "overlay-in var(--fast) var(--ease) both" }}
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className={cn(
              "absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[var(--r-xl)]",
              "border-t border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)] safe-b",
            )}
            style={{ animation: "sheet-up var(--normal) var(--ease) both" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="t-h2">Filters</h2>
              <Button variant="ghost" size="icon" onClick={() => setSheetOpen(false)} aria-label="Close filters">
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>
            <div className="grid gap-3">{controls}</div>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={clearAll}>
                Clear all
              </Button>
              <Button className="flex-1" onClick={() => setSheetOpen(false)}>
                Show {resultCount} results
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
