import type { components } from "@/lib/api-schema";

// Server components call Django directly; the browser goes through the /api rewrite.
const BASE_URL = typeof window === "undefined" ? (process.env.BACKEND_URL ?? "http://localhost:8000") : "";

type Schemas = components["schemas"];
export type Me = Schemas["Me"];
export type Profile = Schemas["Profile"];
export type Link = Schemas["Link"];
export type LinkIcon = Schemas["IconEnum"];
export type Project = Schemas["Project"];
export type Skill = Schemas["Skill"];
export type PublicProfile = Schemas["PublicProfile"];

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(firstErrorMessage(body) ?? `API error ${status}`);
  }

  /** DRF validation errors: `{field: ["message", ...]}` */
  get fieldErrors(): Record<string, string> {
    if (!this.body || typeof this.body !== "object") return {};
    return Object.fromEntries(
      Object.entries(this.body as Record<string, unknown>).map(([field, value]) => [
        field,
        Array.isArray(value) ? String(value[0]) : String(value),
      ]),
    );
  }
}

function firstErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = Object.values(body as Record<string, unknown>)[0];
  return Array.isArray(value) ? String(value[0]) : typeof value === "string" ? value : undefined;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (typeof window !== "undefined" && init?.method && init.method !== "GET") {
    const { ensureCsrfToken } = await import("@/lib/csrf");
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers.set("X-CSRFToken", csrfToken);
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});

export function uploadImage<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("image", file);
  return api<T>(path, { method: "PUT", body });
}
