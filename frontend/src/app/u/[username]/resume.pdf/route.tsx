import { join } from "node:path";
import { Document, Font, Link, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ProfileViewData } from "@/components/profile-view";
import { api, ApiError } from "@/lib/api";
import { educationPeriod, experiencePeriod } from "@/lib/resume";
import { displayUrl } from "@/lib/url";

// Inter ships as per-script subsets; react-pdf falls back across the fontFamily list,
// so Latin comes from "Inter" and Cyrillic from "InterCyrillic".
const fontDir = join(process.cwd(), "node_modules/@fontsource/inter/files");
for (const [family, subset] of [
  ["Inter", "latin"],
  ["InterCyrillic", "cyrillic"],
] as const) {
  Font.register({
    family,
    fonts: [400, 600, 700].map((fontWeight) => ({
      src: join(fontDir, `inter-${subset}-${fontWeight}-normal.woff`),
      fontWeight,
    })),
  });
}
Font.registerHyphenationCallback((word) => [word]); // no hyphenation, Russian rules aren't built in

const ink = "#171717";
const muted = "#6b6b6b";
const accent = "#2a78d6";

const s = StyleSheet.create({
  page: { padding: 44, fontFamily: ["Inter", "InterCyrillic"], fontSize: 10, color: ink, lineHeight: 1.45 },
  // Explicit line heights: the page-level one is resolved against the 10pt body size,
  // which made the 24pt name overlap the line below it
  name: { fontSize: 24, fontWeight: 700, lineHeight: 1.2 },
  profession: { fontSize: 13, color: muted, marginTop: 2, lineHeight: 1.3 },
  contacts: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, color: muted },
  contact: { marginRight: 14 },
  link: { color: accent, textDecoration: "none" },
  section: { marginTop: 18 },
  heading: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: accent,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: "#d9d9d9",
  },
  item: { marginBottom: 9 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  title: { fontWeight: 600, fontSize: 11, lineHeight: 1.35 },
  meta: { color: muted },
  text: { marginTop: 2 },
});

async function getProfile(username: string): Promise<ProfileViewData | null> {
  try {
    return await api<ProfileViewData>(`/profiles/${encodeURIComponent(username)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.heading}>{title}</Text>
      {children}
    </View>
  );
}

function Resume({ profile, url }: { profile: ProfileViewData; url: string }) {
  const name = profile.display_name || `@${profile.username}`;
  return (
    <Document title={`${name} — резюме`} author={name} creator="MyHub" language="ru">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{name}</Text>
        {profile.profession && <Text style={s.profession}>{profile.profession}</Text>}
        <View style={s.contacts}>
          {profile.location && <Text style={s.contact}>{profile.location}</Text>}
          {profile.contact_email && (
            <Link src={`mailto:${profile.contact_email}`} style={[s.contact, s.link]}>
              {profile.contact_email}
            </Link>
          )}
          {profile.website && (
            <Link src={profile.website} style={[s.contact, s.link]}>
              {displayUrl(profile.website)}
            </Link>
          )}
          <Link src={url} style={[s.contact, s.link]}>
            {displayUrl(url)}
          </Link>
        </View>

        {profile.bio && (
          <Section title="О себе">
            <Text>{profile.bio}</Text>
          </Section>
        )}

        {profile.experience.length > 0 && (
          <Section title="Опыт работы">
            {profile.experience.map((job) => (
              <View key={job.id} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.title}>{job.position}</Text>
                  <Text style={s.meta}>{experiencePeriod(job)}</Text>
                </View>
                <Text style={s.meta}>{[job.company, job.location].filter(Boolean).join(" · ")}</Text>
                {job.description && <Text style={s.text}>{job.description}</Text>}
              </View>
            ))}
          </Section>
        )}

        {profile.education.length > 0 && (
          <Section title="Образование">
            {profile.education.map((item) => (
              <View key={item.id} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.title}>{item.institution}</Text>
                  <Text style={s.meta}>{educationPeriod(item)}</Text>
                </View>
                {(item.degree || item.field) && (
                  <Text style={s.meta}>{[item.degree, item.field].filter(Boolean).join(", ")}</Text>
                )}
                {item.description && <Text style={s.text}>{item.description}</Text>}
              </View>
            ))}
          </Section>
        )}

        {profile.skills.length > 0 && (
          <Section title="Навыки">
            <Text>{profile.skills.join(" · ")}</Text>
          </Section>
        )}

        {profile.languages.length > 0 && (
          <Section title="Языки">
            <Text>
              {profile.languages.map((l) => `${l.name} — ${l.level === "native" ? "родной" : l.level}`).join(" · ")}
            </Text>
          </Section>
        )}

        {profile.projects.length > 0 && (
          <Section title="Проекты">
            {profile.projects.map((project) => (
              <View key={project.id} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.title}>{project.title}</Text>
                  {project.github_url && (
                    <Link src={project.github_url} style={s.link}>
                      {displayUrl(project.github_url)}
                    </Link>
                  )}
                </View>
                {!!project.technologies?.length && <Text style={s.meta}>{project.technologies.join(" · ")}</Text>}
                {project.description && <Text style={s.text}>{project.description}</Text>}
              </View>
            ))}
          </Section>
        )}
      </Page>
    </Document>
  );
}

export async function GET(_request: Request, { params }: RouteContext<"/u/[username]/resume.pdf">) {
  const profile = await getProfile((await params).username);
  if (!profile) return new Response("Профиль не найден", { status: 404 });

  const url = `${process.env.SITE_URL ?? "http://localhost:3000"}/@${profile.username}`;
  const pdf = await renderToBuffer(<Resume profile={profile} url={url} />);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // RFC 5987 so a Cyrillic file name survives
      "Content-Disposition": `attachment; filename="resume-${profile.username}.pdf"; filename*=UTF-8''${encodeURIComponent(`Резюме ${profile.display_name || profile.username}.pdf`)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
