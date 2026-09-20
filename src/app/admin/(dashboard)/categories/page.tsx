import type { Metadata } from "next";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { listCategories } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategories({ includeInactive: true });
  return (
    <TaxonomyManager
      kind="categories"
      items={categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        sort_order: c.sort_order,
        is_active: c.is_active,
        material_count: c.material_count,
        icon: c.icon,
      }))}
    />
  );
}
