"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { FileIcon } from "@/components/ui/file-icon";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/admin-client";
import type { Category, MaterialWithRefs, Paginated, Semester, SubjectWithCounts } from "@/lib/types";
import { formatBytes, timeAgo } from "@/lib/utils";

type Props = {
  semesters: Semester[];
  subjects: SubjectWithCounts[];
  categories: Category[];
};

type Filters = {
  q: string;
  status: string;
  semester: string;
  subject: string;
  category: string;
  type: string;
  sort: string;
};

const EMPTY: Filters = { q: "", status: "all", semester: "", subject: "", category: "", type: "", sort: "recent" };
const PAGE_SIZE = 20;

export function MaterialsTable({ semesters, subjects, categories }: Props) {
  const toast = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ query: string; data: Paginated<MaterialWithRefs> } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<MaterialWithRefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q.trim()), 250);
    return () => clearTimeout(t);
  }, [filters.q]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (debouncedQ) sp.set("q", debouncedQ);
    if (filters.status !== "all") sp.set("status", filters.status);
    if (filters.semester) sp.set("semester", filters.semester);
    if (filters.subject) sp.set("subject", filters.subject);
    if (filters.category) sp.set("category", filters.category);
    if (filters.type) sp.set("type", filters.type);
    if (filters.sort && filters.sort !== "recent") sp.set("sort", filters.sort);
    sp.set("page", String(page));
    sp.set("pageSize", String(PAGE_SIZE));
    return sp.toString();
  }, [
    debouncedQ,
    filters.status,
    filters.semester,
    filters.subject,
    filters.category,
    filters.type,
    filters.sort,
    page,
  ]);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await api<Paginated<MaterialWithRefs>>(`/api/admin/materials?${query}`);
        if (controller.signal.aborted) return;
        setResult({ query, data });
        setSelected([]);
      } catch (err) {
        if (controller.signal.aborted) return;
        toast.push(err instanceof ApiError ? err.message : "Could not load materials.", "error");
      }
    })();
    return () => controller.abort();
  }, [query, reloadKey, toast]);

  /** Any filter change also returns to the first page. */
  function update(patch: Partial<Filters>) {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  }

  const data = result?.data ?? null;
  const loading = !result || result.query !== query;
  const items = data?.items ?? [];
  const subjectsForSemester = filters.semester
    ? subjects.filter((s) => s.semester_slug === filters.semester)
    : subjects;
  const activeFilterCount = [
    filters.status !== "all",
    filters.semester,
    filters.subject,
    filters.category,
    filters.type,
    filters.sort !== "recent",
  ].filter(Boolean).length;

  const allSelected = items.length > 0 && selected.length === items.length;

  function toggleAll() {
    setSelected(allSelected ? [] : items.map((m) => m.id));
  }

  function toggleOne(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function bulk(action: "publish" | "unpublish" | "archive" | "delete") {
    setBusy(true);
    try {
      const res = await api<{ affected: number }>("/api/admin/materials/bulk", {
        body: { ids: selected, action },
      });
      toast.push(
        `${res.affected} material${res.affected === 1 ? "" : "s"} ${
          action === "delete" ? "deleted" : action === "unpublish" ? "moved to draft" : `${action}ed`
        }.`,
      );
      await load();
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : "That bulk action failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(m: MaterialWithRefs) {
    try {
      await api(`/api/admin/materials/${m.id}`, {
        method: "PATCH",
        body: { status: m.status === "published" ? "draft" : "published" },
      });
      toast.push(m.status === "published" ? "Moved to draft." : "Material published.");
      await load();
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : "Could not change the status.", "error");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/materials/${deleting.id}`, { method: "DELETE" });
      toast.push("Material deleted.");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : "Could not delete that material.", "error");
    } finally {
      setBusy(false);
    }
  }

  const filterControls = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Select
        aria-label="Status"
        value={filters.status}
        onChange={(e) => update({ status: e.target.value })}
      >
        <option value="all">Any status</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </Select>
      <Select
        aria-label="Semester"
        value={filters.semester}
        onChange={(e) => update({ semester: e.target.value, subject: "" })}
      >
        <option value="">All semesters</option>
        {semesters.map((s) => (
          <option key={s.id} value={s.slug}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Subject"
        value={filters.subject}
        onChange={(e) => update({ subject: e.target.value })}
      >
        <option value="">All subjects</option>
        {subjectsForSemester.map((s) => (
          <option key={s.id} value={s.slug}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Category"
        value={filters.category}
        onChange={(e) => update({ category: e.target.value })}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="File type"
        value={filters.type}
        onChange={(e) => update({ type: e.target.value })}
      >
        <option value="">Any file type</option>
        <option value="pdf">PDF</option>
        <option value="doc">Word</option>
        <option value="ppt">Slides</option>
        <option value="image">Image</option>
        <option value="link">External link</option>
      </Select>
      <Select
        aria-label="Sort by"
        value={filters.sort}
        onChange={(e) => update({ sort: e.target.value })}
      >
        <option value="recent">Recently updated</option>
        <option value="popular">Most downloaded</option>
        <option value="title">Title A–Z</option>
      </Select>
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h1">Materials</h1>
          <p className="t-caption mt-1">
            {data ? `${data.total} material${data.total === 1 ? "" : "s"} in the library` : "Loading…"}
          </p>
        </div>
        <ButtonLink href="/admin/materials/new">
          <Plus className="h-4 w-4" /> Add material
        </ButtonLink>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]"
              aria-hidden
            />
            <Input
              value={filters.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Search titles, descriptions and tags…"
              className="pl-9"
              aria-label="Search materials"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setSheetOpen(true)}
            className="lg:hidden"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="numeral rounded-full bg-[var(--accent)] px-1.5 text-[0.7rem] text-[var(--on-accent)]">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" onClick={() => update({ ...EMPTY, q: filters.q })} className="hidden lg:inline-flex">
              Clear
            </Button>
          )}
        </div>
        <div className="hidden lg:block">{filterControls}</div>
      </div>

      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters" variant="sheet" size="sm">
        <div className="space-y-3">{filterControls}</div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => update({ ...EMPTY, q: filters.q })} className="flex-1">
            Clear all
          </Button>
          <Button onClick={() => setSheetOpen(false)} className="flex-1">
            Show results
          </Button>
        </div>
      </Dialog>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
          <span className="t-small font-medium">{selected.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => bulk("publish")} disabled={busy}>
              Publish
            </Button>
            <Button size="sm" variant="secondary" onClick={() => bulk("unpublish")} disabled={busy}>
              Unpublish
            </Button>
            <Button size="sm" variant="secondary" onClick={() => bulk("archive")} disabled={busy}>
              Archive
            </Button>
            <Button size="sm" variant="danger" onClick={() => bulk("delete")} disabled={busy}>
              Delete
            </Button>
          </div>
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-[var(--r-md)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No materials match"
          description={
            activeFilterCount || debouncedQ
              ? "Try removing a filter or searching for something broader."
              : "Upload your first note, book or past paper and publish it to the class."
          }
          action={
            activeFilterCount || debouncedQ ? (
              <Button variant="secondary" onClick={() => update(EMPTY)}>
                Clear filters
              </Button>
            ) : (
              <ButtonLink href="/admin/materials/new">
                <Plus className="h-4 w-4" /> Add material
              </ButtonLink>
            )
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="surface-card hidden overflow-hidden md:block" aria-busy={loading}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th scope="col" className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all materials on this page"
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </th>
                  <th scope="col" className="t-meta px-2 py-2.5 font-medium">Material</th>
                  <th scope="col" className="t-meta px-2 py-2.5 font-medium">Subject</th>
                  <th scope="col" className="t-meta px-2 py-2.5 font-medium">Category</th>
                  <th scope="col" className="t-meta px-2 py-2.5 font-medium">Status</th>
                  <th scope="col" className="t-meta px-2 py-2.5 font-medium">Updated</th>
                  <th scope="col" className="t-meta px-2 py-2.5 text-right font-medium">Downloads</th>
                  <th scope="col" className="t-meta px-3 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-[var(--surface-2)]/60">
                    <td className="px-3 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.includes(m.id)}
                        onChange={() => toggleOne(m.id)}
                        aria-label={`Select ${m.title}`}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </td>
                    <td className="max-w-[22rem] px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileIcon
                          mimeType={m.file_type}
                          fileName={m.file_name ?? (m.external_url ? "link" : null)}
                          className="h-8 w-8"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/materials/${m.id}/edit`}
                            className="t-small block truncate font-medium hover:text-[var(--accent)]"
                          >
                            {m.title}
                          </Link>
                          <p className="t-meta truncate">
                            {m.semester_name}
                            {m.file_size ? ` · ${formatBytes(m.file_size)}` : m.external_url ? " · link" : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="t-small px-2 py-3 text-[var(--text-muted)]">{m.subject_name}</td>
                    <td className="t-small px-2 py-3 text-[var(--text-muted)]">{m.category_name}</td>
                    <td className="px-2 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="t-meta px-2 py-3">{timeAgo(m.updated_at)}</td>
                    <td className="t-small px-2 py-3 text-right tabular-nums">{m.download_count}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggleStatus(m)}
                          title={m.status === "published" ? "Unpublish" : "Publish"}
                          aria-label={m.status === "published" ? `Unpublish ${m.title}` : `Publish ${m.title}`}
                          className="rounded p-1.5 text-[var(--text-subtle)] hover:bg-[var(--surface-3)] hover:text-[var(--accent)]"
                        >
                          {m.status === "published" ? (
                            <RotateCcw className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={m.external_url || `/api/materials/${m.id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview"
                          aria-label={`Preview ${m.title}`}
                          className="rounded p-1.5 text-[var(--text-subtle)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        {m.storage_file_id && (
                          <a
                            href={`/api/materials/${m.id}/download`}
                            title="Download"
                            aria-label={`Download ${m.title}`}
                            className="rounded p-1.5 text-[var(--text-subtle)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                          >
                            <ArrowDownToLine className="h-4 w-4" />
                          </a>
                        )}
                        <Link
                          href={`/admin/materials/${m.id}/edit`}
                          title="Edit"
                          aria-label={`Edit ${m.title}`}
                          className="rounded p-1.5 text-[var(--text-subtle)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleting(m)}
                          title="Delete"
                          aria-label={`Delete ${m.title}`}
                          className="rounded p-1.5 text-[var(--text-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {items.map((m) => (
              <li key={m.id} className="surface-card p-3.5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    onChange={() => toggleOne(m.id)}
                    aria-label={`Select ${m.title}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/materials/${m.id}/edit`} className="t-small block font-medium">
                      {m.title}
                    </Link>
                    <p className="t-meta mt-0.5">
                      {m.subject_name} · {m.category_name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={m.status} />
                      <span className="t-meta">{timeAgo(m.updated_at)}</span>
                      <span className="t-meta tabular-nums">{m.download_count} downloads</span>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => toggleStatus(m)} className="flex-1">
                        {m.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <ButtonLink size="sm" variant="secondary" href={`/admin/materials/${m.id}/edit`} className="flex-1">
                        Edit
                      </ButtonLink>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(m)} aria-label={`Delete ${m.title}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {data && data.pageCount > 1 && (
            <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pagination">
              <p className="t-meta">
                Page {data.page} of {data.pageCount} · {data.total} results
              </p>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(data.pageCount, p + 1))}
                  disabled={data.page === data.pageCount || loading}
                >
                  Next
                </Button>
              </div>
            </nav>
          )}

          {loading && (
            <p className="t-meta mt-4 flex items-center gap-2" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title={`Delete “${deleting?.title ?? ""}”?`}
        description="This removes the material from the public library. The stored file is kept, so it can be restored from the database if needed."
      />
    </div>
  );
}
