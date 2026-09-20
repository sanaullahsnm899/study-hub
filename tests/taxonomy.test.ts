import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "@/lib/db";
import {
  createCategory,
  createSemester,
  createSubject,
  deleteCategory,
  deleteSemester,
  deleteSubject,
  getSemesterBySlug,
  getSubjectBySlug,
  listCategories,
  listSemesters,
  listSubjects,
  reorder,
  updateCategory,
  updateSemester,
  updateSubject,
} from "@/lib/repo/taxonomy";
import { createMaterial } from "@/lib/repo/materials";
import { materialInput, resetDatabase, seedTaxonomy } from "./helpers";

beforeEach(resetDatabase);
afterAll(async () => {
  await getPool().end();
});

describe("semesters", () => {
  it("creates one with a slug derived from the name", async () => {
    const semester = await createSemester({ name: "7th Semester", short_label: "07" });
    expect(semester?.slug).toBe("7th-semester");
    expect(semester?.is_active).toBe(true);
  });

  it("gives colliding names distinct slugs", async () => {
    await createSemester({ name: "Summer Session" });
    const second = await createSemester({ name: "Summer Session" });
    expect(second?.slug).toBe("summer-session-2");
  });

  it("counts its subjects and published materials", async () => {
    const ids = await seedTaxonomy();
    await createMaterial(
      materialInput(
        { semester_id: ids.semester.id, subject_id: ids.subject.id, category_id: ids.category.id },
        { status: "published" },
      ),
    );
    await createMaterial(
      materialInput(
        { semester_id: ids.semester.id, subject_id: ids.subject.id, category_id: ids.category.id },
        { title: "Draft notes", status: "draft" },
      ),
    );

    const [seventh] = await listSemesters();
    expect(seventh.subject_count).toBe(1);
    expect(seventh.material_count).toBe(1); // the draft is not counted publicly
  });

  it("hides inactive semesters from the public list but not from admin", async () => {
    const semester = await createSemester({ name: "Old Semester" });
    await updateSemester(semester!.id, { is_active: false });

    expect(await listSemesters()).toHaveLength(0);
    expect(await listSemesters({ includeInactive: true })).toHaveLength(1);
    expect(await getSemesterBySlug("old-semester")).toBeNull();
    expect(await getSemesterBySlug("old-semester", true)).not.toBeNull();
  });

  it("refuses to delete one that still holds materials", async () => {
    const ids = await seedTaxonomy();
    await createMaterial(
      materialInput({
        semester_id: ids.semester.id,
        subject_id: ids.subject.id,
        category_id: ids.category.id,
      }),
    );

    const blocked = await deleteSemester(ids.semester.id);
    expect(blocked.ok).toBe(false);
    expect(await listSemesters({ includeInactive: true })).toHaveLength(2);

    const allowed = await deleteSemester(ids.other.id);
    expect(allowed.ok).toBe(true);
  });
});

describe("subjects", () => {
  it("scopes slugs to the semester, so two semesters can share a subject name", async () => {
    const a = await createSemester({ name: "5th Semester" });
    const b = await createSemester({ name: "6th Semester" });
    const first = await createSubject({ semester_id: a!.id, name: "Databases" });
    const second = await createSubject({ semester_id: b!.id, name: "Databases" });
    expect(first?.slug).toBe("databases");
    expect(second?.slug).toBe("databases");
  });

  it("lists only the subjects of one semester", async () => {
    const ids = await seedTaxonomy();
    const subjects = await listSubjects({ semesterId: ids.semester.id });
    expect(subjects.map((s) => s.name)).toEqual(["Information Security"]);
    expect(subjects[0].semester_name).toBe("7th Semester");
  });

  it("resolves by semester and subject slug together", async () => {
    await seedTaxonomy();
    expect(await getSubjectBySlug("7th-semester", "information-security")).not.toBeNull();
    expect(await getSubjectBySlug("6th-semester", "information-security")).toBeNull();
  });

  it("can be moved to another semester and edited", async () => {
    const ids = await seedTaxonomy();
    const moved = await updateSubject(ids.subject.id, {
      semester_id: ids.other.id,
      code: "CS-999",
    });
    expect(moved?.semester_id).toBe(ids.other.id);
    expect(moved?.code).toBe("CS-999");
  });

  it("refuses to delete one that still holds materials", async () => {
    const ids = await seedTaxonomy();
    await createMaterial(
      materialInput({
        semester_id: ids.semester.id,
        subject_id: ids.subject.id,
        category_id: ids.category.id,
      }),
    );
    expect((await deleteSubject(ids.subject.id)).ok).toBe(false);
    expect((await deleteSubject(ids.otherSubject.id)).ok).toBe(true);
  });
});

describe("categories", () => {
  it("creates, renames and deletes", async () => {
    const category = await createCategory({ name: "Past Papers", icon: "file" });
    expect(category?.slug).toBe("past-papers");

    const renamed = await updateCategory(category!.id, { name: "Exam Papers" });
    expect(renamed?.name).toBe("Exam Papers");
    expect(renamed?.slug).toBe("exam-papers");

    expect((await deleteCategory(category!.id)).ok).toBe(true);
    expect(await listCategories({ includeInactive: true })).toHaveLength(0);
  });

  it("refuses to delete one that still holds materials", async () => {
    const ids = await seedTaxonomy();
    await createMaterial(
      materialInput({
        semester_id: ids.semester.id,
        subject_id: ids.subject.id,
        category_id: ids.category.id,
      }),
    );
    expect((await deleteCategory(ids.category.id)).ok).toBe(false);
  });
});

describe("reordering", () => {
  it("writes the new order and the list respects it", async () => {
    const a = await createSemester({ name: "Alpha", sort_order: 0 });
    const b = await createSemester({ name: "Beta", sort_order: 1 });
    const c = await createSemester({ name: "Gamma", sort_order: 2 });

    await reorder("semesters", [c!.id, a!.id, b!.id]);

    const ordered = await listSemesters();
    expect(ordered.map((s) => s.name)).toEqual(["Gamma", "Alpha", "Beta"]);
  });
});
