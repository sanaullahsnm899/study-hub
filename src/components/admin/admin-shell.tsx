"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Layers,
  BookOpen,
  X,
} from "lucide-react";
import { Wordmark } from "@/components/public/brand";
import { Button, ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/admin-client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/admin/materials", label: "Materials", Icon: FileText },
  { href: "/admin/semesters", label: "Semesters", Icon: Layers },
  { href: "/admin/subjects", label: "Subjects", Icon: BookOpen },
  { href: "/admin/categories", label: "Categories", Icon: FolderTree },
  { href: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

export function AdminShell({
  admin,
  children,
}: {
  admin: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      toast.push("Signed out.");
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.push("Could not sign out. Try again.", "error");
    }
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="Admin">
      {NAV.map(({ href, label, Icon, exact }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={isActive(href, exact) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-[var(--r-md)] px-2.5 py-2 text-[0.9rem] transition-colors duration-[var(--fast)]",
            isActive(href, exact)
              ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
          )}
        >
          <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );

  const sidebarBody = (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Wordmark href="/admin" size="sm" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-[var(--text-subtle)] lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
      {nav}
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="t-small truncate font-medium">{admin.name}</p>
        <p className="t-meta truncate">{admin.email}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={logout} className="px-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-[var(--bg)]">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 lg:flex">
        {sidebarBody}
      </aside>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 bg-[rgba(10,18,15,0.45)]"
            style={{ animation: "overlay-in var(--fast) var(--ease) both" }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="absolute inset-y-0 left-0 flex w-[17rem] flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)]"
          >
            {sidebarBody}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-[var(--r-md)] p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Wordmark href="/admin" size="sm" />
          <ButtonLink href="/admin/materials/new" size="sm" className="ml-auto">
            <Plus className="h-4 w-4" /> Add
          </ButtonLink>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
