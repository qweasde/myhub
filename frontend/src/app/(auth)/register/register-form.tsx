"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { applyAuthErrors } from "@/components/auth/form-errors";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { auth } from "@/lib/auth";
import { useRefreshMe } from "@/lib/session";

const schema = z.object({
  email: z.email("Введите корректный email"),
  username: z
    .string()
    .min(3, "Минимум 3 символа")
    .max(32, "Максимум 32 символа")
    .regex(/^[a-zA-Z0-9_]+$/, "Только латинские буквы, цифры и _"),
  password: z.string().min(8, "Минимум 8 символов"),
});
type Values = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const refreshMe = useRefreshMe();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", username: "", password: "" },
  });
  const username = useWatch({ control: form.control, name: "username" }).toLowerCase() || "username";

  async function onSubmit({ email, username, password }: Values) {
    try {
      await auth.signup(email, username, password);
      await refreshMe();
      toast.success("Аккаунт создан. Мы отправили письмо для подтверждения email.");
      router.replace("/dashboard");
    } catch (error) {
      applyAuthErrors(error, form.setError, ["email", "username", "password"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Создать профиль</CardTitle>
        <CardDescription>Займите свой адрес на MyHub</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <FieldGroup>
            <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
            <div className="flex flex-col gap-2">
              <TextField control={form.control} name="username" label="Username" autoComplete="username" />
              <FieldDescription className="font-mono">myhub.site/@{username}</FieldDescription>
            </div>
            <TextField
              control={form.control}
              name="password"
              label="Пароль"
              type="password"
              autoComplete="new-password"
            />
            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Создаём…" : "Зарегистрироваться"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-foreground hover:underline">
              Войти
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
