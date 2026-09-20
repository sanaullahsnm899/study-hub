import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, HardDrive } from "lucide-react";
import { PasswordForm } from "@/components/admin/password-form";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth";
import { storageStatus } from "@/lib/storage";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, brand } from "@/lib/config";
import { formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

const DRIVE_STEPS = [
  "In the Google Cloud console, create a project and enable the Google Drive API.",
  "Create a service account, then create a JSON key for it and download the file.",
  "In Google Drive, create the folder that will hold everything (for example “Study Materials”).",
  "Share that folder with the service account’s email address and give it Editor access.",
  "Open the folder and copy the ID from the address bar — it is the part after /folders/.",
  "Set GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY and GOOGLE_DRIVE_ROOT_FOLDER_ID in your environment, then redeploy.",
];

export default async function SettingsPage() {
  const session = await requireSession();
  const storage = storageStatus();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="t-h1">Settings</h1>
      <p className="t-caption mb-6 mt-1">Storage, account and upload limits for {brand.name}.</p>

      <section className="surface-card p-5" aria-labelledby="storage-heading">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="storage-heading" className="t-h3">
              File storage
            </h2>
            <p className="t-caption mt-1">
              Where uploaded files are kept. The database only stores metadata and a reference.
            </p>
          </div>
          <HardDrive className="h-5 w-5 shrink-0 text-[var(--text-subtle)]" aria-hidden />
        </div>

        <dl className="mt-4 space-y-2.5 border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <dt className="t-small text-[var(--text-muted)]">Active provider</dt>
            <dd>
              {storage.active === "google_drive" ? (
                <Badge tone="accent">
                  <CheckCircle2 className="h-3 w-3" /> Google Drive
                </Badge>
              ) : (
                <Badge tone="warning">
                  <CircleAlert className="h-3 w-3" /> Local disk
                </Badge>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="t-small text-[var(--text-muted)]">Maximum upload size</dt>
            <dd className="t-small tabular-nums">{formatBytes(MAX_UPLOAD_BYTES)}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="t-small shrink-0 text-[var(--text-muted)]">Accepted files</dt>
            <dd className="t-small text-right">{ALLOWED_EXTENSIONS.join(", ")}</dd>
          </div>
        </dl>

        {!storage.googleDriveConfigured && (
          <div className="mt-5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--warning-soft)] p-4">
            <p className="t-small font-medium">Google Drive is not configured yet</p>
            <p className="t-caption mt-1">
              Uploads are going to the local disk, which is wiped on every deployment when hosted on
              Vercel. Connect Drive before you rely on it:
            </p>
            <ol className="mt-3 space-y-1.5">
              {DRIVE_STEPS.map((step, i) => (
                <li key={i} className="t-caption flex gap-2.5">
                  <span className="numeral shrink-0 text-[var(--text-subtle)]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="t-meta mt-3">
              Credentials stay on the server. They are never sent to the browser and never committed
              to Git.
            </p>
          </div>
        )}

        {storage.googleDriveConfigured && (
          <p className="t-caption mt-4">
            Uploads are filed in Drive under <code>Semester / Subject / Category</code>, mirroring the
            structure students see.
          </p>
        )}
      </section>

      <section className="surface-card mt-6 p-5" aria-labelledby="account-heading">
        <h2 id="account-heading" className="t-h3">
          Your account
        </h2>
        <p className="t-caption mb-4 mt-1">
          Signed in as {session.name} ({session.email}).
        </p>
        <PasswordForm />
      </section>

      <section className="surface-card mt-6 p-5" aria-labelledby="content-heading">
        <h2 id="content-heading" className="t-h3">
          Sharing responsibly
        </h2>
        <p className="t-caption mt-1">
          Only upload material you are allowed to distribute. For textbooks and anything with
          uncertain redistribution rights, add it as an external link to the authorised source
          instead of uploading a copy.
        </p>
      </section>
    </div>
  );
}
