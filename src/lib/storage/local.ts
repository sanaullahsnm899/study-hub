import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { StorageError, type FileContent, type StorageProvider, type StoredFile, type UploadInput } from "./types";

const ROOT = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), ".storage");

/**
 * Filesystem provider used for local development and automated tests so the
 * whole upload → view → download path can run without Google credentials.
 * Not suitable for Vercel (ephemeral filesystem) — Drive is the production provider.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  isConfigured(): boolean {
    return true;
  }

  private resolve(id: string): string {
    const full = path.resolve(ROOT, id);
    if (!full.startsWith(path.resolve(ROOT))) throw new StorageError("Invalid file id.", 400);
    return full;
  }

  async upload({ data, fileName, mimeType, folderPath }: UploadInput): Promise<StoredFile> {
    const safeSegments = folderPath
      .filter(Boolean)
      .map((s) => s.replace(/[^a-zA-Z0-9 _-]/g, "_"));
    const dir = path.join(ROOT, ...safeSegments);
    await mkdir(dir, { recursive: true });
    const unique = `${Date.now().toString(36)}-${fileName}`;
    const id = path.join(...safeSegments, unique);
    await writeFile(path.join(ROOT, id), data);
    return { id, name: fileName, mimeType, size: data.length, webViewUrl: null };
  }

  async getMetadata(id: string): Promise<StoredFile | null> {
    const full = this.resolve(id);
    if (!existsSync(full)) return null;
    const info = await stat(full);
    return {
      id,
      name: path.basename(id).replace(/^[a-z0-9]+-/, ""),
      mimeType: "application/octet-stream",
      size: info.size,
      webViewUrl: null,
    };
  }

  async getContent(id: string): Promise<FileContent> {
    const full = this.resolve(id);
    if (!existsSync(full)) throw new StorageError("File not found.", 404);
    const info = await stat(full);
    const stream = Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>;
    return { body: stream, mimeType: "application/octet-stream", size: info.size };
  }

  async delete(id: string): Promise<void> {
    const full = this.resolve(id);
    if (existsSync(full)) await unlink(full);
  }
}
