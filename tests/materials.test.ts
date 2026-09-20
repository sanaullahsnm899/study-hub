import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "@/lib/db";
import {
  bulkSetStatus,
  bulkSoftDelete,
  createMaterial,
  getMaterialById,
  getPublicMaterialBySlug,
  listAdminMaterials,
  listPublicMaterials,
  popularMaterials,
  recentMaterials,
  recordEvent,
  restoreMaterial,
  setMaterialStatus,
  softDeleteMaterial,
  updateMaterial,
} from "@/lib/repo/materials";
import { updateSemester, updateSubject } from "@/lib/repo/taxonomy";
import { dashboardStats, downloadsPerDay, topDownloads } from "@/lib/repo/analytics";
import { materialInput, resetDatabase, seedTaxonomy } from "./helpers";

type Ids = Awaited<ReturnType<typeof seedTaxonomy>>;
let ids: Ids;

beforeEach(async () => {
  await resetDatabase();
  ids = await seedTaxonomy();
});

afterAll(async () => {
  await getPool().end();
});

function at(overrides: Record<string, unknown> = {}) {
  return materialInput(
    { semester_id: ids.semester.id, subject_id: ids.subject.id, category_id: ids.category.id },
    overrides,
  );
}

describe("creating materials", () => {
  it("stores metadata, a unique slug and its tags", async () => {
    const material = await createMaterial(at());
    expect(material?.slug).toBe("network-security-lecture-07");
    expect(material?.status).toBe("draft");
    expect(material?.tags.sort()).toEqual(["firewalls", "security"]);
    expect(material?.file_size).toBe(1024);
  });

  it("joins the semester, subject and category names for display", async () => {
    const material = await createMaterial(at());
    expect(material?.semester_name).toBe("7th Semester");
    expect(material?.subject_name).toBe("Information Security");
    expect(material?.category_name).toBe("Lecture Notes");
  });

  it("stamps published_at only when published", async () => {
    const draft = await createMaterial(at({ title: "A draft" }));
    expect(draft?.published_at).toBeNull();
    const live = await createMaterial(at({ title: "Live one", status: "published" }));
    expect(live?.published_at).not.toBeNull();
  });

  it("accepts an external link with no stored file", async () => {
    const material = await createMaterial(
      at({ title: "MIT 6.1810", storage_file_id: "", external_url: "https://pdos.csail.mit.edu/6.828/" }),
    );
    expect(material?.storage_file_id).toBeNull();
    expect(material?.external_url).toContain("mit.edu");
  });

  it("rejects a row with neither a file nor a link (database constraint)", async () => {
    await expect(createMaterial(at({ storage_file_id: "", external_url: "" }))).rejects.toThrow();
  });
});

describe("updating materials", () => {
  it("edits fields and re-syncs tags", async () => {
    const material = await createMaterial(at());
    const updated = await updateMaterial(material!.id, {
      title: "Network Security — Lecture 08",
      instructor: "Dr. Usman Tariq",
      tags: ["ids"],
    });
    expect(updated?.title).toContain("Lecture 08");
    expect(updated?.slug).toBe("network-security-lecture-08");
    expect(updated?.instructor).toBe("Dr. Usman Tariq");
    expect(updated?.tags).toEqual(["ids"]);
  });

  it("moves a material to another subject", async () => {
    const material = await createMaterial(at());
    const moved = await updateMaterial(material!.id, {
      semester_id: ids.other.id,
      subject_id: ids.otherSubject.id,
    });
    expect(moved?.subject_name).toBe("Operating Systems");
  });

  it("returns null for an unknown id", async () => {
    expect(await updateMaterial("8c4f1f6c-5e0e-4f1e-9c0f-8d1e2a3b4c5d", { title: "x" })).toBeNull();
  });
});

describe("publishing", () => {
  it("keeps drafts out of the public library", async () => {
    await createMaterial(at({ title: "Secret draft" }));
    const published = await createMaterial(at({ title: "Open lecture", status: "published" }));

    const pub = await listPublicMaterials();
    expect(pub.items.map((m) => m.title)).toEqual(["Open lecture"]);
    expect(await getPublicMaterialBySlug("secret-draft")).toBeNull();
    expect(await getPublicMaterialBySlug(published!.slug)).not.toBeNull();

    const admin = await listAdminMaterials();
    expect(admin.total).toBe(2);
  });

  it("publishes and unpublishes a single material", async () => {
    const material = await createMaterial(at());
    await setMaterialStatus(material!.id, "published");
    expect((await listPublicMaterials()).total).toBe(1);

    await setMaterialStatus(material!.id, "draft");
    expect((await listPublicMaterials()).total).toBe(0);
    expect((await getMaterialById(material!.id))?.published_at).toBeNull();
  });

  it("publishes and deletes in bulk", async () => {
    const a = await createMaterial(at({ title: "One" }));
    const b = await createMaterial(at({ title: "Two" }));

    expect(await bulkSetStatus([a!.id, b!.id], "published")).toBe(2);
    expect((await listPublicMaterials()).total).toBe(2);

    expect(await bulkSoftDelete([a!.id, b!.id])).toBe(2);
    expect((await listPublicMaterials()).total).toBe(0);
    expect((await listAdminMaterials()).total).toBe(0);
  });

  it("hides materials when their semester or subject is deactivated", async () => {
    await createMaterial(at({ status: "published" }));
    expect((await listPublicMaterials()).total).toBe(1);

    await updateSubject(ids.subject.id, { is_active: false });
    expect((await listPublicMaterials()).total).toBe(0);

    await updateSubject(ids.subject.id, { is_active: true });
    await updateSemester(ids.semester.id, { is_active: false });
    expect((await listPublicMaterials()).total).toBe(0);
  });
});

