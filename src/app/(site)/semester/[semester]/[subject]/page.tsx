import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FolderOpen } from "lucide-react";
import { CategoryCard } from "@/components/public/cards";
import { MaterialBrowser, type BrowseParams } from "@/components/public/material-browser";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { SubjectIcon } from "@/components/ui/subject-icon";
import { brand } from "@/lib/config";
import { getCategoryBySlug, getSubjectBySlug } from "@/lib/repo/taxonomy";
import { listCategoriesForSubject } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ semester: string; subject: string }>;
  searchParams: Promise<BrowseParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { semester, subject } = await params;
  const found = await getSubjectBySlug(semester, subject).catch(() => null);
  if (!found) return { title: "Subject not found" };
  return {
    title: found.name,
    description: `${found.material_count} resources for ${found.name} (${found.semester_name}) on ${brand.name}.`,
  };
}

export default async function SubjectPage({ params, searchParams }: Props) {
  const { semester: semesterSlug, subject: subjectSlug } = await params;
  const query = await searchParams;
  const subject = await getSubjectBySlug(semesterSlug, subjectSlug);
  if (!subject) notFound();

  const categories = await listCategoriesForSubject(subject.id);
  const activeSlug = Array.isArray(query.category) ? query.category[0] : query.category;
  const activeCategory = activeSlug ? await getCategoryBySlug(activeSlug) : null;
  const basePath = `/semester/${semesterSlug}/${subjectSlug}`;

  return (
    <div className="shell py-8 sm:py-10">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: subject.semester_name ?? "Semester", href: `/semester/${semesterSlug}` },
          ...(activeCategory ? [{ label: subject.name, href: basePath }, { label: activeCategory.name }] : [{ label: subject.name }]),
        ]}
      />

      <header className="mb-7 flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <SubjectIcon name={subject.icon} className="h-5 w-5" />
        </span>
        <div>
          <h1 className="t-h1">{subject.name}</h1>
          <p className="t-caption mt-1 tabular-nums">
            {subject.code ? `${subject.code} · ` : ""}
            {subject.material_count} {subject.material_count === 1 ? "resource" : "resources"}
          </p>
        </div>
      </header>

      {activeCategory ? (
        <Suspense key={JSON.stringify(query)} fallback={<CardGridSkeleton count={4} height="h-40" />}>
          <MaterialBrowser
            params={query}
            overrides={{ semester: semesterSlug, subject: subjectSlug, category: activeCategory.slug }}
            basePath={basePath}
            hideFilters
            emptyTitle="Nothing in this category yet"
            emptyDescription="Materials filed here will appear as soon as they are published."
          />
        </Suspense>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-5 w-5" />}
          title="No materials yet"
          description="Materials for this subject haven't been uploaded. Check back before the exam."
        />
      ) : (
        <>
          <h2 className="t-h2 mb-4">Categories</h2>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} href={`${basePath}?category=${c.slug}`} />
            ))}
          </div>
          <div className="mt-10">
            <h2 className="t-h2 mb-4">Latest in {subject.name}</h2>
            <Suspense fallback={<CardGridSkeleton count={4} height="h-40" />}>
              <MaterialBrowser
                params={{}}
                overrides={{ semester: semesterSlug, subject: subjectSlug, pageSize: 4 }}
                basePath={basePath}
                hideFilters
                emptyTitle="No materials yet"
              />
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
}
