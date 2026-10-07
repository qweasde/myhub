"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyAuthErrors } from "@/components/auth/form-errors";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { auth } from "@/lib/auth";

const schema = z.object({ email: z.email("Введите корректный email") });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit({ email }: Values) {
    try {
      await auth.requestPasswordReset(email);
      setSentTo(email);
    } catch (error) {
      applyAuthErrors(error, form.setError, ["email"]);
    }
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Проверьте почту</CardTitle>
          <CardDescription>
            Если аккаунт с адресом {sentTo} существует, мы отправили на него ссылку для сброса пароля.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-sm hover:underline">
            Вернуться ко входу
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сброс пароля</CardTitle>
        <CardDescription>Пришлём ссылку для создания нового пароля</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <FieldGroup>
            <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Отправить ссылку
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Вспомнили пароль? Войти
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
