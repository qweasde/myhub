import type { components } from "@/lib/api-schema";

export type ThemeName = components["schemas"]["ThemeEnum"];

type Theme = {
  label: string;
  /** Swatch for the picker: background, accent */
  swatch: [string, string];
  /** Extra classes on the page wrapper (colors come from [data-profile-theme] in globals.css) */
  page?: string;
  font?: string;
  link: string;
  iconLink: string;
  card: string;
  chip: string;
  heading: string;
  contact: string;
  avatar: string;
};

export const THEMES: Record<ThemeName, Theme> = {
  minimal: {
    label: "Минимализм",
    swatch: ["#ffffff", "#171717"],
    link: "rounded-lg border hover:bg-muted",
    iconLink: "rounded-full border hover:bg-muted",
    card: "rounded-lg border",
    chip: "rounded-full border",
    heading: "text-lg font-semibold",
    contact: "rounded-xl bg-muted",
    avatar: "rounded-full",
  },
  dark: {
    label: "Тёмная",
    swatch: ["#1b1c22", "#f4f4f5"],
    link: "rounded-lg border bg-card hover:bg-muted",
    iconLink: "rounded-full border bg-card hover:bg-muted",
    card: "rounded-lg border bg-card",
    chip: "rounded-full border bg-card",
    heading: "text-lg font-semibold",
    contact: "rounded-xl border bg-card",
    avatar: "rounded-full ring-2 ring-border",
  },
  developer: {
    label: "Разработчик",
    swatch: ["#1a2233", "#4ade80"],
    font: "font-mono",
    link: "rounded-md border border-dashed hover:border-solid hover:border-profile-accent hover:text-profile-accent",
    iconLink: "rounded-md border border-dashed hover:border-profile-accent hover:text-profile-accent",
    card: "rounded-md border bg-card",
    chip: "rounded-md border bg-card text-profile-accent before:content-['#']",
    heading: "text-base font-semibold text-profile-accent before:content-['//_']",
    contact: "rounded-md border border-dashed",
    avatar: "rounded-md",
  },
  portfolio: {
    label: "Портфолио",
    swatch: ["#faf6f0", "#b4552d"],
    link: "rounded-xl bg-card shadow-sm ring-1 ring-border hover:shadow-md",
    iconLink: "rounded-full bg-card shadow-sm ring-1 ring-border hover:shadow-md",
    card: "rounded-xl bg-card shadow-sm ring-1 ring-border",
    chip: "rounded-full bg-card ring-1 ring-border",
    heading: "text-xs font-semibold tracking-[0.2em] text-profile-accent uppercase",
    contact: "rounded-2xl bg-card shadow-sm ring-1 ring-border",
    avatar: "rounded-full ring-4 ring-card shadow-md",
  },
  creative: {
    label: "Креатив",
    swatch: ["#9333ea", "#fb923c"],
    page: "bg-linear-to-br from-violet-600 via-fuchsia-500 to-orange-400",
    link: "rounded-full bg-card text-card-foreground shadow-lg hover:scale-[1.02]",
    iconLink: "rounded-full bg-card text-card-foreground shadow-lg hover:scale-105",
    card: "rounded-3xl bg-card text-card-foreground shadow-xl [&_.text-muted-foreground]:text-card-foreground/70",
    chip: "rounded-full bg-muted backdrop-blur",
    heading: "text-2xl font-bold",
    contact: "rounded-3xl bg-muted backdrop-blur",
    avatar: "rounded-full ring-4 ring-white/70 shadow-xl",
  },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
