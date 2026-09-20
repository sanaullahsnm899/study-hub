import Link from "next/link";
import { brand } from "@/lib/config";
import { Wordmark } from "./brand";

export function SiteFooter({ semesters }: { semesters: { slug: string; name: string }[] }) {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="shell grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Wordmark href={null} size="sm" />
          <p className="t-caption mt-2 max-w-xs">{brand.description}</p>
        </div>
        <nav aria-label="Semesters">
          <h2 className="t-meta mb-2.5 font-medium text-[var(--text)]">Semesters</h2>
          <ul className="space-y-1.5">
            {semesters.map((s) => (
              <li key={s.slug}>
                <Link href={`/semester/${s.slug}`} className="t-small text-[var(--text-muted)] hover:text-[var(--accent)]">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="More">
          <h2 className="t-meta mb-2.5 font-medium text-[var(--text)]">Library</h2>
          <ul className="space-y-1.5">
            <li>
              <Link href="/materials" className="t-small text-[var(--text-muted)] hover:text-[var(--accent)]">
                All materials
              </Link>
            </li>
            <li>
              <Link href="/search" className="t-small text-[var(--text-muted)] hover:text-[var(--accent)]">
                Search
              </Link>
            </li>
            <li>
              <Link href="/admin" className="t-small text-[var(--text-muted)] hover:text-[var(--accent)]">
                Admin sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="shell flex flex-col gap-1 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-meta">
            © {new Date().getFullYear()} {brand.name}. Shared by your class representative.
          </p>
          <p className="t-meta">
            Materials are posted only where the class has permission to share them.
          </p>
        </div>
      </div>
    </footer>
  );
}
