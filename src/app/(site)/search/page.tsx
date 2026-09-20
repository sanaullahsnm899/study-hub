import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { MaterialBrowser, type BrowseParams } from "@/components/public/material-browser";
import { EmptyState } from "@/components/ui/states";
import { SearchForm } from "@/components/public/search-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search notes, books, assignments and past papers across every semester.",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;

  return (
    <div className="shell py-8 sm:py-10">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <h1 className="t-h1 mb-4">Search</h1>
      <div className="mb-7 max-w-lg">
        <SearchForm defaultValue={q ?? ""} />
      </div>

      {q ? (
        <>
          <p className="t-caption mb-5">
            Results for <span className="font-medium text-[var(--text)]">{q}</span>
          </p>
          <Suspense key={JSON.stringify(params)} fallback={<CardGridSkeleton count={4} height="h-40" />}>
            <MaterialBrowser
              params={params}
              basePath="/search"
              emptyTitle={`No results for “${q}”`}
              emptyDescription="Check the spelling, or try a broader term such as the subject name."
            />
          </Suspense>
        </>
      ) : (
        <EmptyState
          icon={<SearchX className="h-5 w-5" />}
          title="Search the library"
          description="Type a topic, subject, or file name. Press Ctrl K (⌘ K on Mac) anywhere to search quickly."
        />
      )}
    </div>
  );
}
