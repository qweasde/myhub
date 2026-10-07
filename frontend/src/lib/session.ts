"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type Me } from "@/lib/api";

const ME_KEY = ["me"] as const;

async function fetchMe(): Promise<Me | null> {
  try {
    return await api<Me>("/me");
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 60_000 });
}

export function useRefreshMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ME_KEY });
}
