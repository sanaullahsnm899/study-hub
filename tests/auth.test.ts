import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A stand-in for Next's cookie store so route guards can be tested directly. */
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { getPool } = await import("@/lib/db");
const { HttpError, requireApiAdmin } = await import("@/lib/auth");
const { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, createSessionToken, newCsrfToken } = await import(
  "@/lib/session"
);
const { resetRateLimits } = await import("@/lib/rate-limit");
const { upsertAdmin, findAdminByEmail } = await import("@/lib/repo/admins");
const { verifyPassword } = await import("@/lib/password");
const { resetDatabase } = await import("./helpers");

const ADMIN = {
  sub: "3f1b0a44-1b9e-4f7f-9c1a-2b3c4d5e6f70",
  email: "cr@class.test",
  name: "Class Rep",
  role: "admin" as const,
};

const CSRF = newCsrfToken();

function signIn() {
  jar.set(SESSION_COOKIE, createSessionToken(ADMIN));
  jar.set(CSRF_COOKIE, CSRF);
}

function post(headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/admin/materials", { method: "POST", headers });
}

beforeEach(() => {
  jar.clear();
  resetRateLimits();
});

afterEach(() => jar.clear());
afterAll(async () => {
  await getPool().end();
});

describe("admin API guard", () => {
  it("rejects a request with no session", async () => {
    await expect(requireApiAdmin(new Request("http://localhost:3000/api/admin/materials"))).rejects.toMatchObject(
      { status: 401 },
    );
  });

  it("rejects a forged session cookie", async () => {
    jar.set(SESSION_COOKIE, "forged.token");
    await expect(requireApiAdmin(new Request("http://localhost:3000/api/admin/materials"))).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it("rejects an expired session", async () => {
    jar.set(SESSION_COOKIE, createSessionToken(ADMIN, -60));
    await expect(requireApiAdmin(new Request("http://localhost:3000/api/admin/materials"))).rejects.toMatchObject(
      { status: 401 },
    );
  });

  it("allows a signed-in GET without a CSRF token", async () => {
    signIn();
    const session = await requireApiAdmin(new Request("http://localhost:3000/api/admin/materials"));
    expect(session.email).toBe("cr@class.test");
  });

  it("rejects a write with no CSRF header", async () => {
    signIn();
    await expect(requireApiAdmin(post())).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a write whose CSRF header does not match the cookie", async () => {
    signIn();
    await expect(requireApiAdmin(post({ [CSRF_HEADER]: "wrong-token" }))).rejects.toMatchObject({
      status: 403,
    });
  });

  it("accepts a write with a matching CSRF token", async () => {
    signIn();
    const session = await requireApiAdmin(post({ [CSRF_HEADER]: CSRF }));
    expect(session.sub).toBe(ADMIN.sub);
  });

  it("blocks a cross-origin write even with valid tokens", async () => {
    signIn();
    await expect(
      requireApiAdmin(
        post({ [CSRF_HEADER]: CSRF, origin: "https://evil.example", host: "localhost:3000" }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("accepts a same-origin write", async () => {
    signIn();
    const session = await requireApiAdmin(
      post({ [CSRF_HEADER]: CSRF, origin: "http://localhost:3000", host: "localhost:3000" }),
    );
    expect(session.role).toBe("admin");
  });
});

describe("admin accounts", () => {
  beforeEach(resetDatabase);

  it("stores only a hash and finds the admin by email case-insensitively", async () => {
    await upsertAdmin("CR@Class.Test", "Class Rep", "StudyHub2026!");

    const admin = await findAdminByEmail("cr@class.test");
    expect(admin?.name).toBe("Class Rep");
    expect(admin?.password_hash).not.toContain("StudyHub2026!");
    expect(await verifyPassword("StudyHub2026!", admin!.password_hash)).toBe(true);
    expect(await verifyPassword("wrong", admin!.password_hash)).toBe(false);
  });

  it("does not return deactivated admins", async () => {
    const admin = await upsertAdmin("old@class.test", "Former CR", "StudyHub2026!");
    const { query } = await import("@/lib/db");
    await query(`UPDATE admins SET is_active = false WHERE id = $1`, [admin!.id]);
    expect(await findAdminByEmail("old@class.test")).toBeNull();
  });
});
