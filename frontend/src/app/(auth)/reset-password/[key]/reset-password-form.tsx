"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { applyAuthErrors } from "@/components/auth/form-errors";
import { TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { auth } from "@/lib/auth";

const schema = z
  .object({
    password: z.string().min(8, "Минимум 8 символов"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Пароли не совпадают" });
type Values = z.infer<typeof schema>;

export function ResetPasswordForm({ resetKey }: { resetKey: string }) {
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  async function onSubmit({ password }: Values) {
    try {
      await auth.resetPassword(resetKey, password);
      toast.success("Пароль изменён. Войдите с новым паролем.");
      router.replace("/login");
    } catch (error) {
      // An invalid/expired key comes back as an error on the `key` param -> form-level message
      applyAuthErrors(error, form.setError, ["password"]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новый пароль</CardTitle>
        <CardDescription>Придумайте новый пароль для входа</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <FieldGroup>
            <TextField
              control={form.control}
              name="password"
              label="Новый пароль"
              type="password"
              autoComplete="new-password"
            />
            <TextField
              control={form.control}
              name="confirm"
              label="Повторите пароль"
              type="password"
              autoComplete="new-password"
            />
            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Сохранить пароль
          </Button>
          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
            Запросить новую ссылку
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
