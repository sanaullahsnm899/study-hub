import { createSign } from "node:crypto";
import { StorageError, type FileContent, type StorageProvider, type StoredFile, type UploadInput } from "./types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const SCOPE = "https://www.googleapis.com/auth/drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";

type Cached = { token: string; expiresAt: number };
let cachedToken: Cached | null = null;
const folderCache = new Map<string, string>();

function privateKey(): string {
  // Vercel/Supabase dashboards store newlines as "\n" — normalise both forms.
  return (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

/**
 * Google Drive storage provider.
 *
 * Auth: a service account (JWT bearer grant, RS256) — no user interaction, no
 * refresh-token rotation, and credentials never leave the server. The signing
 * and the REST calls are implemented directly on fetch so the deployment does
 * not need the (large) googleapis SDK.
 */
export class GoogleDriveProvider implements StorageProvider {
  readonly name = "google_drive";

    isConfigured(): boolean {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = privateKey();
    const folder = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!email || !key || !folder) return false;
    // A real PEM key is ~1,700+ chars; .env.example ships a short "MII..."
    // placeholder so a fresh `cp .env.example .env.local` doesn't silently
    // "look" configured and crash uploads. Reject anything that isn't a
    // plausible key rather than trying to sign with it and failing later.
    if (!/^-----BEGIN PRIVATE KEY-----/.test(key) || key.length < 800) return false;
    if (email.includes("your-project") || folder === "1AbCdEfGhIjKlMnOpQrStUvWxYz") return false;
    return true;
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new StorageError(
        "Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_DRIVE_ROOT_FOLDER_ID.",
        503,
      );
    }
  }

  private async accessToken(): Promise<string> {
    this.assertConfigured();
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

    const iat = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(
      JSON.stringify({
        iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        scope: SCOPE,
        aud: TOKEN_URL,
        exp: iat + 3600,
        iat,
        ...(process.env.GOOGLE_IMPERSONATE_SUBJECT
          ? { sub: process.env.GOOGLE_IMPERSONATE_SUBJECT }
          : {}),
      }),
    );
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    const signature = signer.sign(privateKey(), "base64url");
    const assertion = `${header}.${claims}.${signature}`;

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) {
      throw new StorageError(`Google auth failed (${res.status}): ${await res.text()}`, 502);
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return cachedToken.token;
  }

  private async api(path: string, init: RequestInit = {}, base = DRIVE_API) {
    const token = await this.accessToken();
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    return res;
  }

  private sharedDriveParams(): string {
    const driveId = process.env.GOOGLE_SHARED_DRIVE_ID;
    return driveId
      ? `&supportsAllDrives=true&includeItemsFromAllDrives=true&driveId=${driveId}&corpora=drive`
      : "&supportsAllDrives=true&includeItemsFromAllDrives=true";
  }

  /** Find-or-create a folder, mirroring the admin's Drive tree. */
  private async ensureFolder(name: string, parentId: string): Promise<string> {
    const cacheKey = `${parentId}/${name}`;
    const hit = folderCache.get(cacheKey);
    if (hit) return hit;

    const escaped = name.replace(/'/g, "\\'");
    const q = encodeURIComponent(
      `name='${escaped}' and mimeType='${FOLDER_MIME}' and '${parentId}' in parents and trashed=false`,
    );
    const found = await this.api(
      `/files?q=${q}&fields=files(id,name)&pageSize=1${this.sharedDriveParams()}`,
    );
    if (!found.ok) throw new StorageError(`Drive folder lookup failed: ${await found.text()}`, 502);
    const data = (await found.json()) as { files: { id: string }[] };
    if (data.files?.[0]?.id) {
      folderCache.set(cacheKey, data.files[0].id);
      return data.files[0].id;
    }

    const created = await this.api(`/files?fields=id&supportsAllDrives=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
    });
    if (!created.ok) throw new StorageError(`Drive folder create failed: ${await created.text()}`, 502);
    const folder = (await created.json()) as { id: string };
    folderCache.set(cacheKey, folder.id);
    return folder.id;
  }

  private async resolvePath(folderPath: string[]): Promise<string> {
    let parent = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID as string;
    for (const segment of folderPath.filter(Boolean)) {
      parent = await this.ensureFolder(segment, parent);
    }
    return parent;
  }

  async upload({ data, fileName, mimeType, folderPath }: UploadInput): Promise<StoredFile> {
    const parent = await this.resolvePath(folderPath);
    const boundary = `studyhub-${Date.now().toString(36)}`;
    const metadata = JSON.stringify({ name: fileName, parents: [parent] });
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      ),
      data,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await this.api(
      `?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink`,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: new Uint8Array(body),
      },
      DRIVE_UPLOAD,
    );
    if (!res.ok) throw new StorageError(`Drive upload failed: ${await res.text()}`, 502);
    const file = (await res.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      webViewLink?: string;
    };
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: Number(file.size || data.length),
      webViewUrl: file.webViewLink ?? null,
    };
  }

  async getMetadata(id: string): Promise<StoredFile | null> {
    const res = await this.api(
      `/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,webViewLink&supportsAllDrives=true`,
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new StorageError(`Drive metadata failed: ${await res.text()}`, 502);
    const file = (await res.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      webViewLink?: string;
    };
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: Number(file.size || 0),
      webViewUrl: file.webViewLink ?? null,
    };
  }

  async getContent(id: string): Promise<FileContent> {
    const res = await this.api(
      `/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
    );
    if (res.status === 404) throw new StorageError("File not found in Google Drive.", 404);
    if (!res.ok || !res.body) throw new StorageError(`Drive download failed: ${res.status}`, 502);
    return {
      body: res.body as ReadableStream<Uint8Array>,
      mimeType: res.headers.get("content-type") || "application/octet-stream",
      size: Number(res.headers.get("content-length") || 0) || undefined,
    };
  }

  async delete(id: string): Promise<void> {
    // Trash rather than hard-delete: recoverable from Drive if removed by mistake.
    const res = await this.api(`/files/${encodeURIComponent(id)}?supportsAllDrives=true`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    });
    if (!res.ok && res.status !== 404) {
      throw new StorageError(`Drive delete failed: ${await res.text()}`, 502);
    }
  }
}
