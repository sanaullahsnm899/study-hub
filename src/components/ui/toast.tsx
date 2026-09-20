"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-client-value";

type ToastTone = "success" | "error" | "info" | "warning";
type Toast = { id: number; tone: ToastTone; message: string };

const ToastContext = createContext<{ push: (message: string, tone?: ToastTone) => void }>({
  push: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const toneClass: Record<ToastTone, string> = {
  success: "text-[var(--accent)]",
  error: "text-[var(--danger)]",
  info: "text-[var(--info)]",
  warning: "text-[var(--warning)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mounted = useIsClient();

  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, tone, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4800);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:right-0 sm:top-0 sm:items-end safe-b"
            role="region"
            aria-label="Notifications"
          >
            {toasts.map((t) => {
              const Icon = icons[t.tone];
              return (
                <div
                  key={t.id}
                  role="status"
                  className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-[var(--shadow-lg)]"
                  style={{ animation: "sheet-up var(--normal) var(--ease) both" }}
                >
                  <Icon className={cn("mt-0.5 h-[1.05rem] w-[1.05rem] shrink-0", toneClass[t.tone])} />
                  <p className="t-small flex-1 text-[var(--text)]">{t.message}</p>
                  <button
                    type="button"
                    onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                    className="text-[var(--text-subtle)] transition-colors hover:text-[var(--text)]"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
