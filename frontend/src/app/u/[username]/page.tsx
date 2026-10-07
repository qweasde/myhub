import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProfileView, type ProfileViewData } from "@/components/profile-view";
import { api, ApiError } from "@/lib/api";

// Served at /@username via the rewrite in next.config.ts. Themes and OG tags come in step 5.
export default function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
      <Suspense fallback={<div className="mx-auto size-24 animate-pulse rounded-full bg-muted" />}>
        {params.then(({ username }) => (
          <Profile username={username} />
        ))}
      </Suspense>
    </main>
  );
}

async function getProfile(username: string): Promise<ProfileViewData> {
  try {
    return await api<ProfileViewData>(`/profiles/${encodeURIComponent(username)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

async function Profile({ username }: { username: string }) {
  return <ProfileView profile={await getProfile(username)} />;
}
