# StudyHub

**Everything you need for your semester.**

A study-material library for a university class. Students browse, search and download without
an account; the Class Representative signs in to a private dashboard to upload material and
organise it. Files live in Google Drive, the database holds only metadata.

---
## Features

### For students (no account, no login)

- Browse by semester → subject → category, with semantic URLs like `/semester/seventh-semester/information-security`
- Global search with `Ctrl`/`⌘` + `K`, full-text ranked over titles, descriptions, subjects and tags
- Filter by semester, subject, category, file type and date; a bottom-sheet filter drawer on mobile
- Material pages with an inline PDF preview, file details, tags and related material
- View in the browser, download, or open an external link — all counted anonymously
- Light, dark and system themes; installable as a PWA

## Architecture

**Layering.** Routes and components never write SQL. Each page or API route calls a repository
function in `src/lib/repo/`, which owns its queries and returns typed rows. Swapping the data
layer means touching one folder.

**Storage abstraction.** `StorageProvider` (`src/lib/storage/types.ts`) defines `upload`,
`getContent`, `getMetadata` and `delete`. Two implementations ship: `google_drive` for
production and `local` for development and tests. The active provider is chosen at runtime —
Drive when its credentials are present, otherwise the local disk — so the app runs with zero
credentials on a laptop. `materials.storage_provider` records which provider wrote each file, so
files keep working after a configuration change.

**Google Drive without the SDK.** `src/lib/storage/google-drive.ts` signs an RS256 service-account
JWT with Node's `crypto` and calls the Drive v3 REST API over `fetch`. No `googleapis`
dependency, a much smaller serverless bundle, and access tokens are cached until they expire.

**Files are never public.** Drive files stay private. Students reach them through
`/api/materials/[id]/view|download|open`, which validates the id, streams the bytes through the
server and records the event. Drive URLs and credentials never reach the browser.

**Search.** A generated `tsvector` column on `materials`, weighted A→D (title, tags, description,
instructor), indexed with GIN. Queries use `websearch_to_tsquery` with an `ILIKE` fallback so
partial words and subject names still match, ranked by `ts_rank`.

**Soft delete.** Deleting a material sets `deleted_at` and archives it. It vanishes from both the
public site and the dashboard but stays recoverable; `?purge=1` removes the row and the stored file.

**Rendering.** Public pages are server components reading the database directly, marked
`force-dynamic` so a newly published material appears at once. Interactive islands (search,
filters, upload, tables) are client components. There is deliberately no root `loading.tsx`: a
root loading boundary commits a `200` before `notFound()` can run, which would turn every missing
page into a soft 404.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Server components, route handlers, one deploy target |
| Language | TypeScript (strict) | |
| Database | PostgreSQL 16 (Supabase-compatible) | Full-text search and constraints in the database |
| Driver | `pg` | Plain SQL, no ORM to learn or fight |
| Storage | Google Drive v3 REST | Free, familiar, and the folders mirror the site |
| Validation | Zod | One schema shared by the API and the forms |
| Styling | Tailwind CSS v4 over CSS custom properties | Tokens in `:root`, so the theme is one file |
| Icons | lucide-react | |
| Tests | Vitest | |

**Design.** Deep viridian (`#0f6b57`) on a cool paper neutral, Newsreader for headings and
Inter Tight for UI. Every colour, radius, shadow and duration is a CSS variable in
`globals.css`; Tailwind reads them through `@theme inline`. Re-theming is one block of
variables.

---

## Folder structure

```
db/
  schema.sql            Tables, indexes, search vector, triggers (idempotent)
  migrate.ts            Applies schema.sql
  seed.ts               Demo data (--reset to wipe first)
  create-admin.ts       Creates or updates an admin account
src/
  app/
    (site)/             Public pages: home, semester, subject, material, search, materials
    admin/
      login/            Sign-in page
      (dashboard)/      Dashboard, materials, semesters, subjects, categories, analytics, settings
    api/
      admin/            Protected CRUD, upload, reorder, bulk, password, status
      auth/             Login and logout
      materials/[id]/   view, download, open  (public, counted)
      search/           Search-as-you-type endpoint
    layout.tsx  globals.css  not-found.tsx  error.tsx
  components/
    public/             Header, footer, cards, global search, filters, browser
    admin/              Shell, material form, materials table, taxonomy manager, uploader
    ui/                 Button, field, dialog, toast, badge, pagination, skeletons…
  lib/
    repo/               All SQL: materials, taxonomy, analytics, admins, slugs
    storage/            Provider interface, Google Drive, local disk
    auth session password rate-limit api validation config utils db
  proxy.ts              Redirects anonymous visitors away from /admin
tests/                  Vitest suites
```

---

## Database setup

Any PostgreSQL 14+ works; Supabase is the intended host.

```bash
createdb studyhub                 # or create a Supabase project
cp .env.example .env.local        # then set DATABASE_URL
npm run db:migrate                # apply the schema
npm run db:seed                   # optional demo data
```

`npm run db:reset` wipes and reseeds. The schema is idempotent, so `db:migrate` is safe to re-run.

**Tables.** `admins`, `semesters`, `subjects`, `categories`, `materials`, `tags`,
`material_tags`, `download_events`. Materials carry a `materials_has_source` check constraint
(every row needs either a stored file or an external URL), a `deleted_at` soft-delete column, and
a generated `search_vector`. An `updated_at` trigger runs on every table.

