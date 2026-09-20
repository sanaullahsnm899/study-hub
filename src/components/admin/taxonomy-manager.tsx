"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { SubjectIcon, iconNames } from "@/components/ui/subject-icon";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/admin-client";
import type { Semester } from "@/lib/types";

export type TaxonomyKind = "semesters" | "subjects" | "categories";

export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  material_count: number;
  short_label?: string | null;
  code?: string | null;
  icon?: string | null;
  semester_id?: string;
  semester_name?: string;
};

type Draft = {
  name: string;
  description: string;
  short_label: string;
  code: string;
  icon: string;
  semester_id: string;
  is_active: boolean;
};

const COPY: Record<TaxonomyKind, { singular: string; plural: string; blurb: string; empty: string }> = {
  semesters: {
    singular: "Semester",
    plural: "Semesters",
    blurb: "The top level of the library. Students pick a semester first.",
    empty: "Add the semesters your class is currently studying.",
  },
  subjects: {
    singular: "Subject",
    plural: "Subjects",
    blurb: "Each subject belongs to a semester and holds its materials.",
    empty: "Add the subjects taught in each semester.",
  },
  categories: {
    singular: "Category",
    plural: "Categories",
    blurb: "Shared across every subject — notes, books, past papers and so on.",
    empty: "Add the kinds of material you share: notes, past papers, slides.",
  },
};

function emptyDraft(semesterId = ""): Draft {
  return {
    name: "",
    description: "",
    short_label: "",
    code: "",
    icon: "book",
    semester_id: semesterId,
    is_active: true,
  };
}

