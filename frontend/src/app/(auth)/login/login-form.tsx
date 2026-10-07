"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyAuthErrors } from "@/components/auth/form-errors";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { auth } from "@/lib/auth";
import { useRefreshMe } from "@/lib/session";

const schema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});
type Values = z.infer<typeof schema>;

// Only allow same-site relative redirects
function safeNext(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const refreshMe = useRefreshMe();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  async function onSubmit({ email, password }: Values) {
    try {
      await auth.login(email, password);
      await refreshMe();
      router.replace(next);
    } catch (error) {
      applyAuthErrors(error, form.setError, ["email", "password"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>Войдите, чтобы редактировать свой профиль</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <FieldGroup>
            <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
            <TextField
              control={form.control}
              name="password"
              label="Пароль"
              type="password"
              autoComplete="current-password"
            />
            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Входим…" : "Войти"}
          </Button>
          <div className="flex w-full justify-between text-sm text-muted-foreground">
            <Link href="/forgot-password" className="hover:text-foreground">
              Забыли пароль?
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Регистрация
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
