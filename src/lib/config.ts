/**
 * Central brand + runtime configuration.
 * Renaming the product = editing this file (plus the icons in /public).
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "StudyHub",
  mark: "✦",
  tagline: "Everything you need for your semester.",
  description:
    "Notes, books, assignments and past papers for your class — organised in one place.",
} as const;

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || 50) * 1024 * 1024;

export const ALLOWED_MIME: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "application/zip": [".zip"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

export const INLINE_VIEWABLE = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** Validate an upload against the allow-list. Returns an error message or null. */
export function validateUpload(
  fileName: string,
  mimeType: string,
  size: number,
): string | null {
  if (size <= 0) return "The file is empty.";
  if (size > MAX_UPLOAD_BYTES)
    return `The file is larger than the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit.`;
  const allowedExts = ALLOWED_MIME[mimeType];
  if (!allowedExts) return `Files of type "${mimeType || "unknown"}" are not accepted.`;
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : "";
  if (!allowedExts.includes(ext))
    return `The extension "${ext || "(none)"}" does not match the file's content type.`;
  return null;
}

/** Flat list of accepted extensions, for UI copy and the file picker. */
export const ALLOWED_EXTENSIONS = Array.from(
  new Set(Object.values(ALLOWED_MIME).flat()),
).sort();
