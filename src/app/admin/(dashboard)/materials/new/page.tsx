import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MaterialForm } from "@/components/admin/material-form";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { listCategories, listSemesters, listSubjects } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Add material" };

export default async function NewMaterialPage() {
  const [semesters, subjects, categories] = await Promise.all([
    listSemesters({ includeInactive: true }),
    listSubjects({ includeInactive: true }),
    listCategories({ includeInactive: true }),
  ]);

  const ready = semesters.length > 0 && subjects.length > 0 && categories.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/materials"
        className="t-small mb-4 inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
      >
        <ArrowLeft className="h-4 w-4" /> Materials
      </Link>
      <h1 className="t-h1 mb-1">Add material</h1>
      <p className="t-caption mb-6">Upload a file or link to an external resource, then publish it to the class.</p>

      {ready ? (
        <MaterialForm semesters={semesters} subjects={subjects} categories={categories} />
      ) : (
        <EmptyState
          title="Set up your structure first"
          description="You need at least one semester, one subject and one category before adding material."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/admin/semesters" variant={semesters.length ? "secondary" : "primary"}>
                Semesters
              </ButtonLink>
              <ButtonLink href="/admin/subjects" variant={subjects.length ? "secondary" : "primary"}>
                Subjects
              </ButtonLink>
              <ButtonLink href="/admin/categories" variant={categories.length ? "secondary" : "primary"}>
                Categories
              </ButtonLink>
            </div>
          }
        />
      )}
    </div>
  );
}