export function TaxonomyManager({
  kind,
  items: initialItems,
  semesters = [],
}: {
  kind: TaxonomyKind;
  items: TaxonomyItem[];
  semesters?: Semester[];
}) {
  const router = useRouter();
  const toast = useToast();
  const copy = COPY[kind];

  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<TaxonomyItem | null>(null);
  const [semesterFilter, setSemesterFilter] = useState("");

  // Re-sync when the server sends a fresh list (the documented "adjust state
  // during render" pattern, rather than a setState-in-effect round trip).
  const [lastProps, setLastProps] = useState(initialItems);
  if (lastProps !== initialItems) {
    setLastProps(initialItems);
    setItems(initialItems);
  }

  const visible = useMemo(
    () => (kind === "subjects" && semesterFilter ? items.filter((i) => i.semester_id === semesterFilter) : items),
    [items, kind, semesterFilter],
  );

  const open = creating || Boolean(editing);

  function startCreate() {
    setErrors({});
    setDraft(emptyDraft(semesterFilter || semesters[0]?.id || ""));
    setCreating(true);
  }

  function startEdit(item: TaxonomyItem) {
    setErrors({});
    setDraft({
      name: item.name,
      description: item.description ?? "",
      short_label: item.short_label ?? "",
      code: item.code ?? "",
      icon: item.icon ?? (kind === "categories" ? "file" : "book"),
      semester_id: item.semester_id ?? "",
      is_active: item.is_active,
    });
    setEditing(item);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  function payload() {
    const base: Record<string, unknown> = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      is_active: draft.is_active,
    };
    if (kind === "semesters") base.short_label = draft.short_label.trim();
    if (kind === "subjects") {
      base.semester_id = draft.semester_id;
      base.code = draft.code.trim();
      base.icon = draft.icon;
    }
    if (kind === "categories") base.icon = draft.icon;
    return base;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (editing) {
        await api(`/api/admin/${kind}/${editing.id}`, { method: "PATCH", body: payload() });
        toast.push(`${copy.singular} updated.`);
      } else {
        await api(`/api/admin/${kind}`, { body: { ...payload(), sort_order: items.length } });
        toast.push(`${copy.singular} created.`);
      }
      close();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details ?? {});
        toast.push(err.message, "error");
      } else {
        toast.push("Could not save. Please try again.", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: TaxonomyItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i)));
    try {
      await api(`/api/admin/${kind}/${item.id}`, { method: "PATCH", body: { is_active: !item.is_active } });
      toast.push(item.is_active ? `${copy.singular} hidden from students.` : `${copy.singular} is live.`);
      router.refresh();
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: item.is_active } : i)));
      toast.push(err instanceof ApiError ? err.message : "Could not update.", "error");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const list = [...visible];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];

    // reflect immediately, then persist the new order for the whole visible group
    const ids = list.map((i) => i.id);
    const rest = items.filter((i) => !ids.includes(i.id));
    setItems(kind === "subjects" && semesterFilter ? [...list, ...rest] : list);
    try {
      await api("/api/admin/reorder", { body: { table: kind, ids } });
      router.refresh();
    } catch {
      toast.push("Could not save the new order.", "error");
      setItems(initialItems);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/${kind}/${deleting.id}`, { method: "DELETE" });
      toast.push(`${copy.singular} deleted.`);
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : "Could not delete.", "error");
    } finally {
      setBusy(false);
    }
  }

  const iconChoices = iconNames;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h1">{copy.plural}</h1>
          <p className="t-caption mt-1 max-w-md">{copy.blurb}</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" /> Add {copy.singular.toLowerCase()}
        </Button>
      </div>

      {kind === "subjects" && semesters.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select
            aria-label="Filter by semester"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
          >
            <option value="">All semesters</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-5 w-5" />}
          title={`No ${copy.plural.toLowerCase()} yet`}
          description={copy.empty}
          action={
            <Button onClick={startCreate}>
              <Plus className="h-4 w-4" /> Add {copy.singular.toLowerCase()}
            </Button>
          }
        />
      ) : (
        <ul className="surface-card divide-y divide-[var(--border)]">
          {visible.map((item, index) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${item.name} up`}
                  className="rounded p-0.5 text-[var(--text-subtle)] hover:text-[var(--text)] disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === visible.length - 1}
                  aria-label={`Move ${item.name} down`}
                  className="rounded p-0.5 text-[var(--text-subtle)] hover:text-[var(--text)] disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {kind === "semesters" ? (
                <span className="numeral flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent-soft)] text-[0.8rem] font-semibold text-[var(--accent)]">
                  {item.short_label || item.name.slice(0, 2)}
                </span>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-2)] text-[var(--text-muted)]">
                  <SubjectIcon name={item.icon} className="h-4.5 w-4.5" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="t-small truncate font-medium">
                  {item.name}
                  {item.code ? <span className="t-meta ml-2">{item.code}</span> : null}
                </p>
                <p className="t-meta truncate">
                  {[
                    kind === "subjects" ? item.semester_name : null,
                    `${item.material_count} material${item.material_count === 1 ? "" : "s"}`,
                    `/${item.slug}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {!item.is_active && <Badge tone="warning">Hidden</Badge>}

              <div className="flex shrink-0 items-center gap-1">
                <Switch
                  checked={item.is_active}
                  onChange={() => toggleActive(item)}
                  label={`${item.is_active ? "Hide" : "Show"} ${item.name}`}
                />
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  aria-label={`Edit ${item.name}`}
                  className="rounded p-1.5 text-[var(--text-subtle)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(item)}
                  aria-label={`Delete ${item.name}`}
                  className="rounded p-1.5 text-[var(--text-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onClose={close}
        variant="sheet"
        title={editing ? `Edit ${copy.singular.toLowerCase()}` : `New ${copy.singular.toLowerCase()}`}
        description={editing ? undefined : copy.blurb}
      >
        <form id="taxonomy-form" onSubmit={save} className="space-y-4" noValidate>
          {kind === "subjects" && (
            <Field label="Semester" htmlFor="tx-semester" required error={errors.semester_id}>
              <Select
                id="tx-semester"
                value={draft.semester_id}
                onChange={(e) => setDraft((d) => ({ ...d, semester_id: e.target.value }))}
                required
              >
                <option value="">Choose…</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Name" htmlFor="tx-name" required error={errors.name}>
            <Input
              id="tx-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={
                kind === "semesters" ? "7th Semester" : kind === "subjects" ? "Information Security" : "Past Papers"
              }
              required
              data-autofocus
            />
          </Field>

          {kind === "semesters" && (
            <Field label="Short label" htmlFor="tx-short" hint="Shown on the semester card, e.g. 07." error={errors.short_label}>
              <Input
                id="tx-short"
                value={draft.short_label}
                onChange={(e) => setDraft((d) => ({ ...d, short_label: e.target.value }))}
                placeholder="07"
                maxLength={8}
              />
            </Field>
          )}

          {kind === "subjects" && (
            <Field label="Course code" htmlFor="tx-code" hint="Optional, e.g. CS-403." error={errors.code}>
              <Input
                id="tx-code"
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                placeholder="CS-403"
                maxLength={20}
              />
            </Field>
          )}

          {kind !== "semesters" && (
            <Field label="Icon" htmlFor="tx-icon" error={errors.icon}>
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--text-muted)]">
                  <SubjectIcon name={draft.icon} className="h-5 w-5" />
                </span>
                <Select
                  id="tx-icon"
                  value={draft.icon}
                  onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))}
                >
                  {iconChoices.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
            </Field>
          )}

          <Field label="Description" htmlFor="tx-description" hint="Optional. Shown under the title." error={errors.description}>
            <Textarea
              id="tx-description"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={2}
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--border)] px-3 py-2.5">
            <div>
              <p className="t-small font-medium">Visible to students</p>
              <p className="t-meta mt-0.5">Turn this off to hide it without deleting anything.</p>
            </div>
            <Switch
              checked={draft.is_active}
              onChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
              label="Visible to students"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : `Create ${copy.singular.toLowerCase()}`}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description={`This cannot be undone. ${copy.plural} that still contain materials cannot be deleted — move or delete the materials first.`}
      />
    </div>
  );
}