---

## Environment variables

Copy `.env.example` to `.env.local`. Nothing except `NEXT_PUBLIC_*` reaches the browser.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. SSL is enabled automatically for hosted providers. |
| `AUTH_SECRET` | yes | ≥32 random characters, signs session cookies. `openssl rand -base64 48` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | first run | Used by `npm run admin:create` and the seed. |
| `GOOGLE_DRIVE_CLIENT_EMAIL` | production | Service-account email. |
| `GOOGLE_DRIVE_PRIVATE_KEY` | production | Service-account private key, `\n` escapes intact, in quotes. |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | production | The shared Drive folder that holds everything. |
| `GOOGLE_DRIVE_SHARED_DRIVE_ID` | optional | Only for a shared (team) drive. |
| `STORAGE_PROVIDER` | optional | Force `google_drive` or `local`. |
| `MAX_UPLOAD_MB` | optional | Default 50. |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical URL for metadata. |
| `NEXT_PUBLIC_BRAND_NAME` | optional | Rename the product without touching code. |

Without Drive credentials the app falls back to the local disk and the dashboard says so.

---

## Google Drive setup

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project and enable the **Google Drive API**.
2. Create a **service account**, then add a **JSON key** and download it.
3. In Google Drive, create the folder that will hold everything, e.g. `Study Materials`.
4. Share that folder with the service account's `client_email`, giving it **Editor** access.
5. Open the folder; its ID is the part of the URL after `/folders/`.
6. Set the three `GOOGLE_DRIVE_*` variables and redeploy.

Uploads are filed as `Root / Semester / Subject / Category / file`, so Drive mirrors the site.
Folders are created on demand and cached.

> Paste the private key in quotes with its `\n` sequences intact:
> `GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`

---

## Admin account setup

```bash
npm run admin:create
```

Reads `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`, hashes the password with scrypt and
upserts the account. Change the password afterwards from **Settings**. There are no student
accounts by design.

---

## Running locally

```bash
npm install
cp .env.example .env.local
npm run db:migrate && npm run db:seed
npm run dev
```

- Public site: <http://localhost:3000>
- Admin: <http://localhost:3000/admin> (seeded credentials come from `.env.local`)

---

## Testing

```bash
npm test
```

76 tests across 5 files run against a throwaway `studyhub_test` database (configured in
`.env.test`, created and migrated automatically):

| File | Covers |
| --- | --- |
| `unit.test.ts` | Password hashing, session signing and expiry, CSRF token entropy, rate limiting, upload validation, slug and filename safety, Zod schemas |
| `auth.test.ts` | Unauthenticated and forged-session rejection, CSRF double-submit, cross-origin blocking, admin lookup |
| `taxonomy.test.ts` | Semester/subject/category CRUD, slug scoping and collisions, active flags, delete guards, reordering |
| `materials.test.ts` | Create/update/move, publishing, draft invisibility, soft delete and restore, bulk actions, search, every filter, pagination, download counting, analytics |
| `storage.test.ts` | Upload round-trip, folder mirroring, path-traversal refusal, provider selection |

---

## Production build

```bash
npm run lint       # eslint, clean
npm run typecheck  # tsc --noEmit, clean
npm test           # 76 passing
npm run build      # compiles, 36 routes
npm start
```
---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `DATABASE_URL is not set` | Create `.env.local`; restart the dev server after editing it. |
| `AUTH_SECRET must be set…` | Needs ≥32 characters. `openssl rand -base64 48` |
| `self signed certificate` / SSL errors | Add `?sslmode=require` for hosted Postgres, or `?sslmode=disable` locally. |
| Login says the password is wrong | Run `npm run admin:create` to reset it from the env values. |
| Dashboard warns about local disk | Drive credentials are missing or malformed — usually the private key's `\n` escapes. |
| `invalid_grant` from Drive | The server clock is skewed, or the key was revoked. |
| Drive uploads 404 | The root folder was never shared with the service account as Editor. |
| Uploads fail at ~4.5 MB on Vercel | The Hobby request-body limit. Lower `MAX_UPLOAD_MB` or upgrade. |
| Search finds nothing after a restore | Reindex: `UPDATE materials SET updated_at = now();` regenerates the search vector. |

---

## Security notes

- **Passwords** are hashed with scrypt and a per-user salt, compared in constant time. Plaintext is never stored or logged.
- **Sessions** are HMAC-SHA256 signed cookies: `httpOnly`, `sameSite=lax`, `secure` in production, 12-hour expiry. Tampering invalidates the signature.
- **CSRF** uses a double-submit token plus a same-origin check on every state-changing request.
- **Rate limiting** guards login (8 per 15 minutes per IP) and password changes (5 per 15 minutes). Login never reveals whether an email exists.
- **Authorisation** is enforced in each admin route handler, not only in `proxy.ts` — the redirect is convenience, the handler is the boundary.
- **Uploads** are validated on MIME type, extension-to-type agreement and size; filenames are sanitised against traversal; the local provider refuses to resolve outside its root.
- **Injection** is prevented by parameterised queries everywhere; identifiers are never interpolated from user input.
- **Headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and a `Permissions-Policy` are set in `next.config.ts`.
- **Errors** are mapped to safe messages; stack traces stay in server logs.
- **Secrets** live only in the environment. `/admin` and `/api/` are disallowed in `robots.txt` and the admin area is `noindex`.
