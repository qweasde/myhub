import { Suspense } from "react";

// Served at /@username via the rewrite in next.config.ts
export default function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-4 px-6 py-24">
      <Suspense fallback={<div className="h-24 w-24 animate-pulse rounded-full bg-foreground/10" />}>
        {params.then(({ username }) => (
          <ProfileHeader username={username} />
        ))}
      </Suspense>
    </main>
  );
}

// TODO(step 3): fetch the profile from /api/v1/profiles/{username} and render its blocks
function ProfileHeader({ username }: { username: string }) {
  return (
    <>
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-foreground/10 text-3xl font-semibold uppercase">
        {username[0]}
      </div>
      <h1 className="text-2xl font-semibold">@{username}</h1>
    </>
  );
}
