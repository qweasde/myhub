"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DragHandle, SortableList } from "@/components/sortable-list";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useCollection } from "@/lib/queries";

export default function SkillsPage() {
  const skills = useCollection("skills");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    try {
      await skills.create.mutateAsync({ name: value });
      setName("");
      setError(undefined);
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldErrors.name ?? e.message) : "Сервер недоступен");
    }
  }

  return (
    <>
      <PageHeader
        title="Навыки"
        description="Технологии и инструменты, с которыми вы работаете. Порядок меняется перетаскиванием."
      />
      <div className="flex max-w-2xl flex-col gap-6">
        <form onSubmit={add} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Django"
              maxLength={40}
              aria-label="Новый навык"
              aria-invalid={!!error}
            />
            <Button type="submit" disabled={skills.create.isPending || !name.trim()}>
              <PlusIcon /> Добавить
            </Button>
          </div>
          {error && <FieldError>{error}</FieldError>}
        </form>
        {skills.list.data ? (
          skills.list.data.length ? (
            <SortableList
              layout="grid"
              items={skills.list.data}
              onReorder={(ids) => skills.reorder.mutate(ids)}
              renderItem={(skill) => (
                <div className="flex items-center gap-1.5 rounded-full border bg-card py-1 pr-1 pl-2 text-sm">
                  <DragHandle className="[&_svg]:size-3.5" />
                  {skill.name}
                  <button
                    type="button"
                    aria-label={`Удалить ${skill.name}`}
                    onClick={() => skills.remove.mutate(skill.id)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              )}
            />
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Добавьте первый навык
            </p>
          )
        ) : (
          <Skeleton className="h-24" />
        )}
      </div>
    </>
  );
}
