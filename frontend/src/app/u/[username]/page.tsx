import type { Metadata } from "next";
import { ProfileTracker } from "@/components/profile-tracker";
import { ProfileView } from "@/components/profile-view";
import { getPublicProfile, profileDescription, profileTitle } from "@/lib/public-profile";

// Served at /@username via the rewrite in next.config.ts. Unknown usernames are answered
// with a real 404 by proxy.ts before rendering; notFound() below is the fallback.
// The page awaits its data at the top (one fast API call) instead of streaming it behind a
// Suspense fallback, so crawlers get complete HTML. That makes it a blocking route by design.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const profile = await getPublicProfile((await params).username);
  const title = profileTitle(profile);
  const description = profileDescription(profile);
  const url = `/@${profile.username}`;
  return {
    title: { absolute: `${title} · MyHub` },
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", siteName: "MyHub", locale: "ru_RU", title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  const profile = await getPublicProfile((await params).username);
  return (
    <>
      <ProfileView profile={profile} className="flex-1" />
      <ProfileTracker username={profile.username} />
    </>
  );
}
