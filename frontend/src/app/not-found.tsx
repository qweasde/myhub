import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="m-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Такой страницы нет</h1>
      <p className="max-w-sm text-muted-foreground">
        Возможно, профиль скрыт владельцем или адрес набран с ошибкой. А ещё этот адрес может стать вашим.
      </p>
      <div className="flex gap-3">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          На главную
        </Link>
        <Link href="/register" className={buttonVariants()}>
          Создать профиль
        </Link>
      </div>
    </main>
  );
}
