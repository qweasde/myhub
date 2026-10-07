"use client";

import {
  ExternalLinkIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  LinkIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { LivePreviewButton, LivePreviewPanel } from "@/components/live-preview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { useMe, useRefreshMe } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboardIcon },
  { href: "/dashboard/builder", label: "Конструктор", icon: LayoutTemplateIcon },
  { href: "/dashboard/profile", label: "Профиль", icon: UserIcon },
  { href: "/dashboard/links", label: "Ссылки", icon: LinkIcon },
  { href: "/dashboard/projects", label: "Проекты", icon: FolderKanbanIcon },
  { href: "/dashboard/skills", label: "Навыки", icon: SparklesIcon },
];

// Pages that change what /@username shows get the live preview next to them
const PREVIEW_PAGES = new Set([
  "/dashboard/builder",
  "/dashboard/profile",
  "/dashboard/links",
  "/dashboard/projects",
  "/dashboard/skills",
]);

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isError } = useMe();
  const refreshMe = useRefreshMe();
  const showPreview = PREVIEW_PAGES.has(pathname);

  useEffect(() => {
    if (me === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me, pathname, router]);

  async function logout() {
    await auth.logout();
    await refreshMe();
    toast.success("Вы вышли из аккаунта");
    router.replace("/login");
  }

  if (isError) {
    return <p className="m-auto text-muted-foreground">Сервер недоступен. Обновите страницу позже.</p>;
  }
  // The shell and the page render right away (instant navigation); only the header waits for /me.
  // A missing session is caught by proxy.ts, an expired one by the redirect above.

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div
          className={cn(
            "mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6",
            showPreview ? "max-w-[1440px]" : "max-w-6xl",
          )}
        >
          <Link href="/dashboard" className="font-semibold tracking-tight">
            MyHub
          </Link>
          {me ? (
            <div className="flex items-center gap-3 text-sm">
              <Link
                href={`/@${me.username}`}
                target="_blank"
                className="flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground"
              >
                @{me.username}
                <ExternalLinkIcon className="size-3.5" />
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>
                Выйти
              </Button>
            </div>
          ) : (
            <Skeleton className="h-8 w-40" />
          )}
        </div>
      </header>
      {me && !me.email_verified && (
        <div className="border-b bg-muted px-4 py-2 text-center text-sm">
          Подтвердите email: ссылка отправлена на <span className="font-medium">{me.email}</span>
        </div>
      )}
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-10 md:py-10",
          showPreview ? "max-w-[1440px]" : "max-w-6xl",
        )}
      >
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:w-48 md:shrink-0 md:flex-col md:px-0">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                pathname === href && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
        {showPreview && (
          <>
            <LivePreviewPanel />
            <LivePreviewButton />
          </>
        )}
      </div>
    </div>
  );
}
