import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <p className="font-mono text-sm text-foreground/60">myhub.site/@username</p>
      <h1 className="text-5xl font-semibold tracking-tight">
        Персональный сайт, который собирается из твоих данных
      </h1>
      <p className="text-lg text-foreground/70">
        Портфолио, резюме, проекты, навыки и ссылки на одной странице. Загрузи CV или подключи
        GitHub — MyHub соберёт профиль и будет обновлять его сам.
      </p>
      <div className="flex gap-3">
        <Link
          href="/register"
          className="rounded-full bg-foreground px-5 py-2.5 font-medium text-background"
        >
          Создать профиль
        </Link>
        <Link href="/login" className="rounded-full border border-foreground/20 px-5 py-2.5 font-medium">
          Войти
        </Link>
      </div>
    </main>
  );
}
