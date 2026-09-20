import Link from "next/link";
import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/public/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark href="/" size="sm" />
      <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-2)] text-[var(--text-subtle)]">
        <Compass className="h-5 w-5" aria-hidden />
      </div>
      <h1 className="t-h1 mt-5">This page doesn&rsquo;t exist</h1>
      <p className="t-caption mt-2 max-w-sm text-balance">
        The link may be out of date, or the material may have been unpublished.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/">Go to the library</ButtonLink>
        <ButtonLink href="/materials" variant="secondary">
          Browse everything
        </ButtonLink>
      </div>
      <p className="t-meta mt-8">
        Looking for the admin area?{" "}
        <Link href="/admin" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
