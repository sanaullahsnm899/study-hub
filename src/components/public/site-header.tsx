import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "./global-search";
import { Wordmark } from "./brand";

export function SiteHeader({ semesters }: { semesters: { slug: string; name: string; short_label: string | null }[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="shell flex h-16 items-center gap-3">
        <Wordmark />
        <nav aria-label="Semesters" className="ml-4 hidden items-center gap-0.5 md:flex">
          {semesters.map((s) => (
            <Link
              key={s.slug}
              href={`/semester/${s.slug}`}
              className="rounded-[var(--r-sm)] px-2.5 py-1.5 text-[0.875rem] text-[var(--text-muted)] transition-colors duration-[var(--fast)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              {s.name.replace(" Semester", "")}
            </Link>
          ))}
          <Link
            href="/materials"
            className="rounded-[var(--r-sm)] px-2.5 py-1.5 text-[0.875rem] text-[var(--text-muted)] transition-colors duration-[var(--fast)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            All materials
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <GlobalSearch variant="icon" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
