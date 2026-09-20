import type { Metadata } from "next";
import { MaterialsTable } from "@/components/admin/materials-table";
import { listCategories, listSemesters, listSubjects } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Materials" };

export default async function AdminMaterialsPage() {
  const [semesters, subjects, categories] = await Promise.all([
    listSemesters({ includeInactive: true }),
    listSubjects({ includeInactive: true }),
    listCategories({ includeInactive: true }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <MaterialsTable semesters={semesters} subjects={subjects} categories={categories} />
    </div>
  );
}
