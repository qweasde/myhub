// Django sets the `csrftoken` cookie on any allauth browser endpoint; unsafe requests echo it back.
export function getCsrfToken(): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];
}

export async function ensureCsrfToken(): Promise<string | undefined> {
  if (!getCsrfToken()) {
    await fetch("/_allauth/browser/v1/config");
  }
  return getCsrfToken();
}
