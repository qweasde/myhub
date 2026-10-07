"use client";

import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { useCollection, useProfile } from "@/lib/queries";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data: profile } = useProfile();
  const links = useCollection("links").list.data;
  const projects = useCollection("projects").list.data;
  const skills = useCollection("skills").list.data;

  const steps = [
    { done: !!(profile?.display_name && profile.profession), label: "Указать имя и профессию", href: "/dashboard/profile" },
    { done: !!profile?.avatar, label: "Загрузить фото", href: "/dashboard/profile" },
    { done: !!links?.length, label: "Добавить ссылки", href: "/dashboard/links" },
    { done: !!projects?.length, label: "Добавить проект", href: "/dashboard/projects" },
    { done: !!skills?.length, label: "Добавить навыки", href: "/dashboard/skills" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <PageHeader
        title={`Привет, ${profile?.display_name || me?.username}!`}
        description={`Профиль заполнен на ${doneCount} из ${steps.length}`}
        action={
          <Link href={`/@${me?.username}`} target="_blank" className={buttonVariants({ variant: "outline" })}>
            Открыть страницу
          </Link>
        }
      />
      <ul className="flex max-w-xl flex-col divide-y rounded-lg border">
        {steps.map((step) => (
          <li key={step.label}>
            <Link href={step.href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50">
              {step.done ? (
                <CheckCircle2Icon className="size-5 text-emerald-600" />
              ) : (
                <CircleIcon className="size-5 text-muted-foreground" />
              )}
              <span className={cn(step.done && "text-muted-foreground line-through")}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
