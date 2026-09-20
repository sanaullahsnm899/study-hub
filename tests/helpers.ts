import { query } from "@/lib/db";
import { createCategory, createSemester, createSubject } from "@/lib/repo/taxonomy";

/** Wipe every table between test files so each one starts from a known state. */
export async function resetDatabase() {
  await query(
    `TRUNCATE download_events, material_tags, tags, materials, subjects, categories, semesters, admins
     RESTART IDENTITY CASCADE`,
  );
}

export async function seedTaxonomy() {
  const semester = await createSemester({
    name: "7th Semester",
    short_label: "07",
    sort_order: 0,
  });
  const other = await createSemester({ name: "6th Semester", short_label: "06", sort_order: 1 });
  const subject = await createSubject({
    semester_id: semester!.id,
    name: "Information Security",
    code: "CS-403",
  });
  const otherSubject = await createSubject({
    semester_id: other!.id,
    name: "Operating Systems",
    code: "CS-301",
  });
  const category = await createCategory({ name: "Lecture Notes", sort_order: 0 });
  const papers = await createCategory({ name: "Past Papers", sort_order: 1 });

  return {
    semester: semester!,
    other: other!,
    subject: subject!,
    otherSubject: otherSubject!,
    category: category!,
    papers: papers!,
  };
}

export function materialInput(
  ids: { semester_id: string; subject_id: string; category_id: string },
  overrides: Record<string, unknown> = {},
) {
  return {
    title: "Network Security — Lecture 07",
    description: "Threat models, firewalls and intrusion detection.",
    ...ids,
    storage_provider: "local",
    storage_file_id: "test-file-id",
    file_name: "lecture-07.pdf",
    file_type: "application/pdf",
    file_size: 1024,
    tags: ["security", "firewalls"],
    ...overrides,
  };
}
