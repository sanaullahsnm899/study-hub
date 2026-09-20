"use client";

/** Read the double-submit CSRF token the login response set. */
function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)sh_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, string>,
  ) {
    super(message);
  }
}

/** JSON fetch helper that attaches CSRF and normalises error handling. */
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; formData?: FormData } = {},
): Promise<T> {
  const method = options.method ?? (options.body || options.formData ? "POST" : "GET");
  const headers: Record<string, string> = {};
  if (method !== "GET") headers["x-csrf-token"] = csrfToken();
  if (options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(path, {
    method,
    headers,
    body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
    credentials: "same-origin",
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || "Something went wrong. Please try again.",
      res.status,
      (data as { details?: Record<string, string> }).details,
    );
  }
  return data as T;
}
