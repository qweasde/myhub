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

export function profileTitle(profile: ProfileViewData): string {
  const name = profile.display_name || `@${profile.username}`;
  return profile.profession ? `${name} — ${profile.profession}` : name;
}

export function profileDescription(profile: ProfileViewData): string {
  if (profile.bio) return profile.bio.length > 160 ? `${profile.bio.slice(0, 157).trimEnd()}…` : profile.bio;
  return `${profile.display_name || `@${profile.username}`} на MyHub: проекты, навыки и контакты.`;
}
