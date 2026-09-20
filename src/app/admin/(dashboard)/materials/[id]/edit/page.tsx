import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MaterialForm } from "@/components/admin/material-form";
import { getMaterialById } from "@/lib/repo/materials";
import { listCategories, listSemesters, listSubjects } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit material" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [material, semesters, subjects, categories] = await Promise.all([
    getMaterialById(id),
    listSemesters({ includeInactive: true }),
    listSubjects({ includeInactive: true }),
    listCategories({ includeInactive: true }),
  ]);

  if (!material) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/materials"
        className="t-small mb-4 inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
      >
        <ArrowLeft className="h-4 w-4" /> Materials
      </Link>
      <h1 className="t-h1 mb-1 text-balance">{material.title}</h1>
      <p className="t-caption mb-6">
        {material.semester_name} · {material.subject_name} · {material.category_name}
      </p>
      <MaterialForm
        semesters={semesters}
        subjects={subjects}
        categories={categories}
        material={material}
      />
    </div>
  );
}
