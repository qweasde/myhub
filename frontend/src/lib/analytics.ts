"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Totals = { views: number; unique_visitors: number; clicks: number };

export type Analytics = {
  days: number;
  totals: Totals & { ctr: number };
  previous: Totals;
  daily: (Totals & { date: string })[];
  top_links: { id: number | null; title: string; clicks: number }[];
  referrers: { host: string; views: number }[];
  devices: { device: string; views: number }[];
};

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function useAnalytics(days: Period) {
  return useQuery({
    queryKey: ["me", "analytics", days],
    queryFn: () => api<Analytics>(`/me/analytics?days=${days}`),
    placeholderData: (previous) => previous,
  });
}

/** Relative change vs the previous period, or null when there is nothing to compare with. */
export function change(current: number, previous: number): number | null {
  return previous ? (current - previous) / previous : null;
}
