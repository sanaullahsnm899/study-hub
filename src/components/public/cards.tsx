import Link from "next/link";
import { ArrowRight, Download, ExternalLink, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { FileIcon } from "@/components/ui/file-icon";
import { SubjectIcon } from "@/components/ui/subject-icon";
import type { CategoryWithCount, MaterialWithRefs, SemesterWithCounts, SubjectWithCounts } from "@/lib/types";
import { cn, formatBytes, timeAgo } from "@/lib/utils";

const hoverCard =
  "group relative surface-card transition-[border-color,box-shadow,transform] duration-[var(--normal)] " +
  "hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] focus-within:border-[var(--accent)]";

export function SemesterCard({ semester }: { semester: SemesterWithCounts }) {
  return (
    <article className={cn(hoverCard, "flex items-stretch overflow-hidden")}>
      <div className="flex w-[4.75rem] shrink-0 items-center justify-center border-r border-[var(--border)] bg-[var(--surface-2)] transition-colors duration-[var(--normal)] group-hover:bg-[var(--accent-soft)]">
        <span className="numeral text-[1.75rem] leading-none text-[var(--text-muted)] transition-colors duration-[var(--normal)] group-hover:text-[var(--accent)]">
          {semester.short_label || semester.name.slice(0, 2)}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <h3 className="t-h3 truncate">
            <Link href={`/semester/${semester.slug}`} className="after:absolute after:inset-0">
              {semester.name}
            </Link>
          </h3>
          <p className="t-caption mt-0.5 tabular-nums">
            {semester.subject_count} subjects · {semester.material_count} resources
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-subtle)] transition-transform duration-[var(--normal)] group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
      </div>
    </article>
  );
}

export function SubjectCard({ subject, href }: { subject: SubjectWithCounts; href: string }) {
  return (
    <article className={cn(hoverCard, "flex items-center gap-3.5 px-4 py-4")}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors duration-[var(--normal)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]">
        <SubjectIcon name={subject.icon} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="t-h3 truncate">
          <Link href={href} className="after:absolute after:inset-0">
            {subject.name}
          </Link>
        </h3>
        <p className="t-caption mt-0.5 tabular-nums">
          {subject.code ? `${subject.code} · ` : ""}
          {subject.material_count} {subject.material_count === 1 ? "resource" : "resources"}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-subtle)] transition-transform duration-[var(--normal)] group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
    </article>
  );
}

export function CategoryCard({ category, href }: { category: CategoryWithCount; href: string }) {
  return (
    <article className={cn(hoverCard, "px-4 py-4")}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors duration-[var(--normal)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]">
        <SubjectIcon name={category.icon} />
      </span>
      <h3 className="t-h3 mt-3">
        <Link href={href} className="after:absolute after:inset-0">
          {category.name}
        </Link>
      </h3>
      <p className="t-caption mt-0.5 tabular-nums">
        {category.material_count} {category.material_count === 1 ? "resource" : "resources"}
      </p>
    </article>
  );
}

export function MaterialCard({ material }: { material: MaterialWithRefs }) {
  const isLink = !material.storage_file_id && material.external_url;
  return (
    <article className={cn(hoverCard, "flex gap-3.5 px-4 py-4")}>
      <FileIcon mimeType={material.file_type} fileName={material.file_name} />
      <div className="min-w-0 flex-1">
        <h3 className="t-h3 leading-snug">
          <Link href={`/material/${material.slug}`} className="after:absolute after:inset-0">
            {material.title}
          </Link>
        </h3>
        <p className="t-caption mt-1 tabular-nums">
          {material.subject_name} · {material.category_name} · {timeAgo(material.published_at || material.created_at)}
        </p>
        {material.description && (
          <p className="t-small mt-2 line-clamp-2 text-[var(--text-muted)]">{material.description}</p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{material.semester_name}</Badge>
          {isLink ? (
            <Badge tone="info">External link</Badge>
          ) : (
            material.file_size != null && <Badge tone="neutral">{formatBytes(material.file_size)}</Badge>
          )}
        </div>
      </div>
    </article>
  );
}

/** Compact row used in "Recently added" — quieter than a full card. */
export function MaterialRow({ material }: { material: MaterialWithRefs }) {
  return (
    <li className="group relative flex items-center gap-3.5 border-b border-[var(--border)] py-3.5 last:border-0">
      <FileIcon mimeType={material.file_type} fileName={material.file_name} className="h-8 w-8" />
      <div className="min-w-0 flex-1">
        <p className="t-small truncate font-medium text-[var(--text)]">
          <Link
            href={`/material/${material.slug}`}
            className="after:absolute after:inset-0 group-hover:text-[var(--accent)]"
          >
            {material.title}
          </Link>
        </p>
        <p className="t-meta truncate">
          {material.subject_name} · {timeAgo(material.published_at || material.created_at)}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-subtle)] opacity-0 transition-opacity duration-[var(--fast)] group-hover:opacity-100" />
    </li>
  );
}

export function MaterialActions({ material }: { material: MaterialWithRefs }) {
  if (!material.storage_file_id && material.external_url) {
    return (
      <a
        href={`/api/materials/${material.id}/open`}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={buttonClass("primary", "md")}
      >
        <ExternalLink className="h-4 w-4" /> Open resource
      </a>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`/api/materials/${material.id}/view`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass("primary", "md")}
      >
        <Eye className="h-4 w-4" /> View
      </a>
      <a href={`/api/materials/${material.id}/download`} className={buttonClass("secondary", "md")}>
        <Download className="h-4 w-4" /> Download
      </a>
    </div>
  );
}