describe("soft delete", () => {
  it("removes it from both listings but keeps the row for restore", async () => {
    const material = await createMaterial(at({ status: "published" }));
    await softDeleteMaterial(material!.id);

    expect((await listPublicMaterials()).total).toBe(0);
    expect((await listAdminMaterials()).total).toBe(0);
    expect(await getMaterialById(material!.id)).toBeNull();
    expect(await getMaterialById(material!.id, { includeDeleted: true })).not.toBeNull();

    await restoreMaterial(material!.id);
    const restored = await getMaterialById(material!.id);
    expect(restored?.status).toBe("draft"); // restored safely, not straight back to live
  });
});

describe("search and filtering", () => {
  beforeEach(async () => {
    await createMaterial(
      at({ title: "Network Security — Lecture 07", tags: ["firewalls"], status: "published" }),
    );
    await createMaterial(
      at({
        title: "RSA and Public Key Cryptography",
        description: "Modular arithmetic and key exchange.",
        tags: ["rsa"],
        status: "published",
      }),
    );
    await createMaterial(
      at({
        title: "Final Exam 2024",
        description: "",
        category_id: ids.papers.id,
        status: "published",
        tags: [],
        storage_file_id: "",
        file_name: "",
        file_type: "",
        external_url: "https://www.rfc-editor.org/rfc/rfc791",
      }),
    );
    await createMaterial(
      at({
        title: "Process Scheduling",
        description: "",
        tags: [],
        semester_id: ids.other.id,
        subject_id: ids.otherSubject.id,
        status: "published",
      }),
    );
  });

  it("matches on the title", async () => {
    const result = await listPublicMaterials({ q: "network" });
    expect(result.items.map((m) => m.title)).toEqual(["Network Security — Lecture 07"]);
  });

  it("matches on the description and tags", async () => {
    expect((await listPublicMaterials({ q: "modular arithmetic" })).total).toBeGreaterThan(0);
    expect((await listPublicMaterials({ q: "firewalls" })).total).toBe(1);
  });

  it("matches on the subject name", async () => {
    expect((await listPublicMaterials({ q: "Operating Systems" })).total).toBe(1);
  });

  it("returns nothing for a term that is not there", async () => {
    expect((await listPublicMaterials({ q: "quantum chromodynamics" })).total).toBe(0);
  });

  it("filters by semester, subject and category slug", async () => {
    expect((await listPublicMaterials({ semester: "7th-semester" })).total).toBe(3);
    expect((await listPublicMaterials({ subject: "operating-systems" })).total).toBe(1);
    expect((await listPublicMaterials({ category: "past-papers" })).total).toBe(1);
  });

  it("filters by file type, including external links", async () => {
    expect((await listPublicMaterials({ fileType: "pdf" })).total).toBe(3);
    expect((await listPublicMaterials({ fileType: "link" })).total).toBe(1);
  });

  it("combines filters", async () => {
    const result = await listPublicMaterials({ semester: "7th-semester", category: "past-papers" });
    expect(result.items.map((m) => m.title)).toEqual(["Final Exam 2024"]);
  });

  it("paginates", async () => {
    const page1 = await listPublicMaterials({ pageSize: 2, page: 1 });
    const page2 = await listPublicMaterials({ pageSize: 2, page: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.pageCount).toBe(2);
    expect(page2.items).toHaveLength(2);
    expect(page1.items[0].id).not.toBe(page2.items[0].id);
  });

  it("filters admin listings by status", async () => {
    await createMaterial(at({ title: "Unpublished thing" }));
    expect((await listAdminMaterials({ status: "draft" })).total).toBe(1);
    expect((await listAdminMaterials({ status: "published" })).total).toBe(4);
    expect((await listAdminMaterials({ status: "all" })).total).toBe(5);
  });
});

describe("download counting and analytics", () => {
  it("counts downloads but not views, and feeds the analytics queries", async () => {
    const material = await createMaterial(at({ status: "published" }));
    await recordEvent(material!.id, "view");
    await recordEvent(material!.id, "download");
    await recordEvent(material!.id, "download");

    expect((await getMaterialById(material!.id))?.download_count).toBe(2);

    const stats = await dashboardStats();
    expect(stats.published).toBe(1);
    expect(stats.downloads).toBe(2);
    expect(stats.downloads_30d).toBe(2); // views excluded

    expect((await topDownloads())[0].download_count).toBe(2);
    expect((await downloadsPerDay(7))).toHaveLength(7);
    expect((await popularMaterials())[0].id).toBe(material!.id);
    expect((await recentMaterials())[0].id).toBe(material!.id);
  });
});
