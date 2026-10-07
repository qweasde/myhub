import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getPublicProfile } from "@/lib/public-profile";

// Link preview for Telegram, LinkedIn, Slack, etc.
export const alt = "Профиль на MyHub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse can't read woff2, so the woff files from @fontsource/inter are used.
// Each subset needs its own family name (with one shared name it silently falls back to
// a built-in font); FONT_FAMILY lists both so Cyrillic glyphs come from the second one.
const fontDir = join(process.cwd(), "node_modules/@fontsource/inter/files");
const SUBSETS = { latin: "Inter", cyrillic: "InterCyrillic" } as const;
const FONT_FAMILY = Object.values(SUBSETS).join(", ");
const fonts = Promise.all(
  Object.entries(SUBSETS).flatMap(([subset, name]) =>
    ([400, 700] as const).map(async (weight) => ({
      name,
      data: await readFile(join(fontDir, `inter-${subset}-${weight}-normal.woff`)),
      weight,
      style: "normal" as const,
    })),
  ),
);

// Avatars are stored as WebP, which ImageResponse can't decode: convert to PNG with sharp.
// Any failure (storage down, odd file) falls back to the initial letter.
async function avatarPng(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const absolute = url.startsWith("/") ? `${process.env.BACKEND_URL ?? "http://localhost:8000"}${url}` : url;
    const res = await fetch(absolute, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer())).resize(280, 280).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const profile = await getPublicProfile((await params).username);
  const name = profile.display_name || `@${profile.username}`;
  const initial = (profile.display_name || profile.username)[0]?.toUpperCase();
  const avatar = await avatarPng(profile.avatar);
  const host = new URL(process.env.SITE_URL ?? "http://localhost:3000").host;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #fafafa 0%, #ececec 100%)",
          color: "#171717",
          fontFamily: FONT_FAMILY,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>
            <img src={avatar} width={140} height={140} alt="" style={{ borderRadius: 999 }} />
          ) : (
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 999,
                background: "#171717",
                color: "#fafafa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
                fontWeight: 700,
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 820 }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
            {profile.profession && <div style={{ fontSize: 34, color: "#525252" }}>{profile.profession}</div>}
          </div>
        </div>
        {profile.skills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {profile.skills.slice(0, 8).map((skill) => (
              <div
                key={skill}
                style={{ padding: "8px 20px", borderRadius: 999, border: "2px solid #d4d4d4", fontSize: 26 }}
              >
                {skill}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#737373" }}>
          {/* One text node: a div with several children would need display: flex */}
          <div>{`${host}/@${profile.username}`}</div>
          <div style={{ fontWeight: 700, color: "#171717" }}>MyHub</div>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts },
  );
}
