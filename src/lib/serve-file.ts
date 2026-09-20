import { fail } from "./api";
import { getPublicMaterialBySlug, getMaterialById, recordEvent } from "./repo/materials";
import { getProviderByName, getStorageProvider } from "./storage";
import { INLINE_VIEWABLE } from "./config";
import { sanitizeFilename } from "./utils";

/**
 * Stream a published material's file through the app.
 * Keeping Drive private and proxying here means no public Drive links leak,
 * and download counts stay accurate.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function serveMaterialFile(id: string, mode: "view" | "download") {
  const material = UUID.test(id) ? await getMaterialById(id) : await getPublicMaterialBySlug(id);
  if (!material || material.status !== "published" || material.deleted_at) {
    return fail(404, "This material is currently unavailable.");
  }
  if (!material.storage_file_id) {
    if (material.external_url) {
      await recordEvent(material.id, "external");
      return Response.redirect(material.external_url, 302);
    }
    return fail(404, "This material has no file attached.");
  }

  const provider = getProviderByName(material.storage_provider) ?? getStorageProvider();
  const content = await provider.getContent(material.storage_file_id);
  const mime = material.file_type || content.mimeType || "application/octet-stream";
  const inline = mode === "view" && INLINE_VIEWABLE.has(mime);
  const fileName = sanitizeFilename(material.file_name || `${material.slug}`);

  await recordEvent(material.id, mode === "view" ? "view" : "download");

  const body =
    content.body instanceof Buffer ? new Uint8Array(content.body) : content.body;

  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      ...(content.size ? { "Content-Length": String(content.size) } : {}),
    },
  });
}
