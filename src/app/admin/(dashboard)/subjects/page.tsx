import type { Metadata } from "next";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { listSemesters, listSubjects } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const [semesters, subjects] = await Promise.all([
    listSemesters({ includeInactive: true }),
    listSubjects({ includeInactive: true }),
  ]);
  return (
    <TaxonomyManager
      kind="subjects"
      semesters={semesters}
      items={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        sort_order: s.sort_order,
        is_active: s.is_active,
        material_count: s.material_count,
        code: s.code,
        icon: s.icon,
        semester_id: s.semester_id,
        semester_name: s.semester_name,
      }))}
    />
  );
}
