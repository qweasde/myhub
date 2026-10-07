// The public page, rendered from blocks. No hooks: used by the server-rendered /@username
// page and by the client-side live preview in the dashboard builder.
import { ExternalLinkIcon, MailIcon, MapPinIcon, StarIcon } from "lucide-react";
import NextLink from "next/link";
import { LinkIcon } from "@/components/link-icon";
import type { Project, PublicProfile } from "@/lib/api";
import { type AnyBlock, type BlockConfigs, blockTitle } from "@/lib/blocks";
import { displayUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

export type ProfileViewData = Omit<PublicProfile, "blocks"> & { blocks: AnyBlock[] };

type Props = {
  profile: ProfileViewData;
  /** Dashboard preview: show hints for blocks that have no data yet */
  preview?: boolean;
};

export function ProfileView({ profile, preview }: Props) {
  return (
    <div className="flex flex-col gap-10">
      {profile.blocks.map((block) => (
        <BlockView key={block.id} block={block} profile={profile} preview={preview} />
      ))}
      <footer className="pt-6 text-center text-xs text-muted-foreground">
        Сделано на{" "}
        <NextLink href="/" className="hover:underline">
          MyHub
        </NextLink>
      </footer>
    </div>
  );
}

function BlockView({ block, profile, preview }: { block: AnyBlock } & Props) {
  switch (block.type) {
    case "profile":
      return <HeaderBlock profile={profile} />;
    case "links":
      return profile.links.length ? (
        <LinksBlock links={profile.links} config={block.config} />
      ) : (
        <Placeholder show={preview}>Нет видимых ссылок</Placeholder>
      );
    case "text":
      return block.config.body || block.config.title ? (
        <Section title={block.config.title}>
          <p className="whitespace-pre-line">{block.config.body}</p>
        </Section>
      ) : (
        <Placeholder show={preview}>Пустой текстовый блок: заполните его в настройках</Placeholder>
      );
    case "projects": {
      const projects = block.config.featured_only ? profile.projects.filter((p) => p.is_featured) : profile.projects;
      return projects.length ? (
        <Section title={blockTitle(block)}>
          <ProjectsGrid projects={projects} />
        </Section>
      ) : (
        <Placeholder show={preview}>
          {block.config.featured_only ? "Нет избранных проектов" : "Нет проектов"}
        </Placeholder>
      );
    }
    case "skills":
      return profile.skills.length ? (
        <Section title={blockTitle(block)}>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span key={skill} className="rounded-full border px-3 py-1 text-sm">
                {skill}
              </span>
            ))}
          </div>
        </Section>
      ) : (
        <Placeholder show={preview}>Нет навыков</Placeholder>
      );
    case "contact":
      return profile.contact_email ? (
        <ContactBlock title={blockTitle(block)} text={block.config.text} email={profile.contact_email} />
      ) : (
        <Placeholder show={preview}>Укажите «Email для связи» в профиле, чтобы показать контакты</Placeholder>
      );
  }
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Placeholder({ show, children }: { show?: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{children}</div>
  );
}

function HeaderBlock({ profile }: { profile: ProfileViewData }) {
  const name = profile.display_name || `@${profile.username}`;
  return (
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
      {(profile.location || profile.website) && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="size-3.5" /> {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLinkIcon className="size-3.5" /> {displayUrl(profile.website)}
            </a>
          )}
        </div>
      )}
      {profile.bio && <p className="max-w-prose whitespace-pre-line">{profile.bio}</p>}
    </header>
  );
}

function LinksBlock({ links, config }: { links: ProfileViewData["links"]; config: BlockConfigs["links"] }) {
  if (config.layout === "icons") {
    return (
      <nav className="flex flex-wrap justify-center gap-3">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            title={link.title}
            aria-label={link.title}
            className="flex size-11 items-center justify-center rounded-full border transition-colors hover:bg-muted"
          >
            <LinkIcon icon={link.icon ?? "website"} className="size-5" />
          </a>
        ))}
      </nav>
    );
  }
  return (
    <nav className="flex flex-col gap-2">
      {links.map((link) => (
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
    </nav>
  );
}

function ProjectsGrid({ projects }: { projects: Project[] }) {
  return (
    <div className={cn("grid gap-4", projects.length > 1 && "sm:grid-cols-2")}>
      {projects.map((project) => (
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
            {(project.github_url || project.demo_url) && (
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
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ContactBlock({ title, text, email }: { title: string; text: string; email: string }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-xl bg-muted px-6 py-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {text && <p className="max-w-prose text-muted-foreground">{text}</p>}
      <a
        href={`mailto:${email}`}
        className="mt-1 flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
      >
        <MailIcon className="size-4" /> Написать
      </a>
      <span className="text-sm text-muted-foreground">{email}</span>
    </section>
  );
}
