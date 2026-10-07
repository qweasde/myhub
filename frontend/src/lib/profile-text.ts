// Title/description of a public profile: <title>, Open Graph tags and the share preview card.
type Named = { username: string; display_name?: string; profession?: string; bio?: string };

export function profileTitle(profile: Named): string {
  const name = profile.display_name || `@${profile.username}`;
  return profile.profession ? `${name} — ${profile.profession}` : name;
}

export function profileDescription(profile: Named): string {
  if (profile.bio) return profile.bio.length > 160 ? `${profile.bio.slice(0, 157).trimEnd()}…` : profile.bio;
  return `${profile.display_name || `@${profile.username}`} на MyHub: проекты, навыки и контакты.`;
}

/** Absolute public URL; NEXT_PUBLIC_SITE_URL in production, the current origin otherwise. */
export function publicUrl(username: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${origin}/@${username}`;
}
