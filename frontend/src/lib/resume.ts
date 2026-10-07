import type { Education, Experience, LanguageLevel } from "@/lib/api";

export const LEVEL_LABELS: Record<LanguageLevel, string> = {
  A1: "A1 — начальный",
  A2: "A2 — элементарный",
  B1: "B1 — средний",
  B2: "B2 — выше среднего",
  C1: "C1 — продвинутый",
  C2: "C2 — свободный",
  native: "Родной",
};

const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("ru-RU", { month: "short", year: "numeric" }).replace(" г.", "");

/** "мар. 2022 — н. в. · 3 г. 7 мес." */
export function experiencePeriod(job: Pick<Experience, "start_date" | "end_date">): string {
  const start = new Date(`${job.start_date}T00:00:00`);
  const end = job.end_date ? new Date(`${job.end_date}T00:00:00`) : new Date();
  const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const duration = [years && `${years} г.`, rest && `${rest} мес.`].filter(Boolean).join(" ");
  return `${monthYear(job.start_date)} — ${job.end_date ? monthYear(job.end_date) : "н. в."} · ${duration}`;
}

export function educationPeriod(item: Pick<Education, "start_year" | "end_year">): string {
  if (item.start_year && item.end_year) {
    return item.start_year === item.end_year ? String(item.end_year) : `${item.start_year} — ${item.end_year}`;
  }
  return String(item.end_year ?? item.start_year ?? "");
}
