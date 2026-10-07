import { z } from "zod";

/** "github.com/me" -> "https://github.com/me", "me@mail.ru" -> "mailto:me@mail.ru" */
export function normalizeUrl(value: string): string {
  const url = value.trim();
  if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

export const urlField = z
  .string()
  .trim()
  .min(1, "Введите ссылку")
  .transform(normalizeUrl)
  .pipe(z.url({ protocol: /^(https?|mailto)$/, error: "Некорректная ссылка" }));

export const optionalUrlField = z
  .string()
  .trim()
  .transform(normalizeUrl)
  .pipe(z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Некорректная ссылка" })]));

/** Short form for display: "https://www.github.com/me/" -> "github.com/me" */
export function displayUrl(url: string): string {
  return url.replace(/^mailto:/, "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}
