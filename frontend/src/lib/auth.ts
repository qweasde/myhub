// Client for the django-allauth headless "browser" API, proxied at /_allauth (see next.config.ts).
import { ensureCsrfToken } from "@/lib/csrf";

const BASE = "/_allauth/browser/v1";

export type AuthFieldError = { message: string; code: string; param?: string };

type AuthResponse = {
  status: number;
  data?: unknown;
  meta?: { is_authenticated?: boolean };
  errors?: AuthFieldError[];
};

export class AuthError extends Error {
  constructor(
    public status: number,
    public errors: AuthFieldError[],
  ) {
    super(errors[0]?.message ?? `Auth error ${status}`);
  }
}

async function request(method: string, path: string, body?: unknown): Promise<AuthResponse> {
  const csrfToken = await ensureCsrfToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: AuthResponse = await res.json().catch(() => ({ status: res.status }));
  // 401 is a normal answer here ("not logged in" / "logged out"), only 4xx validation errors throw.
  if (res.status >= 400 && res.status !== 401) {
    throw new AuthError(res.status, data.errors ?? [{ message: `Ошибка сервера (${res.status})`, code: "unknown" }]);
  }
  return data;
}

/**
 * allauth answers login/signup with a bare 409 when the browser already has a session
 * (e.g. an old login, or switching accounts). End that session and try once more.
 */
async function withFreshSession(path: string, body: unknown): Promise<AuthResponse> {
  try {
    return await request("POST", path, body);
  } catch (error) {
    if (!(error instanceof AuthError && error.status === 409)) throw error;
    await request("DELETE", "/auth/session");
    return request("POST", path, body);
  }
}

export const auth = {
  login: (email: string, password: string) => withFreshSession("/auth/login", { email, password }),
  signup: (email: string, username: string, password: string) =>
    withFreshSession("/auth/signup", { email, username, password }),
  logout: () => request("DELETE", "/auth/session"),
  requestPasswordReset: (email: string) => request("POST", "/auth/password/request", { email }),
  resetPassword: (key: string, password: string) =>
    request("POST", "/auth/password/reset", { key, password }),
  verifyEmail: (key: string) => request("POST", "/auth/email/verify", { key }),
};
