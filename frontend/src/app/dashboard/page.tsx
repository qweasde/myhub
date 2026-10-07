"use client";

import { useMe } from "@/lib/session";

export default function DashboardPage() {
  const { data: me } = useMe();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Привет, {me?.username}!</h1>
      <p className="mt-2 text-muted-foreground">Здесь будет конструктор профиля.</p>
    </main>
  );
}
