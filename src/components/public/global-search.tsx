"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientValue } from "@/lib/use-client-value";
import { CornerDownLeft, Loader2, Search, X } from "lucide-react";
import { FileIcon } from "@/components/ui/file-icon";
import { cn } from "@/lib/utils";

type Hit = {
  id: string;
  title: string;
  slug: string;
  subject_name: string;
  semester_name: string;
  category_name: string;
  file_type: string | null;
  file_name: string | null;
};

const SUGGESTIONS = ["past papers", "assignment", "lecture notes", "security", "database"];

export function GlobalSearch({ variant = "bar" }: { variant?: "bar" | "icon" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const mac = useClientValue(
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    false,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 30);
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setHits([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=8`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setHits(data.items ?? []);
        setActive(0);
      } catch {
        /* aborted or offline — the empty state covers it */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const go = useCallback(
    (hit: Hit) => {
      setOpen(false);
      setQ("");
      router.push(`/material/${hit.slug}`);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[active]) go(hits[active]);
      else if (q.trim()) {
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }
    }
  }

  return (
    <>
      {variant === "bar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-left shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-[var(--fast)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]"
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" aria-hidden />
          <span className="t-small flex-1 truncate text-[var(--text-subtle)]">
            Search notes, subjects, past papers…
          </span>
          <kbd className="hidden shrink-0 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.68rem] text-[var(--text-subtle)] sm:block">
            {mac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search materials"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] text-[var(--text-muted)] transition-colors duration-[var(--fast)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <Search className="h-[1.1rem] w-[1.1rem]" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]">
          <div
            className="absolute inset-0 bg-[rgba(10,18,15,0.45)] backdrop-blur-[2px]"
            style={{ animation: "overlay-in var(--fast) var(--ease) both" }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search materials"
            className="relative w-full max-w-xl overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
            style={{ animation: "sheet-up var(--normal) var(--ease) both" }}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
              {loading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" aria-hidden />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" aria-hidden />
              )}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search materials…"
                aria-label="Search materials"
                className="h-14 flex-1 bg-transparent text-[1rem] text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)]"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="rounded p-1 text-[var(--text-subtle)] hover:text-[var(--text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[min(60dvh,26rem)] overflow-y-auto">
              {q.trim().length < 2 ? (
                <div className="px-4 py-5">
                  <p className="t-meta mb-2.5">Try searching for</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setQ(s)}
                        className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[0.8rem] text-[var(--text-muted)] transition-colors duration-[var(--fast)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : loading && hits.length === 0 ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-14 rounded-[var(--r-md)]" />
                  ))}
                </div>
              ) : hits.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="t-h3">No matches for “{q.trim()}”</p>
                  <p className="t-caption mt-1">Try a subject name, a topic, or a file type.</p>
                </div>
              ) : (
                <ul role="listbox" aria-label="Search results" className="p-1.5">
                  {hits.map((hit, i) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(hit)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[var(--r-md)] px-2.5 py-2.5 text-left transition-colors duration-[var(--fast)]",
                          i === active ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]",
                        )}
                      >
                        <FileIcon mimeType={hit.file_type} fileName={hit.file_name} className="h-8 w-8" />
                        <span className="min-w-0 flex-1">
                          <span className="t-small block truncate font-medium text-[var(--text)]">
                            {hit.title}
                          </span>
                          <span className="t-meta block truncate">
                            {hit.subject_name} · {hit.category_name} · {hit.semester_name}
                          </span>
                        </span>
                        {i === active && (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[var(--text-subtle)]" aria-hidden />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {q.trim().length >= 2 && hits.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/search?q=${encodeURIComponent(q.trim())}`);
                }}
                className="w-full border-t border-[var(--border)] px-4 py-3 text-left text-[0.82rem] text-[var(--text-muted)] transition-colors duration-[var(--fast)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                See all results for “{q.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
