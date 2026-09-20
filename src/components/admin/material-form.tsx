"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { FileIcon } from "@/components/ui/file-icon";
import { useToast } from "@/components/ui/toast";
import { UploadDropzone, type UploadedFile } from "./upload-dropzone";
import { ApiError, api } from "@/lib/admin-client";
import type { Category, MaterialWithRefs, Semester, SubjectWithCounts } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

type Props = {
  semesters: Semester[];
  subjects: SubjectWithCounts[];
  categories: Category[];
  material?: MaterialWithRefs;
};

type Source = "file" | "link";

export function MaterialForm({ semesters, subjects, categories, material }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [title, setTitle] = useState(material?.title ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [semesterId, setSemesterId] = useState(material?.semester_id ?? semesters[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(material?.subject_id ?? "");
  const [categoryId, setCategoryId] = useState(material?.category_id ?? categories[0]?.id ?? "");
  const [instructor, setInstructor] = useState(material?.instructor ?? "");
  const [tags, setTags] = useState((material?.tags ?? []).join(", "));
  const [published, setPublished] = useState(material?.status === "published");
  const [externalUrl, setExternalUrl] = useState(material?.external_url ?? "");
  const [source, setSource] = useState<Source>(
    material && !material.storage_file_id && material.external_url ? "link" : "file",
  );
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const subjectsForSemester = useMemo(
    () => subjects.filter((s) => s.semester_id === semesterId),
    [subjects, semesterId],
  );

  const semesterName = semesters.find((s) => s.id === semesterId)?.name ?? "";
  const subjectName = subjectsForSemester.find((s) => s.id === subjectId)?.name ?? "";
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
  const taxonomyReady = Boolean(semesterId && subjectId && categoryId);

  const existingFile =
    uploaded ??
    (material?.storage_file_id
      ? {
          storage_provider: material.storage_provider ?? "",
          storage_file_id: material.storage_file_id,
          storage_url: material.storage_url ?? "",
          file_name: material.file_name ?? "file",
          file_type: material.file_type ?? "",
          file_size: material.file_size ?? 0,
        }
      : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      semester_id: semesterId,
      subject_id: subjectId,
      category_id: categoryId,
      instructor: instructor.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      status: published ? "published" : "draft",
      external_url: source === "link" ? externalUrl.trim() : material?.external_url && source === "file" ? "" : "",
    };

    if (source === "file" && uploaded) Object.assign(payload, uploaded);
    if (source === "file" && !uploaded && material?.storage_file_id) {
      payload.storage_file_id = material.storage_file_id;
    }
    if (source === "file" && !uploaded && !material?.storage_file_id) {
      setErrors({ external_url: "Attach a file or switch to an external link." });
      setBusy(false);
      return;
    }

    try {
      if (material) {
        await api(`/api/admin/materials/${material.id}`, { method: "PATCH", body: payload });
        toast.push(published ? "Material published." : "Material saved as a draft.");
      } else {
        await api("/api/admin/materials", { body: payload });
        toast.push(published ? "Material published." : "Material saved as a draft.");
      }
      router.push("/admin/materials");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details ?? {});
        toast.push(err.message, "error");
      } else {
        toast.push("Could not save the material.", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]" noValidate>
      <div className="space-y-5">
        <div className="surface-card space-y-4 p-5">
          <h2 className="t-h3">Where it belongs</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Semester" htmlFor="semester" required error={errors.semester_id}>
              <Select
                id="semester"
                value={semesterId}
                onChange={(e) => {
                  setSemesterId(e.target.value);
                  setSubjectId("");
                }}
              >
                <option value="">Choose…</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" htmlFor="subject" required error={errors.subject_id}>
              <Select
                id="subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!semesterId}
              >
                <option value="">Choose…</option>
                {subjectsForSemester.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category" htmlFor="category" required error={errors.category_id}>
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {subjectsForSemester.length === 0 && semesterId && (
            <p className="t-meta">
              This semester has no subjects yet.{" "}
              <Link href="/admin/subjects" className="text-[var(--accent)] hover:underline">
                Add one first
              </Link>
              .
            </p>
          )}
        </div>

        <div className="surface-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="t-h3">The material</h2>
            <div className="inline-flex rounded-[var(--r-md)] border border-[var(--border)] p-0.5">
              <button
                type="button"
                onClick={() => setSource("file")}
                aria-pressed={source === "file"}
                className={`rounded-[var(--r-sm)] px-2.5 py-1 text-[0.8rem] ${source === "file" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
              >
                <Paperclip className="mr-1 inline h-3.5 w-3.5" />
                File
              </button>
              <button
                type="button"
                onClick={() => setSource("link")}
                aria-pressed={source === "link"}
                className={`rounded-[var(--r-sm)] px-2.5 py-1 text-[0.8rem] ${source === "link" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
              >
                <Link2 className="mr-1 inline h-3.5 w-3.5" />
                Link
              </button>
            </div>
          </div>

          {source === "file" ? (
            <>
              {existingFile && (
                <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
                  <FileIcon mimeType={existingFile.file_type} fileName={existingFile.file_name} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="t-small truncate font-medium">{existingFile.file_name}</p>
                    <p className="t-meta">
                      {formatBytes(existingFile.file_size)} · stored in{" "}
                      {existingFile.storage_provider === "google_drive" ? "Google Drive" : "local storage"}
                    </p>
                  </div>
                  {uploaded && (
                    <button
                      type="button"
                      onClick={() => setUploaded(null)}
                      className="rounded p-1 text-[var(--text-subtle)] hover:text-[var(--danger)]"
                      aria-label="Remove the uploaded file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              <UploadDropzone
                folder={{ semester: semesterName, subject: subjectName, category: categoryName }}
                disabled={!taxonomyReady}
                disabledHint="Choose a semester, subject and category first"
                onUploaded={(files) => {
                  setUploaded(files[0]);
                  toast.push("File uploaded.");
                }}
                onFirstFileName={(name) => {
                  if (!title.trim()) setTitle(name.replace(/[-_]+/g, " "));
                }}
              />
            </>
          ) : (
            <Field
              label="External link"
              htmlFor="external"
              required
              error={errors.external_url}
              hint="Use this for material you may link to but not redistribute — course pages, videos, official PDFs."
            >
              <Input
                id="external"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.edu/course/notes"
              />
            </Field>
          )}
        </div>

        <div className="surface-card space-y-4 p-5">
          <h2 className="t-h3">Details</h2>
          <Field label="Title" htmlFor="title" required error={errors.title}>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Network Security — Lecture 07"
              required
            />
          </Field>
          <Field
            label="Description"
            htmlFor="description"
            error={errors.description}
            hint="One or two lines telling students what is inside."
          >
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Covers threat models, firewalls and intrusion detection."
              rows={3}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instructor" htmlFor="instructor" hint="Optional">
              <Input
                id="instructor"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="Dr. Usman Tariq"
              />
            </Field>
            <Field label="Tags" htmlFor="tags" hint="Comma separated. Used by search.">
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="rsa, cryptography"
              />
            </Field>
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="surface-card p-5">
          <h2 className="t-h3 mb-3">Publishing</h2>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="t-small font-medium">Visible to students</p>
              <p className="t-meta mt-0.5">
                {published ? "Published — appears in the library now." : "Draft — only you can see it."}
              </p>
            </div>
            <Switch checked={published} onChange={setPublished} label="Publish this material" />
          </div>

          <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">
            <p className="t-meta">Preview</p>
            <p className="t-small font-medium">{title || "Untitled material"}</p>
            <p className="t-meta">
              {[semesterName, subjectName, categoryName].filter(Boolean).join(" · ") || "No location chosen"}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : material ? (
                "Save changes"
              ) : published ? (
                "Publish material"
              ) : (
                "Save draft"
              )}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/admin/materials")} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>

        {material && (
          <div className="surface-card p-5">
            <h2 className="t-h3 mb-2">Activity</h2>
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="t-meta">Downloads</dt>
                <dd className="t-small tabular-nums">{material.download_count}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="t-meta">Created</dt>
                <dd className="t-small">{new Date(material.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
            {material.status === "published" && (
              <Link
                href={`/material/${material.slug}`}
                target="_blank"
                className="t-small mt-3 inline-block text-[var(--accent)] hover:underline"
              >
                View public page
              </Link>
            )}
          </div>
        )}
      </aside>
    </form>
  );
}
