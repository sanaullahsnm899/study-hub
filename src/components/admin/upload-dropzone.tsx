"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, File as FileIco, Loader2, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";

export type UploadedFile = {
  storage_provider: string;
  storage_file_id: string;
  storage_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

type QueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  result?: UploadedFile;
};

function csrf(): string {
  const m = document.cookie.match(/(?:^|;\s*)sh_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

/** XHR rather than fetch: it is the only way to get real upload progress. */
function upload(file: File, folder: { semester: string; subject: string; category: string }, onProgress: (p: number) => void) {
  return new Promise<UploadedFile>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("semester", folder.semester);
    form.append("subject", folder.subject);
    form.append("category", folder.category);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.setRequestHeader("x-csrf-token", csrf());
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 95));
    });
    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve(data.file as UploadedFile);
        } else {
          reject(new Error(data.error || `Upload failed (${xhr.status}).`));
        }
      } catch {
        reject(new Error("The server returned an unexpected response."));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));
    xhr.send(form);
  });
}

export function UploadDropzone({
  folder,
  disabled,
  disabledHint,
  multiple = false,
  onUploaded,
  onFirstFileName,
}: {
  folder: { semester: string; subject: string; category: string };
  disabled?: boolean;
  disabledHint?: string;
  multiple?: boolean;
  onUploaded: (files: UploadedFile[]) => void;
  onFirstFileName?: (name: string) => void;
}) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((id: string, changes: Partial<QueueItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }, []);

  const run = useCallback(
    async (item: QueueItem) => {
      patch(item.id, { status: "uploading", progress: 0, error: undefined });
      try {
        const result = await upload(item.file, folder, (p) => patch(item.id, { progress: p }));
        patch(item.id, { status: "done", progress: 100, result });
        onUploaded([result]);
      } catch (err) {
        patch(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    },
    [folder, onUploaded, patch],
  );

  const accept = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return;
      const files = Array.from(fileList).slice(0, multiple ? 20 : 1);
      if (!files.length) return;
      if (onFirstFileName) onFirstFileName(files[0].name.replace(/\.[^.]+$/, ""));
      const next = files.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        progress: 0,
        status: "queued" as const,
      }));
      setItems((prev) => (multiple ? [...prev, ...next] : next));
      next.forEach(run);
    },
    [disabled, multiple, onFirstFileName, run],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-[var(--r-lg)] border border-dashed px-5 py-8 text-center transition-colors duration-[var(--fast)]",
          disabled
            ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface-2)] opacity-70"
            : dragging
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--accent)]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.zip,.png,.jpg,.jpeg,.webp,.gif"
        />
        <Upload
          className={cn("mx-auto h-6 w-6", dragging ? "text-[var(--accent)]" : "text-[var(--text-subtle)]")}
          aria-hidden
        />
        <p className="t-small mt-3 font-medium">
          {disabled ? disabledHint || "Upload unavailable" : "Drop files here"}
        </p>
        {!disabled && (
          <>
            <p className="t-meta mt-1">or</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => inputRef.current?.click()}
            >
              Browse files
            </Button>
            <p className="t-meta mt-3">PDF · DOCX · PPTX · XLSX · Images · ZIP</p>
          </>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Upload queue">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            >
              <span className="shrink-0">
                {item.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                ) : item.status === "error" ? (
                  <AlertCircle className="h-4 w-4 text-[var(--danger)]" />
                ) : item.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                ) : (
                  <FileIco className="h-4 w-4 text-[var(--text-subtle)]" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="t-small truncate">{item.file.name}</p>
                {item.status === "error" ? (
                  <p className="t-meta text-[var(--danger)]">{item.error}</p>
                ) : item.status === "done" ? (
                  <p className="t-meta">Uploaded · {formatBytes(item.result?.file_size ?? item.file.size)}</p>
                ) : (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {item.status === "error" && (
                <Button type="button" variant="ghost" size="sm" onClick={() => run(item)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </Button>
              )}
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                className="rounded p-1 text-[var(--text-subtle)] hover:text-[var(--text)]"
                aria-label={`Remove ${item.file.name} from the queue`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
