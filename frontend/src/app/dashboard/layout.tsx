"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { useMe, useRefreshMe } from "@/lib/session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isPending, isError } = useMe();
  const refreshMe = useRefreshMe();

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
  if (isPending || !me) {
    return <p className="m-auto text-muted-foreground">Загрузка…</p>;
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            MyHub
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href={`/@${me.username}`} className="font-mono text-muted-foreground hover:text-foreground">
              @{me.username}
            </Link>
            <Button variant="outline" size="sm" onClick={logout}>
              Выйти
            </Button>
          </div>
        </div>
      </header>
      {!me.email_verified && (
        <div className="border-b bg-muted px-6 py-2 text-center text-sm">
          Подтвердите email: ссылка отправлена на <span className="font-medium">{me.email}</span>
        </div>
      )}
      {children}
    </div>
  );
}
