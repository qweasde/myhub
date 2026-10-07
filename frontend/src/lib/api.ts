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
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
