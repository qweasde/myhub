import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import type { ProfileViewData } from "@/components/profile-view";
import { api, ApiError } from "@/lib/api";

/** Public profile for /@username; 404s for unknown or unpublished ones. Deduped per request. */
export const getPublicProfile = cache(async (username: string): Promise<ProfileViewData> => {
  try {
    return await api<ProfileViewData>(`/profiles/${encodeURIComponent(username)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export { profileDescription, profileTitle } from "@/lib/profile-text";
