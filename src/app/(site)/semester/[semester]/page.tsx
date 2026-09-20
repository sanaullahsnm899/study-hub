import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookMarked } from "lucide-react";
import { SubjectCard } from "@/components/public/cards";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { brand } from "@/lib/config";
import { getSemesterBySlug, listSubjects } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ semester: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { semester } = await params;
  const found = await getSemesterBySlug(semester).catch(() => null);
  if (!found) return { title: "Semester not found" };
  return {
    title: found.name,
    description: `${found.subject_count} subjects and ${found.material_count} resources for ${found.name} on ${brand.name}.`,
    openGraph: { title: `${found.name} · ${brand.name}`, description: found.description ?? brand.description },
  };
}

export default async function SemesterPage({ params }: Params) {
  const { semester: slug } = await params;

  let semester: Awaited<ReturnType<typeof getSemesterBySlug>>;
  let subjects: Awaited<ReturnType<typeof listSubjects>> = [];
  try {
    semester = await getSemesterBySlug(slug);
    if (semester) subjects = await listSubjects({ semesterId: semester.id });
  } catch (err) {
    console.error("[SemesterPage]", err);
    return (
      <div className="shell py-8 sm:py-10">
        <ErrorState
          title="Couldn't load this semester"
          description="The library is temporarily unavailable. Please try again in a moment."
        />
      </div>
    );
  }
  if (!semester) notFound();

  return (
    <div className="shell py-8 sm:py-10">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: semester.name }]} />
      <header className="mb-7 flex items-baseline gap-4">
        <span className="numeral text-[2.75rem] leading-none text-[var(--accent)]">
          {semester.short_label || ""}
        </span>
        <div>
          <h1 className="t-h1">{semester.name}</h1>
          <p className="t-caption mt-1 tabular-nums">
            {semester.subject_count} subjects · {semester.material_count} resources
          </p>
        </div>
      </header>

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="h-5 w-5" />}
          title="No subjects yet"
          description="Subjects for this semester haven't been added. Check back soon."
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} href={`/semester/${semester.slug}/${s.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
