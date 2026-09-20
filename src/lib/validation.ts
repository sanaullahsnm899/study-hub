import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  password: z.string().min(8, "Passwords are at least 8 characters.").max(200),
});

export const semesterSchema = z.object({
  name: trimmed(80).min(2, "Name is required."),
  short_label: trimmed(8).optional().or(z.literal("")),
  description: trimmed(500).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.coerce.boolean().default(true),
});

export const subjectSchema = z.object({
  semester_id: z.string().uuid("Choose a semester."),
  name: trimmed(120).min(2, "Name is required."),
  code: trimmed(20).optional().or(z.literal("")),
  description: trimmed(500).optional().or(z.literal("")),
  icon: trimmed(40).default("book"),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.coerce.boolean().default(true),
});

export const categorySchema = z.object({
  name: trimmed(80).min(2, "Name is required."),
  description: trimmed(500).optional().or(z.literal("")),
  icon: trimmed(40).default("file"),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.coerce.boolean().default(true),
});

export const materialStatus = z.enum(["draft", "published", "archived"]);

const materialBase = z.object({
    title: trimmed(180).min(2, "Give the material a title."),
    description: trimmed(2000).optional().or(z.literal("")),
    semester_id: z.string().uuid("Choose a semester."),
    subject_id: z.string().uuid("Choose a subject."),
    category_id: z.string().uuid("Choose a category."),
    instructor: trimmed(120).optional().or(z.literal("")),
    tags: z.array(trimmed(40)).max(12).default([]),
    status: materialStatus.default("draft"),
    external_url: z
      .string()
      .trim()
      .url("Enter a full URL starting with https://")
      .max(1000)
      .optional()
      .or(z.literal("")),
    // set by the upload step, never trusted from the client for content
    storage_provider: trimmed(40).optional().or(z.literal("")),
    storage_file_id: trimmed(400).optional().or(z.literal("")),
    storage_url: trimmed(1000).optional().or(z.literal("")),
    file_name: trimmed(200).optional().or(z.literal("")),
    file_type: trimmed(120).optional().or(z.literal("")),
    file_size: z.coerce.number().int().min(0).optional(),
});

export const materialSchema = materialBase.refine(
  (v) => Boolean(v.storage_file_id) || Boolean(v.external_url),
  { message: "Attach a file or provide an external link.", path: ["external_url"] },
);

export const materialUpdateSchema = materialBase.partial();

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SemesterInput = z.infer<typeof semesterSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type MaterialInput = z.infer<typeof materialSchema>;

/** Flatten a ZodError into { field: message } for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
