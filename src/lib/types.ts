export type MaterialStatus = "draft" | "published" | "archived";

export type Semester = {
  id: string;
  name: string;
  slug: string;
  short_label: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SemesterWithCounts = Semester & {
  subject_count: number;
  material_count: number;
};

export type Subject = {
  id: string;
  semester_id: string;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SubjectWithCounts = Subject & {
  material_count: number;
  semester_name?: string;
  semester_slug?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryWithCount = Category & { material_count: number };

export type Material = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  semester_id: string;
  subject_id: string;
  category_id: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  storage_provider: string | null;
  storage_file_id: string | null;
  storage_url: string | null;
  external_url: string | null;
  instructor: string | null;
  status: MaterialStatus;
  download_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
};

export type MaterialWithRefs = Material & {
  semester_name: string;
  semester_slug: string;
  subject_name: string;
  subject_slug: string;
  subject_icon: string;
  category_name: string;
  category_slug: string;
  category_icon: string;
  tags: string[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
