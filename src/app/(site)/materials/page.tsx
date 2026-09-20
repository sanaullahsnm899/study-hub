import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { MaterialBrowser, type BrowseParams } from "@/components/public/material-browser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All materials",
  description: "Browse every published note, book, assignment and past paper.",
};

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<BrowseParams>;
}) {
  const params = await searchParams;
  return (
    <div className="shell py-8 sm:py-10">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "All materials" }]} />
      <h1 className="t-h1 mb-1">All materials</h1>
      <p className="t-caption mb-6">Everything published for the class, newest first.</p>
      <Suspense fallback={<CardGridSkeleton count={6} height="h-40" />}>
        <MaterialBrowser params={params} basePath="/materials" />
      </Suspense>
    </div>
  );
}
