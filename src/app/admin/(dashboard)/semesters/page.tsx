import type { Metadata } from "next";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { listSemesters } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Semesters" };

export default async function SemestersPage() {
  const semesters = await listSemesters({ includeInactive: true });
  return (
    <TaxonomyManager
      kind="semesters"
      items={semesters.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        sort_order: s.sort_order,
        is_active: s.is_active,
        material_count: s.material_count,
        short_label: s.short_label,
      }))}
    />
  );
}
