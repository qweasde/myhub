// Server components call Django directly; the browser goes through the /api rewrite.
const BASE_URL = typeof window === "undefined" ? (process.env.BACKEND_URL ?? "http://localhost:8000") : "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (typeof window !== "undefined" && init?.method && init.method !== "GET") {
    const { ensureCsrfToken } = await import("@/lib/csrf");
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers.set("X-CSRFToken", csrfToken);
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers });
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export type Me = {
  id: number;
  username: string;
  email: string;
  email_verified: boolean;
  date_joined: string;
};
