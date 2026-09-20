"use client";

import { cn } from "@/lib/utils";

const control =
  "w-full rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] " +
  "placeholder:text-[var(--text-subtle)] transition-[border-color,box-shadow] duration-[var(--fast)] " +
  "focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-ring)] " +
  "disabled:opacity-60 disabled:bg-[var(--surface-2)]";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-11 px-3 text-[0.95rem]", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 px-3 py-2.5 text-[0.95rem] leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(control, "h-11 appearance-none pl-3 pr-9 text-[0.95rem] cursor-pointer", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[0.85rem] font-medium text-[var(--text)]">
        {label}
        {required && <span className="ml-1 text-[var(--danger)]">*</span>}
      </label>
      {children}
      {error ? (
        <p className="t-meta text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="t-meta">{hint}</p>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-[var(--fast)]",
        checked
          ? "bg-[var(--accent)] border-[var(--accent)]"
          : "bg-[var(--surface-3)] border-[var(--border)]",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-[var(--fast)]",
          checked ? "left-[1.45rem]" : "left-[0.2rem]",
        )}
        style={{ height: "1.05rem", width: "1.05rem" }}
      />
    </button>
  );
}
