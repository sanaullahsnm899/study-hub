import { fail, handler, ok } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, validateUpload } from "@/lib/config";
import { getStorageProvider } from "@/lib/storage";
import { sanitizeFilename, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Accepts one file and writes it to the active storage provider.
 * Returns the descriptor the material form saves alongside its metadata,
 * so uploading and publishing stay separable steps.
 */
export const POST = handler(async (req: Request) => {
  await requireApiAdmin(req);

  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Expected a file upload.");

  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "No file was included.");

  const declaredSize = file.size;
  if (declaredSize > MAX_UPLOAD_BYTES) {
    return fail(413, `Files must be smaller than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }

  const fileName = sanitizeFilename(file.name || "upload");
  const mimeType = file.type || "application/octet-stream";
  const invalid = validateUpload(fileName, mimeType, declaredSize);
  if (invalid) return fail(415, invalid);

  const folderPath = [
    String(form.get("semester") || "Unsorted"),
    String(form.get("subject") || "General"),
    String(form.get("category") || "Other"),
  ].map((part) => part.replace(/[\/\\]/g, "-").slice(0, 80));

  const data = Buffer.from(await file.arrayBuffer());
  if (data.length > MAX_UPLOAD_BYTES) return fail(413, "That file is too large.");

  const provider = getStorageProvider();
  const stored = await provider.upload({
    data,
    fileName: `${slugify(fileName.replace(/\.[^.]+$/, "")) || "file"}${fileName.slice(fileName.lastIndexOf("."))}`,
    mimeType,
    folderPath,
  });

  return ok({
    file: {
      storage_provider: provider.name,
      storage_file_id: stored.id,
      storage_url: stored.webViewUrl ?? "",
      file_name: fileName,
      file_type: mimeType,
      file_size: stored.size || data.length,
    },
  });
});
