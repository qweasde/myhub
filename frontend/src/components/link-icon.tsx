import { BriefcaseBusinessIcon, GlobeIcon, MailIcon } from "lucide-react";
import {
  siBehance,
  siDribbble,
  siGithub,
  siInstagram,
  siTelegram,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";
import type { LinkIcon as LinkIconName } from "@/lib/api";
import { cn } from "@/lib/utils";

const BRANDS: Partial<Record<LinkIconName, SimpleIcon>> = {
  github: siGithub,
  telegram: siTelegram,
  instagram: siInstagram,
  youtube: siYoutube,
  behance: siBehance,
  dribbble: siDribbble,
  x: siX,
};

// simple-icons dropped LinkedIn at LinkedIn's request, so it gets a generic icon
const GENERIC = {
  linkedin: BriefcaseBusinessIcon,
  email: MailIcon,
  website: GlobeIcon,
};

export const LINK_ICON_LABELS: Record<LinkIconName, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  telegram: "Telegram",
  instagram: "Instagram",
  youtube: "YouTube",
  behance: "Behance",
  dribbble: "Dribbble",
  x: "X (Twitter)",
  email: "Email",
  website: "Сайт",
};

export function LinkIcon({ icon, className }: { icon: LinkIconName; className?: string }) {
  const brand = BRANDS[icon];
  if (brand) {
    return (
      <svg role="img" aria-label={brand.title} viewBox="0 0 24 24" className={cn("size-4 fill-current", className)}>
        <path d={brand.path} />
      </svg>
    );
  }
  const Icon = GENERIC[icon as keyof typeof GENERIC] ?? GlobeIcon;
  return <Icon aria-label={LINK_ICON_LABELS[icon]} className={cn("size-4", className)} />;
}
