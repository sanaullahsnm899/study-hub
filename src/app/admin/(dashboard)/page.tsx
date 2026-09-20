import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Download, FileText, Layers, Plus, Upload } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { requireSession } from "@/lib/auth";
import { dashboardStats } from "@/lib/repo/analytics";
import { listAdminMaterials } from "@/lib/repo/materials";
import { storageStatus } from "@/lib/storage";
import { compactNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AdminDashboard() {
  const session = await requireSession();
  const storage = storageStatus();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h1">
            {greeting()}, {session.name.split(" ")[0]}.
          </h1>
          <p className="t-caption mt-1">Here is what is happening in your library.</p>
        </div>
        <ButtonLink href="/admin/materials/new">
          <Plus className="h-4 w-4" /> Add material
        </ButtonLink>
      </div>

      {!storage.googleDriveConfigured && (
        <div className="mb-6 flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--warning-soft)] px-4 py-3.5">
          <Upload className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" aria-hidden />
          <div>
            <p className="t-small font-medium text-[var(--text)]">
              Files are being stored on the local disk
            </p>
            <p className="t-caption mt-0.5">
              Add your Google Drive service-account variables to store uploads in Drive. On Vercel the
              local disk is wiped between deployments.{" "}
              <Link href="/admin/settings" className="text-[var(--accent)] hover:underline">
                Setup instructions
              </Link>
            </p>
          </div>
        </div>
      )}

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <section className="mt-8" aria-labelledby="recent-heading">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="recent-heading" className="t-h2">
            Recent materials
          </h2>
          <Link href="/admin/materials" className="t-small text-[var(--text-muted)] hover:text-[var(--accent)]">
            View all
          </Link>
        </div>
        <Suspense fallback={<Skeleton className="h-64 rounded-[var(--r-lg)]" />}>
          <RecentTable />
        </Suspense>
      </section>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[6.5rem] rounded-[var(--r-lg)]" />
      ))}
    </div>
  );
}

async function Stats() {
  const stats = await dashboardStats();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Materials"
        value={stats.materials}
        hint={`${stats.published} published · ${stats.drafts} draft`}
        icon={<FileText className="h-4 w-4" />}
      />
      <StatCard label="Subjects" value={stats.subjects} hint={`${stats.semesters} semesters`} icon={<Layers className="h-4 w-4" />} />
      <StatCard
        label="Downloads"
        value={compactNumber(stats.downloads)}
        hint={`${stats.downloads_30d} in the last 30 days`}
        icon={<Download className="h-4 w-4" />}
      />
      <StatCard label="Added this week" value={stats.uploads_7d} hint="New materials in 7 days" icon={<ArrowUpRight className="h-4 w-4" />} />
    </div>
  );
}

async function RecentTable() {
  const { items } = await listAdminMaterials({ pageSize: 6 });
  if (!items.length) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="No materials yet"
        description="Upload your first note, book or past paper and publish it to the class."
        action={
          <ButtonLink href="/admin/materials/new">
            <Plus className="h-4 w-4" /> Add material
          </ButtonLink>
        }
      />
    );
  }
  return (
    <ul className="surface-card divide-y divide-[var(--border)]">
      {items.map((m) => (
        <li key={m.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link href={`/admin/materials/${m.id}/edit`} className="t-small block truncate font-medium hover:text-[var(--accent)]">
              {m.title}
            </Link>
            <p className="t-meta truncate">
              {m.subject_name} · {m.category_name} · {timeAgo(m.updated_at)}
            </p>
          </div>
          <span className="hidden shrink-0 sm:block">
            <StatusBadge status={m.status} />
          </span>
          <span className="t-meta w-12 shrink-0 text-right tabular-nums">{m.download_count}</span>
        </li>
      ))}
    </ul>
  );
}
