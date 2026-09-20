import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Flame, Library } from "lucide-react";
import { GlobalSearch } from "@/components/public/global-search";
import { MaterialRow, SemesterCard } from "@/components/public/cards";
import { CardGridSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { brand } from "@/lib/config";
import { popularMaterials, recentMaterials } from "@/lib/repo/materials";
import { listSemesters } from "@/lib/repo/taxonomy";
import { compactNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="shell py-12 sm:py-16">
          <div className="max-w-2xl">
            <h1 className="t-display text-balance">
              Everything you need
              <br />
              for your semester.
            </h1>
            <p className="t-body mt-4 max-w-lg text-[var(--text-muted)]">{brand.description}</p>
            <div className="mt-7 max-w-lg">
              <GlobalSearch />
            </div>
          </div>
        </div>
      </section>

      <div className="shell py-10 sm:py-12">
        <section aria-labelledby="semesters-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="semesters-heading" className="t-h2">
              Your semesters
            </h2>
            <Link
              href="/materials"
              className="t-small inline-flex items-center gap-1 text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
            >
              Browse everything <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Suspense fallback={<CardGridSkeleton count={3} height="h-[5.5rem]" />}>
            <SemesterGrid />
          </Suspense>
        </section>

        <div className="mt-12 grid gap-10 lg:mt-14 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <section aria-labelledby="recent-heading">
            <div className="mb-2 flex items-end justify-between gap-4">
              <h2 id="recent-heading" className="t-h2">
                Recently added
              </h2>
              <Link
                href="/materials"
                className="t-small text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
              >
                View all
              </Link>
            </div>
            <Suspense fallback={<ListSkeleton count={5} />}>
              <RecentList />
            </Suspense>
          </section>

          <section aria-labelledby="popular-heading">
            <h2 id="popular-heading" className="t-h2 mb-2">
              Most downloaded
            </h2>
            <Suspense fallback={<ListSkeleton count={4} />}>
              <PopularList />
            </Suspense>
          </section>
        </div>
      </div>
    </>
  );
}

async function SemesterGrid() {
  let semesters: Awaited<ReturnType<typeof listSemesters>>;
  try {
    semesters = await listSemesters();
  } catch (err) {
    console.error("[SemesterGrid]", err);
    return <ErrorState title="Couldn't load semesters" description="Please try again in a moment." />;
  }
  if (!semesters.length) {
    return (
      <EmptyState
        icon={<Library className="h-5 w-5" />}
        title="Nothing here yet"
        description="Your class representative hasn't published any semesters. Check back shortly."
      />
    );
  }
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {semesters.map((s) => (
        <SemesterCard key={s.id} semester={s} />
      ))}
    </div>
  );
}

async function RecentList() {
  let items: Awaited<ReturnType<typeof recentMaterials>>;
  try {
    items = await recentMaterials(7);
  } catch (err) {
    console.error("[RecentList]", err);
    return <ErrorState title="Couldn't load recent materials" description="Please try again in a moment." />;
  }
  if (!items.length) {
    return (
      <EmptyState
        icon={<Library className="h-5 w-5" />}
        title="No materials yet"
        description="Published notes, books and past papers will appear here."
      />
    );
  }
  return (
    <ul className="border-t border-[var(--border)]">
      {items.map((m) => (
        <MaterialRow key={m.id} material={m} />
      ))}
    </ul>
  );
}

async function PopularList() {
  let items: Awaited<ReturnType<typeof popularMaterials>>;
  try {
    items = await popularMaterials(5);
  } catch (err) {
    console.error("[PopularList]", err);
    return <ErrorState title="Couldn't load popular materials" description="Please try again in a moment." />;
  }
  if (!items.length) {
    return (
      <EmptyState
        icon={<Flame className="h-5 w-5" />}
        title="No downloads yet"
        description="The materials your class uses most will show up here."
      />
    );
  }
  return (
    <ol className="border-t border-[var(--border)]">
      {items.map((m, i) => (
        <li key={m.id} className="group relative flex items-center gap-3.5 border-b border-[var(--border)] py-3.5">
          <span className="numeral w-5 shrink-0 text-center text-[1.05rem] text-[var(--text-subtle)]">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="t-small truncate font-medium">
              <Link href={`/material/${m.slug}`} className="after:absolute after:inset-0 group-hover:text-[var(--accent)]">
                {m.title}
              </Link>
            </p>
            <p className="t-meta truncate">{m.subject_name}</p>
          </div>
          <span className="t-meta shrink-0 tabular-nums">{compactNumber(m.download_count)}</span>
        </li>
      ))}
    </ol>
  );
}
