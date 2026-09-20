import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { listSemesters } from "@/lib/repo/taxonomy";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let semesters: { slug: string; name: string; short_label: string | null }[] = [];
  try {
    semesters = await listSemesters();
  } catch {
    // The shell still renders if the database is unreachable; pages show their own error state.
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader semesters={semesters} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter semesters={semesters} />
    </div>
  );
}
