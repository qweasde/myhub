"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { useRefreshMe } from "@/lib/session";

export function VerifyEmail({ verificationKey }: { verificationKey: string }) {
  const refreshMe = useRefreshMe();
  const { mutate, status, error } = useMutation({
    mutationFn: () => auth.verifyEmail(verificationKey),
    onSuccess: () => refreshMe(),
  });

  // The key is single-use: guard against Strict Mode running the effect twice
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  const title = {
    idle: "Подтверждаем email…",
    pending: "Подтверждаем email…",
    success: "Email подтверждён",
    error: "Ссылка недействительна",
  }[status];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {status === "error" && (
          <CardDescription>{error.message}. Возможно, ссылка устарела или уже использована.</CardDescription>
        )}
      </CardHeader>
      {(status === "success" || status === "error") && (
        <CardFooter>
          <Link href="/dashboard" className={buttonVariants({ className: "w-full" })}>
            Перейти в кабинет
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
