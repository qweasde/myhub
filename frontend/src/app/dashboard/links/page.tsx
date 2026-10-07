"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDelete } from "@/components/confirm-delete";
import { applyApiErrors } from "@/components/form-errors";
import { TextField } from "@/components/form-fields";
import { LINK_ICON_LABELS, LinkIcon } from "@/components/link-icon";
import { PageHeader } from "@/components/page-header";
import { DragHandle, SortableList } from "@/components/sortable-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { Link, LinkIcon as LinkIconName } from "@/lib/api";
import { useCollection } from "@/lib/queries";
import { displayUrl, urlField } from "@/lib/url";

const schema = z.object({
  title: z.string().trim().min(1, "Введите название").max(80, "Максимум 80 символов"),
  url: urlField,
});
type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

export default function LinksPage() {
  const links = useCollection("links");

  return (
    <>
      <PageHeader title="Ссылки" description="GitHub, Telegram, LinkedIn и любые другие ссылки. Перетаскивайте, чтобы изменить порядок." />
      <div className="flex max-w-2xl flex-col gap-6">
        <AddLinkForm />
        {links.list.data ? (
          links.list.data.length ? (
            <SortableList
              items={links.list.data}
              onReorder={(ids) => links.reorder.mutate(ids)}
              renderItem={(link) => <LinkRow link={link} />}
            />
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Пока нет ни одной ссылки
            </p>
          )
        ) : (
          <Skeleton className="h-40" />
        )}
      </div>
    </>
  );
}

function AddLinkForm() {
  const { create } = useCollection("links");
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(schema), defaultValues: { title: "", url: "" } });

  async function onSubmit(values: Output) {
    try {
      await create.mutateAsync(values);
      form.reset();
    } catch (error) {
      applyApiErrors(error, form.setError, ["title", "url"]);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-start">
        <TextField control={form.control} name="title" label="Название" placeholder="GitHub" />
        <TextField control={form.control} name="url" label="Ссылка" placeholder="github.com/username" />
        <Button type="submit" className="sm:mt-6.5" disabled={form.formState.isSubmitting}>
          <PlusIcon /> Добавить
        </Button>
      </div>
      <FieldError className="mt-2" errors={[form.formState.errors.root]} />
    </form>
  );
}

function LinkRow({ link }: { link: Link }) {
  const { update, remove } = useCollection("links");

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <DragHandle />
      <LinkIcon icon={link.icon ?? "website"} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{link.title}</p>
        <a href={link.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-muted-foreground hover:underline">
          {displayUrl(link.url)}
        </a>
      </div>
      <Switch
        checked={link.is_visible ?? true}
        onCheckedChange={(is_visible) => update.mutate({ id: link.id, is_visible })}
        aria-label={link.is_visible ? "Скрыть ссылку" : "Показать ссылку"}
      />
      <EditLinkDialog link={link} />
      <ConfirmDelete title={link.title} onConfirm={() => remove.mutate(link.id)} />
    </div>
  );
}

const editSchema = schema.extend({ icon: z.enum(Object.keys(LINK_ICON_LABELS) as [LinkIconName, ...LinkIconName[]]) });
type EditValues = z.input<typeof editSchema>;
type EditOutput = z.output<typeof editSchema>;

function EditLinkDialog({ link }: { link: Link }) {
  const [open, setOpen] = useState(false);
  const { update } = useCollection("links");
  const form = useForm<EditValues, unknown, EditOutput>({
    resolver: zodResolver(editSchema),
    values: { title: link.title, url: link.url, icon: link.icon ?? "website" },
  });

  async function onSubmit(values: EditOutput) {
    try {
      await update.mutateAsync({ id: link.id, ...values });
      setOpen(false);
    } catch (error) {
      applyApiErrors(error, form.setError, ["title", "url", "icon"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Редактировать" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать ссылку</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <TextField control={form.control} name="title" label="Название" />
            <TextField control={form.control} name="url" label="Ссылка" />
            <Controller
              control={form.control}
              name="icon"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="icon">Иконка</FieldLabel>
                  <select
                    {...field}
                    id="icon"
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {Object.entries(LINK_ICON_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            />
            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
