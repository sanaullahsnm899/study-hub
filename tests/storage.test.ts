import { rm } from "node:fs/promises";
import { afterAll, describe, expect, it } from "vitest";
import { LocalStorageProvider } from "@/lib/storage/local";
import { GoogleDriveProvider } from "@/lib/storage/google-drive";
import { StorageError, getProviderByName, getStorageProvider, storageStatus } from "@/lib/storage";

const provider = new LocalStorageProvider();
const folderPath = ["7th Semester", "Information Security", "Lecture Notes"];

afterAll(async () => {
  await rm(process.env.LOCAL_STORAGE_DIR || ".storage-test", { recursive: true, force: true });
});

async function read(body: ReadableStream<Uint8Array> | Buffer) {
  if (Buffer.isBuffer(body)) return body;
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

describe("local storage provider", () => {
  it("round-trips an upload, its metadata and its content", async () => {
    const data = Buffer.from("%PDF-1.4 demo");
    const stored = await provider.upload({
      data,
      fileName: "lecture-07.pdf",
      mimeType: "application/pdf",
      folderPath,
    });

    expect(stored.id).toContain("7th Semester");
    expect(stored.size).toBe(data.length);

    const metadata = await provider.getMetadata(stored.id);
    expect(metadata?.size).toBe(data.length);

    const content = await provider.getContent(stored.id);
    expect((await read(content.body)).toString()).toBe(data.toString());

    await provider.delete(stored.id);
    expect(await provider.getMetadata(stored.id)).toBeNull();
  });

  it("mirrors the semester / subject / category folder tree", async () => {
    const stored = await provider.upload({
      data: Buffer.from("x"),
      fileName: "paper.pdf",
      mimeType: "application/pdf",
      folderPath,
    });
    expect(stored.id.split("/").slice(0, 3)).toEqual(folderPath);
  });

  it("refuses to escape its root directory", async () => {
    await expect(provider.getMetadata("../../etc/passwd")).rejects.toBeInstanceOf(StorageError);
  });

  it("reports a missing file as a 404 rather than throwing raw", async () => {
    await expect(provider.getContent("nope.pdf")).rejects.toMatchObject({ status: 404 });
  });
});

describe("provider selection", () => {
  it("falls back to local storage when Google Drive is not configured", () => {
    expect(new GoogleDriveProvider().isConfigured()).toBe(false);
    expect(getStorageProvider().name).toBe("local");
    expect(storageStatus().googleDriveConfigured).toBe(false);
  });

  it("resolves the provider a stored file was written with", () => {
    expect(getProviderByName("local")?.name).toBe("local");
    expect(getProviderByName("google_drive")?.name).toBe("google_drive");
    expect(getProviderByName(null)).toBeNull();
    expect(getProviderByName("dropbox")).toBeNull();
  });
});
