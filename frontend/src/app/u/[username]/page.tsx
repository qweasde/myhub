import { ExternalLinkIcon, MailIcon, MapPinIcon, StarIcon } from "lucide-react";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LinkIcon } from "@/components/link-icon";
import { api, ApiError, type PublicProfile } from "@/lib/api";
import { displayUrl } from "@/lib/url";

// Served at /@username via the rewrite in next.config.ts.
// Basic layout for now; themes, blocks and OG tags come in steps 4-5.
export default function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-5 py-16">
      <Suspense fallback={<div className="mx-auto size-24 animate-pulse rounded-full bg-muted" />}>
        {params.then(({ username }) => (
          <Profile username={username} />
        ))}
      </Suspense>
    </main>
  );
}

async function getProfile(username: string): Promise<PublicProfile> {
  try {
    return await api<PublicProfile>(`/profiles/${encodeURIComponent(username)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

async function Profile({ username }: { username: string }) {
  const profile = await getProfile(username);
  const name = profile.display_name || `@${profile.username}`;

  return (
    <>
      <header className="flex flex-col items-center gap-3 text-center">
        {profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- served straight from MinIO/S3
          <img src={profile.avatar} alt={name} className="size-24 rounded-full object-cover" />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-full bg-muted text-3xl font-semibold uppercase">
            {(profile.display_name || profile.username)[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          {profile.profession && <p className="text-muted-foreground">{profile.profession}</p>}
        </div>
        {(profile.location || profile.contact_email || profile.website) && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3.5" /> {profile.location}
              </span>
            )}
            {profile.contact_email && (
              <a href={`mailto:${profile.contact_email}`} className="flex items-center gap-1 hover:text-foreground">
                <MailIcon className="size-3.5" /> {profile.contact_email}
              </a>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground">
                <ExternalLinkIcon className="size-3.5" /> {displayUrl(profile.website)}
              </a>
            )}
          </div>
        )}
        {profile.bio && <p className="max-w-prose whitespace-pre-line">{profile.bio}</p>}
      </header>

      {profile.links.length > 0 && (
        <section className="flex flex-col gap-2">
          {profile.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border px-4 py-3 font-medium transition-colors hover:bg-muted"
            >
              <LinkIcon icon={link.icon ?? "website"} />
              <span className="flex-1">{link.title}</span>
            </a>
          ))}
        </section>
      )}

      {profile.projects.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Проекты</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.projects.map((project) => (
              <article key={project.id} className="flex flex-col overflow-hidden rounded-lg border">
                {project.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- served straight from MinIO/S3
                  <img src={project.image} alt="" className="aspect-video w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="flex items-center gap-1.5 font-medium">
                    {project.title}
                    {project.is_featured && <StarIcon className="size-3.5 fill-current text-amber-500" />}
                  </h3>
                  {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
                  {!!project.technologies?.length && (
                    <p className="text-xs text-muted-foreground">{project.technologies.join(" · ")}</p>
                  )}
                  <div className="mt-auto flex gap-3 pt-2 text-sm">
                    {project.github_url && (
                      <a href={project.github_url} target="_blank" rel="noreferrer" className="hover:underline">
                        GitHub
                      </a>
                    )}
                    {project.demo_url && (
                      <a href={project.demo_url} target="_blank" rel="noreferrer" className="hover:underline">
                        Демо
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span key={skill} className="rounded-full border px-3 py-1 text-sm">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      <footer className="pt-6 text-center text-xs text-muted-foreground">
        Сделано на{" "}
        <NextLink href="/" className="hover:underline">
          MyHub
        </NextLink>
      </footer>
    </>
  );
}
