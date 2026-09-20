import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { Wordmark } from "@/components/public/brand";
import { brand } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Wordmark href="/" />
          <h1 className="t-h1 mt-6">Sign in</h1>
          <p className="t-caption mt-1.5">Manage the {brand.name} library.</p>
        </div>
        <div className="surface-card p-6 shadow-[var(--shadow-sm)]">
          <LoginForm />
        </div>
        <p className="t-meta mt-6 text-center">
          Students don&apos;t need an account —{" "}
          <Link href="/" className="text-[var(--accent)] hover:underline">
            browse the library
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
