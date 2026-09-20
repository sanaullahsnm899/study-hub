-- ============================================================
-- StudyHub schema (PostgreSQL 14+ / Supabase)
-- Idempotent: safe to run repeatedly.
-- ============================================================

CREATE TABLE IF NOT EXISTS admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL DEFAULT 'Administrator',
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'owner')),
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS semesters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  short_label text,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL,
  code        text,
  description text,
  icon        text NOT NULL DEFAULT 'book',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (semester_id, slug)
);

CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  icon        text NOT NULL DEFAULT 'file',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materials (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  slug             text NOT NULL UNIQUE,
  description      text,
  semester_id      uuid NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  subject_id       uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  category_id      uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  file_name        text,
  file_type        text,
  file_size        bigint,
  storage_provider text,
  storage_file_id  text,
  storage_url      text,
  external_url     text,
  instructor       text,
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  download_count   integer NOT NULL DEFAULT 0,
  created_by       uuid REFERENCES admins(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  published_at     timestamptz,
  deleted_at       timestamptz,
  CONSTRAINT materials_has_source CHECK (storage_file_id IS NOT NULL OR external_url IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_tags (
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, tag_id)
);

-- Anonymous: no IP, no user agent, no identifiers. Just "a download happened".
CREATE TABLE IF NOT EXISTS download_events (
  id          bigserial PRIMARY KEY,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'download' CHECK (kind IN ('download', 'view', 'external')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- search vector ----------
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(instructor, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(file_name, '')), 'D')
  ) STORED;

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS materials_search_idx        ON materials USING gin (search_vector);
CREATE INDEX IF NOT EXISTS materials_title_trgm_idx    ON materials (lower(title));
CREATE INDEX IF NOT EXISTS materials_semester_idx      ON materials (semester_id);
CREATE INDEX IF NOT EXISTS materials_subject_idx       ON materials (subject_id);
CREATE INDEX IF NOT EXISTS materials_category_idx      ON materials (category_id);
CREATE INDEX IF NOT EXISTS materials_status_idx        ON materials (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS materials_published_at_idx  ON materials (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS materials_downloads_idx     ON materials (download_count DESC);
CREATE INDEX IF NOT EXISTS subjects_semester_idx       ON subjects (semester_id, sort_order);
CREATE INDEX IF NOT EXISTS download_events_material_idx ON download_events (material_id, created_at DESC);

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['admins', 'semesters', 'subjects', 'categories', 'materials'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;
