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
    throw new AuthError(res.status, data.errors ?? [{ message: "Что-то пошло не так", code: "unknown" }]);
  }
  return data;
}

export const auth = {
  login: (email: string, password: string) => request("POST", "/auth/login", { email, password }),
  signup: (email: string, username: string, password: string) =>
    request("POST", "/auth/signup", { email, username, password }),
  logout: () => request("DELETE", "/auth/session"),
  requestPasswordReset: (email: string) => request("POST", "/auth/password/request", { email }),
  resetPassword: (key: string, password: string) =>
    request("POST", "/auth/password/reset", { key, password }),
  verifyEmail: (key: string) => request("POST", "/auth/email/verify", { key }),
};
