"use client";

import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LightbulbIcon,
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { QrDialog } from "@/components/qr-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { change, useAnalytics, type Analytics } from "@/lib/analytics";
import type { Profile } from "@/lib/api";
import { profileDescription, profileTitle, publicUrl } from "@/lib/profile-text";
import { useCollection, useProfile } from "@/lib/queries";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

const number = new Intl.NumberFormat("ru-RU");

export default function OverviewPage() {
  const { data: me } = useMe();
  const { data: profile } = useProfile();
  const { data: week } = useAnalytics(7);

  return (
    <>
      <PageHeader title={`Привет, ${profile?.display_name || me?.username || ""}!`} />
      <div className="flex flex-col gap-6">
        {profile ? <ShareCard profile={profile} /> : <Skeleton className="h-24" />}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-medium">Неделя в цифрах</h2>
            <Link href="/dashboard/analytics" className="text-sm text-muted-foreground hover:text-foreground">
              Вся аналитика →
            </Link>
          </div>
          {week ? <WeekStats data={week} /> : <Skeleton className="h-28" />}
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          {profile ? <LinkPreviewCard profile={profile} /> : <Skeleton className="h-72" />}
          <div className="flex flex-col gap-6">
            <Recommendations />
            {week && <TopLinks data={week} />}
          </div>
        </div>
      </div>
    </>
  );
}

function ShareCard({ profile }: { profile: Profile }) {
  const url = publicUrl(profile.username);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Ссылка скопирована");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">
          {profile.is_published ? "Ваша страница" : "Страница скрыта — включите публикацию в профиле"}
        </p>
        <p className="truncate font-mono text-lg">{url.replace(/^https?:\/\//, "")}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />} Копировать
        </Button>
        <QrDialog url={url} username={profile.username} />
        <Link href={`/@${profile.username}`} target="_blank" className={buttonVariants({ size: "sm" })}>
          <ExternalLinkIcon /> Открыть
        </Link>
      </div>
    </section>
  );
}

function WeekStats({ data }: { data: Analytics }) {
  const tiles = [
    { key: "views", label: "Просмотры" },
    { key: "unique_visitors", label: "Уникальные посетители" },
    { key: "clicks", label: "Клики по ссылкам" },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tiles.map(({ key, label }) => {
        const delta = change(data.totals[key], data.previous[key]);
        return (
          <div key={key} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold tracking-tight">{number.format(data.totals[key])}</p>
              <Sparkline values={data.daily.map((d) => d[key])} label={`${label} за 7 дней`} />
            </div>
            <Delta value={delta} />
          </div>
        );
      })}
    </div>
  );
}

