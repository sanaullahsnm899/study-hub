import { FileQuestion } from "lucide-react";
import { MaterialCard } from "./cards";
import { FilterBar, type FilterConfig } from "./filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { listPublicMaterials, type PublicFilters } from "@/lib/repo/materials";
import { listCategories, listSemesters, listSubjects } from "@/lib/repo/taxonomy";

export type BrowseParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function filtersFromParams(params: BrowseParams, overrides: Partial<PublicFilters> = {}): PublicFilters {
  const days = Number(one(params.days));
  const sort = one(params.sort);
  return {
    q: one(params.q) || undefined,
    semester: one(params.semester) || undefined,
    subject: one(params.subject) || undefined,
    category: one(params.category) || undefined,
    fileType: one(params.type) || undefined,
    since: days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined,
    page: Math.max(1, Number(one(params.page)) || 1),
    pageSize: 12,
    sort: sort === "popular" || sort === "title" ? sort : "recent",
    ...overrides,
  };
}

export async function MaterialBrowser({
  params,
  overrides = {},
  basePath,
  hideFilters = false,
  emptyTitle = "No materials found",
  emptyDescription = "Try a different subject, category or search term.",
}: {
  params: BrowseParams;
  overrides?: Partial<PublicFilters>;
  basePath: string;
  hideFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const filters = filtersFromParams(params, overrides);

  let result: Awaited<ReturnType<typeof listPublicMaterials>>;
  let semesters: Awaited<ReturnType<typeof listSemesters>> = [];
  let subjects: Awaited<ReturnType<typeof listSubjects>> = [];
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  try {
    [result, semesters, subjects, categories] = await Promise.all([
      listPublicMaterials(filters),
      hideFilters ? Promise.resolve([]) : listSemesters(),
      hideFilters ? Promise.resolve([]) : listSubjects(),
      hideFilters ? Promise.resolve([]) : listCategories(),
    ]);
  } catch (err) {
    console.error("[MaterialBrowser]", err);
    return (
      <ErrorState
        title="Couldn't load materials"
        description="The library is temporarily unavailable. Please try again in a moment."
      />
    );
  }

  const config: FilterConfig = {
    semesters: semesters.map((s) => ({ value: s.slug, label: s.name })),
    subjects: subjects.map((s) => ({ value: s.slug, label: s.name, semester: s.semester_slug })),
    categories: categories.filter((c) => c.material_count > 0).map((c) => ({ value: c.slug, label: c.name })),
  };

  function hrefFor(page: number) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = one(value);
      if (v && key !== "page") next.set(key, v);
    }
    if (page > 1) next.set("page", String(page));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <>
      {!hideFilters && <FilterBar config={config} resultCount={result.total} />}
      {result.items.length === 0 ? (
        <EmptyState icon={<FileQuestion className="h-5 w-5" />} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {result.items.map((m) => (
            <MaterialCard key={m.id} material={m} />
          ))}
        </div>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} total={result.total} buildHref={hrefFor} />
    </>
  );
}
