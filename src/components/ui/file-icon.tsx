import { cn } from "@/lib/utils";
import { fileKind } from "@/lib/utils";

const tone: Record<string, string> = {
  PDF: "bg-[var(--danger-soft)] text-[var(--danger)]",
  DOC: "bg-[var(--info-soft)] text-[var(--info)]",
  PPT: "bg-[var(--warning-soft)] text-[var(--warning)]",
  XLS: "bg-[var(--accent-soft)] text-[var(--accent)]",
  IMG: "bg-[var(--surface-3)] text-[var(--text-muted)]",
  ZIP: "bg-[var(--surface-3)] text-[var(--text-muted)]",
  LINK: "bg-[var(--surface-2)] text-[var(--text-muted)]",
};

export function FileIcon({
  mimeType,
  fileName,
  className,
}: {
  mimeType?: string | null;
  fileName?: string | null;
  className?: string;
}) {
  const kind = fileKind(mimeType, fileName);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[0.64rem] font-semibold tracking-wide",
        tone[kind] ?? "bg-[var(--surface-2)] text-[var(--text-muted)]",
        className,
      )}
    >
      {kind}
    </span>
  );
}
