import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  SESSION_TTL_SECONDS,
  createSessionToken,
  newCsrfToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { fileKind, isSafeHttpUrl, sanitizeFilename, slugify } from "@/lib/utils";
import { validateUpload } from "@/lib/config";
import { loginSchema, materialSchema, materialUpdateSchema } from "@/lib/validation";

const admin = { sub: "8c4f1f6c-5e0e-4f1e-9c0f-8d1e2a3b4c5d", email: "a@b.test", name: "CR", role: "admin" as const };

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("StudyHub2026!");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("StudyHub2026!", hash)).toBe(true);
    expect(await verifyPassword("studyhub2026!", hash)).toBe(false);
  });

  it("never stores the password in the hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("horse");
  });

  it("salts, so the same password hashes differently each time", async () => {
    expect(await hashPassword("same")).not.toEqual(await hashPassword("same"));
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-real-hash")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a valid session", () => {
    const payload = verifySessionToken(createSessionToken(admin));
    expect(payload?.email).toBe("a@b.test");
    expect(payload?.role).toBe("admin");
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken(admin);
    const [data, mac] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...admin, exp: Math.floor(Date.now() / 1000) + 999 }),
    ).toString("base64url");
    expect(forged).not.toBe(data);
    expect(verifySessionToken(`${forged}.${mac}`)).toBeNull();
  });

  it("rejects an expired session", () => {
    expect(verifySessionToken(createSessionToken(admin, -10))).toBeNull();
  });

  it("rejects missing or malformed tokens", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("nonsense")).toBeNull();
  });

  it("issues httpOnly session cookies that expire", () => {
    const options = sessionCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.maxAge).toBe(SESSION_TTL_SECONDS);
  });

  it("generates unguessable CSRF tokens", () => {
    const a = newCsrfToken();
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(a).not.toBe(newCsrfToken());
  });
});

describe("rate limiting", () => {
  afterEach(() => resetRateLimits());

  it("allows up to the limit then blocks", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000).ok).toBe(true);
    const blocked = rateLimit("k", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("tracks each key separately", () => {
    rateLimit("ip-a", 1, 60_000);
    expect(rateLimit("ip-a", 1, 60_000).ok).toBe(false);
    expect(rateLimit("ip-b", 1, 60_000).ok).toBe(true);
  });
});

describe("upload validation", () => {
  it("accepts a PDF within the size limit", () => {
    expect(validateUpload("notes.pdf", "application/pdf", 1000)).toBeNull();
  });

  it("rejects an executable disguised by its type", () => {
    expect(validateUpload("payload.exe", "application/x-msdownload", 10)).toMatch(/not accepted/);
  });

  it("rejects a mismatch between extension and content type", () => {
    expect(validateUpload("notes.exe", "application/pdf", 10)).toMatch(/does not match/);
  });

  it("rejects empty and oversized files", () => {
    expect(validateUpload("a.pdf", "application/pdf", 0)).toMatch(/empty/);
    expect(validateUpload("a.pdf", "application/pdf", 999 * 1024 * 1024)).toMatch(/larger/);
  });
});

describe("string helpers", () => {
  it("slugifies titles predictably", () => {
    expect(slugify("7th Semester")).toBe("7th-semester");
    expect(slugify("Data  Structures & Algorithms!")).toBe("data-structures-algorithms");
  });

  it("strips path traversal from filenames", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
  });

  it("classifies files for the icon and filter", () => {
    expect(fileKind("application/pdf", "a.pdf")).toBe("PDF");
    expect(fileKind(null, null)).toBe("LINK");
  });

  it("only trusts http(s) links", () => {
    expect(isSafeHttpUrl("https://example.edu/notes.pdf")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});

describe("validation schemas", () => {
  it("normalises the login email and enforces a password length", () => {
    expect(loginSchema.parse({ email: " CR@Class.Test ", password: "longenough" }).email).toBe(
      "cr@class.test",
    );
    expect(loginSchema.safeParse({ email: "cr@class.test", password: "short" }).success).toBe(false);
  });

  it("requires either a file or an external link", () => {
    const base = {
      title: "Lecture 1",
      semester_id: "8c4f1f6c-5e0e-4f1e-9c0f-8d1e2a3b4c5d",
      subject_id: "8c4f1f6c-5e0e-4f1e-9c0f-8d1e2a3b4c5d",
      category_id: "8c4f1f6c-5e0e-4f1e-9c0f-8d1e2a3b4c5d",
    };
    expect(materialSchema.safeParse(base).success).toBe(false);
    expect(materialSchema.safeParse({ ...base, external_url: "https://mit.edu" }).success).toBe(true);
    expect(materialSchema.safeParse({ ...base, storage_file_id: "abc" }).success).toBe(true);
  });

  it("allows partial updates", () => {
    expect(materialUpdateSchema.parse({ status: "published" }).status).toBe("published");
  });
});
