import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Layers, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import {
  dashboardStats,
  downloadsPerDay,
  materialsByCategory,
  materialsBySemester,
  topDownloads,
} from "@/lib/repo/analytics";
import { compactNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const [stats, perDay, bySemester, byCategory, top] = await Promise.all([
    dashboardStats(),
    downloadsPerDay(30),
    materialsBySemester(),
    materialsByCategory(),
    topDownloads(8),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="t-h1">Analytics</h1>
      <p className="t-caption mb-6 mt-1">
        Anonymous counts only — no student is identified or tracked.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total downloads"
          value={compactNumber(stats.downloads)}
          hint="All time"
          icon={<Download className="h-4 w-4" />}
        />
        <StatCard
          label="Last 30 days"
          value={compactNumber(stats.downloads_30d)}
          hint="Downloads and opens"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Published"
          value={stats.published}
          hint={`${stats.drafts} drafts · ${stats.archived} archived`}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Structure"
          value={`${stats.semesters}/${stats.subjects}`}
          hint="Semesters / subjects"
          icon={<Layers className="h-4 w-4" />}
        />
      </div>

      <section className="surface-card mt-6 p-5" aria-labelledby="trend-heading">
        <h2 id="trend-heading" className="t-h3">
          Downloads over the last 30 days
        </h2>
        <p className="t-meta mb-4 mt-0.5">
          Peak day: {Math.max(...perDay.map((d) => d.total), 0)} ·{" "}
          {perDay.reduce((sum, d) => sum + d.total, 0)} total
        </p>
        <TrendChart data={perDay} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-5" aria-labelledby="semester-heading">
          <h2 id="semester-heading" className="t-h3 mb-4">
            Materials by semester
          </h2>
          {bySemester.length === 0 ? (
            <EmptyState title="Nothing to show yet" description="Add a semester to see the breakdown." />
          ) : (
            <BarList
              rows={bySemester.map((s) => ({
                label: s.name,
                value: s.total,
                caption: `${s.published} published · ${s.downloads} downloads`,
              }))}
            />
          )}
        </section>

        <section className="surface-card p-5" aria-labelledby="category-heading">
          <h2 id="category-heading" className="t-h3 mb-4">
            Materials by category
          </h2>
          {byCategory.length === 0 ? (
            <EmptyState title="Nothing to show yet" description="Add a category to see the breakdown." />
          ) : (
            <BarList rows={byCategory.map((c) => ({ label: c.name, value: c.total }))} />
          )}
        </section>
      </div>

      <section className="surface-card mt-6 p-5" aria-labelledby="top-heading">
        <h2 id="top-heading" className="t-h3 mb-3">
          Most downloaded
        </h2>
        {top.length === 0 ? (
          <EmptyState title="No downloads yet" description="Counts appear here once students start opening files." />
        ) : (
          <ol className="divide-y divide-[var(--border)]">
            {top.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <span className="numeral w-5 shrink-0 text-right text-[0.8rem] text-[var(--text-subtle)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/materials/${m.id}/edit`}
                    className="t-small block truncate font-medium hover:text-[var(--accent)]"
                  >
                    {m.title}
                  </Link>
                  <p className="t-meta truncate">{m.subject_name}</p>
                </div>
                <span className="t-small shrink-0 tabular-nums text-[var(--text-muted)]">
                  {m.download_count}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------- charts */

function TrendChart({ data }: { data: { day: string; total: number }[] }) {
  const width = 720;
  const height = 180;
  const pad = { top: 12, right: 4, bottom: 22, left: 26 };
  const max = Math.max(4, ...data.map((d) => d.total));
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const points = data.map((d, i) => ({
    x: pad.left + i * step,
    y: pad.top + innerH - (d.total / max) * innerH,
    ...d,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${(pad.left + innerW).toFixed(1)},${pad.top + innerH} L${pad.left},${pad.top + innerH} Z`;
  const gridValues = [0, max / 2, max];

  const first = data[0]?.day ?? "";
  const last = data[data.length - 1]?.day ?? "";

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        role="img"
        aria-label={`Downloads per day for the last ${data.length} days. Peak ${max}.`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridValues.map((v, i) => {
          const y = pad.top + innerH - (v / max) * innerH;
          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text x={0} y={y + 3.5} fill="var(--text-subtle)" fontSize="9">
                {Math.round(v)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#trend-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <text x={pad.left} y={height - 6} fill="var(--text-subtle)" fontSize="9">
          {first.slice(5)}
        </text>
        <text x={width - pad.right} y={height - 6} textAnchor="end" fill="var(--text-subtle)" fontSize="9">
          {last.slice(5)}
        </text>
      </svg>
    </figure>
  );
}

function BarList({ rows }: { rows: { label: string; value: number; caption?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="t-small truncate font-medium">{r.label}</span>
            <span className="t-small shrink-0 tabular-nums text-[var(--text-muted)]">{r.value}</span>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </div>
          {r.caption && <p className="t-meta mt-1">{r.caption}</p>}
        </li>
      ))}
    </ul>
  );
}
