import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Download, GraduationCap, Layers, RefreshCw } from "lucide-react";
import { MaterialActions, MaterialRow } from "@/components/public/cards";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FileIcon } from "@/components/ui/file-icon";
import { brand } from "@/lib/config";
import { getPublicMaterialBySlug, listPublicMaterials } from "@/lib/repo/materials";
import { fileKind, formatBytes, formatDate, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const material = await getPublicMaterialBySlug(slug).catch(() => null);
  if (!material) return { title: "Material not found" };
  const description =
    material.description ??
    `${material.category_name} for ${material.subject_name}, ${material.semester_name}.`;
  return {
    title: material.title,
    description,
    openGraph: {
      title: `${material.title} · ${brand.name}`,
      description,
      type: "article",
      publishedTime: material.published_at ?? undefined,
    },
    alternates: { canonical: `/material/${material.slug}` },
  };
}

export default async function MaterialPage({ params }: Props) {
  const { slug } = await params;
  const material = await getPublicMaterialBySlug(slug);
  if (!material) notFound();

  const related = await listPublicMaterials({
    subject: material.subject_slug,
    semester: material.semester_slug,
    pageSize: 5,
  });
  const others = related.items.filter((m) => m.id !== material.id).slice(0, 4);
  const isPdf = material.file_type === "application/pdf";
  const isExternal = !material.storage_file_id && Boolean(material.external_url);

  const meta = [
    { icon: Layers, label: "Category", value: material.category_name },
    { icon: GraduationCap, label: "Instructor", value: material.instructor || "—" },
    { icon: CalendarDays, label: "Added", value: formatDate(material.published_at || material.created_at) },
    { icon: RefreshCw, label: "Updated", value: timeAgo(material.updated_at) },
  ];

  return (
    <div className="shell py-8 sm:py-10">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: material.semester_name, href: `/semester/${material.semester_slug}` },
          {
            label: material.subject_name,
            href: `/semester/${material.semester_slug}/${material.subject_slug}`,
          },
          { label: material.title },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <article>
          <div className="flex items-start gap-4">
            <FileIcon mimeType={material.file_type} fileName={material.file_name} className="h-12 w-12 text-[0.72rem]" />
            <div className="min-w-0">
              <h1 className="t-h1 text-balance">{material.title}</h1>
              <p className="t-caption mt-1.5">
                <Link
                  href={`/semester/${material.semester_slug}/${material.subject_slug}`}
                  className="hover:text-[var(--accent)]"
                >
                  {material.subject_name}
                </Link>
                {" · "}
                {material.category_name}
              </p>
            </div>
          </div>

          {material.description && (
            <p className="t-body mt-5 max-w-prose text-[var(--text-muted)]">{material.description}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{material.semester_name}</Badge>
            {isExternal ? (
              <Badge tone="info">External link</Badge>
            ) : (
              <>
                <Badge tone="neutral">{fileKind(material.file_type, material.file_name)}</Badge>
                <Badge tone="neutral">{formatBytes(material.file_size)}</Badge>
              </>
            )}
            <Badge tone="neutral">
              <Download className="h-3 w-3" /> {material.download_count}
            </Badge>
          </div>

          <div className="mt-6">
            <MaterialActions material={material} />
            {isExternal && (
              <p className="t-meta mt-2 max-w-prose break-words">
                Opens {new URL(material.external_url!).hostname} in a new tab.
              </p>
            )}
          </div>

          {isPdf && (
            <section className="mt-8" aria-label="Document preview">
              <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface-2)]">
                <iframe
                  src={`/api/materials/${material.id}/view#view=FitH`}
                  title={`Preview of ${material.title}`}
                  loading="lazy"
                  className="h-[60vh] w-full border-0 bg-white"
                />
              </div>
              <p className="t-meta mt-2">
                Preview not loading on your phone? Use Download — some mobile browsers cannot display PDFs inline.
              </p>
            </section>
          )}
        </article>

        <aside className="space-y-6">
          <div className="surface-card p-5">
            <h2 className="t-h3 mb-3.5">Details</h2>
            <dl className="space-y-3">
              {meta.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-subtle)]" aria-hidden />
                  <div className="min-w-0">
                    <dt className="t-meta">{label}</dt>
                    <dd className="t-small truncate text-[var(--text)]">{value}</dd>
                  </div>
                </div>
              ))}
              {material.file_name && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-4 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <dt className="t-meta">File</dt>
                    <dd className="t-small break-all text-[var(--text)]">{material.file_name}</dd>
                  </div>
                </div>
              )}
            </dl>

            {material.tags.length > 0 && (
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <h3 className="t-meta mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {material.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?q=${encodeURIComponent(tag)}`}
                      className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[0.75rem] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {others.length > 0 && (
            <section aria-labelledby="related-heading">
              <h2 id="related-heading" className="t-h3 mb-1">
                More from {material.subject_name}
              </h2>
              <ul className="border-t border-[var(--border)]">
                {others.map((m) => (
                  <MaterialRow key={m.id} material={m} />
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