/** Change vs the previous 7 days; icon + sign + words, never color alone. */
function Delta({ value }: { value: number | null }) {
  if (value === null) return <p className="mt-1 text-xs text-muted-foreground">нет данных за прошлую неделю</p>;
  const pct = Math.round(value * 100);
  const Icon = pct > 0 ? TrendingUpIcon : pct < 0 ? TrendingDownIcon : MinusIcon;
  return (
    <p
      className={cn(
        "mt-2 flex items-center gap-1 text-xs whitespace-nowrap",
        pct > 0 ? "text-emerald-700" : pct < 0 ? "text-red-700" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {pct > 0 ? "+" : ""}
      {pct}% к прошлой неделе
    </p>
  );
}

/** Tiny trend line: one series, no axes; the exact numbers live on the analytics page. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 96;
  const h = 32;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${i * step},${h - 2 - (v / max) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="shrink-0">
      <polyline points={points} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

/** How the link unfurls in Telegram / LinkedIn: the generated OG image + title + description. */
function LinkPreviewCard({ profile }: { profile: Profile }) {
  const host = publicUrl(profile.username).replace(/^https?:\/\//, "").split("/")[0];
  return (
    <section>
      <h2 className="mb-3 font-medium">Так ссылка выглядит в мессенджерах</h2>
      <div className="overflow-hidden rounded-xl border bg-muted/40">
        <div className="border-l-4 border-[#2a78d6] p-3">
          <p className="text-xs font-medium text-[#2a78d6]">MyHub</p>
          <p className="mt-0.5 text-sm font-semibold">{profileTitle(profile)}</p>
          <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">{profileDescription(profile)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- same image crawlers get */}
          <img
            src={`/u/${profile.username}/opengraph-image?v=${encodeURIComponent(profileTitle(profile))}`}
            alt="Картинка превью ссылки"
            className="mt-2 aspect-[1200/630] w-full rounded-md border bg-background object-cover"
          />
          <p className="mt-1 text-xs text-muted-foreground">{host}</p>
        </div>
      </div>
    </section>
  );
}

function Recommendations() {
  const { data: me } = useMe();
  const { data: profile } = useProfile();
  const links = useCollection("links").list.data;
  const projects = useCollection("projects").list.data;
  const skills = useCollection("skills").list.data;
  const blocks = useCollection("blocks").list.data;
  if (!me || !profile || !links || !projects || !skills || !blocks) return <Skeleton className="h-40" />;

  const visible = (type: string) => blocks.some((b) => b.type === type && (b.is_visible ?? true));
  const checks = [
    { ok: !!(profile.display_name && profile.profession), tip: "Укажите имя и профессию", href: "/dashboard/profile" },
    { ok: !!profile.avatar, tip: "Загрузите фото — с ним профилю доверяют больше", href: "/dashboard/profile" },
    { ok: !!profile.bio && profile.bio.length >= 60, tip: "Расскажите о себе хотя бы в паре предложений", href: "/dashboard/profile" },
    { ok: links.length > 0, tip: "Добавьте ссылки: GitHub, Telegram, LinkedIn", href: "/dashboard/links" },
    { ok: projects.length > 0, tip: "Добавьте хотя бы один проект", href: "/dashboard/projects" },
    {
      ok: projects.length === 0 || projects.every((p) => p.description),
      tip: `Добавьте описание проектам (${projects.filter((p) => !p.description).length})`,
      href: "/dashboard/projects",
    },
    {
      ok: projects.length === 0 || projects.some((p) => p.image),
      tip: "Загрузите обложки проектов — карточки станут заметнее",
      href: "/dashboard/projects",
    },
    { ok: skills.length >= 3, tip: "Добавьте ещё навыков — хотя бы 3", href: "/dashboard/skills" },
    {
      ok: !!profile.contact_email && visible("contact"),
      tip: "Добавьте блок «Контакты» и email для связи, чтобы вам могли написать",
      href: profile.contact_email ? "/dashboard/builder" : "/dashboard/profile",
    },
    { ok: me.email_verified, tip: "Подтвердите email — ссылка в письме после регистрации", href: "/dashboard" },
  ];
  const done = checks.filter((c) => c.ok).length;
  const todo = checks.filter((c) => !c.ok);
  if (todo.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-medium">Что улучшить</h2>
        <span className="text-sm text-muted-foreground">
          {done} из {checks.length}
        </span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={checks.length} aria-label="Заполненность профиля">
        <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(done / checks.length) * 100}%` }} />
      </div>
      <ul className="flex flex-col divide-y rounded-lg border">
        {todo.slice(0, 4).map((check) => (
          <li key={check.tip}>
            <Link href={check.href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50">
              <LightbulbIcon className="size-4 shrink-0 text-amber-600" aria-hidden />
              {check.tip}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopLinks({ data }: { data: Analytics }) {
  if (data.top_links.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 font-medium">Популярные ссылки за неделю</h2>
      <ol className="flex flex-col divide-y rounded-lg border">
        {data.top_links.slice(0, 3).map((link, i) => (
          <li key={`${link.id}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="truncate">
              <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
              {link.title}
            </span>
            <span className="font-medium tabular-nums">{number.format(link.clicks)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
