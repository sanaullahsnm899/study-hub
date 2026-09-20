import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AdminShell admin={{ name: session.name, email: session.email }}>{children}</AdminShell>;
}
