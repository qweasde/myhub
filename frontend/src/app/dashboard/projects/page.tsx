"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ImagePlusIcon, PencilIcon, PlusIcon, StarIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDelete } from "@/components/confirm-delete";
import { applyApiErrors } from "@/components/form-errors";
import { SwitchField, TextField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import { DragHandle, SortableList } from "@/components/sortable-list";
import { TagInput } from "@/components/tag-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { api, uploadImage, type Project } from "@/lib/api";
import { useCollection } from "@/lib/queries";
import { optionalUrlField } from "@/lib/url";

const schema = z.object({
  title: z.string().trim().min(1, "Введите название").max(100, "Максимум 100 символов"),
  description: z.string().max(2000, "Максимум 2000 символов"),
  github_url: optionalUrlField,
  demo_url: optionalUrlField,
  technologies: z.array(z.string()).max(15),
  is_featured: z.boolean(),
});
type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;
const FIELDS = Object.keys(schema.shape) as (keyof Values)[];

const toValues = (p?: Project): Values => ({
  title: p?.title ?? "",
  description: p?.description ?? "",
  github_url: p?.github_url ?? "",
  demo_url: p?.demo_url ?? "",
  technologies: p?.technologies ?? [],
  is_featured: p?.is_featured ?? false,
});

export default function ProjectsPage() {
  const projects = useCollection("projects");
  // undefined: closed, null: creating, Project: editing
  const [editing, setEditing] = useState<Project | null | undefined>(undefined);

  return (
    <>
      <PageHeader
        title="Проекты"
        description="Карточки проектов для портфолио. Перетаскивайте, чтобы изменить порядок."
        action={
          <Button onClick={() => setEditing(null)}>
            <PlusIcon /> Добавить
          </Button>
        }
      />
      <div className="max-w-2xl">
        {projects.list.data ? (
          projects.list.data.length ? (
            <SortableList
              items={projects.list.data}
              onReorder={(ids) => projects.reorder.mutate(ids)}
              renderItem={(project) => (
                <ProjectRow
                  project={project}
                  onEdit={() => setEditing(project)}
                  onDelete={() => projects.remove.mutate(project.id)}
                />
              )}
            />
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Добавьте первый проект
            </p>
          )
        ) : (
          <Skeleton className="h-40" />
        )}
      </div>
      {editing !== undefined && (
        <ProjectDialog
          // fresh form state per opened project
          key={editing?.id ?? "new"}
          project={editing ?? undefined}
          onCreated={setEditing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

function ProjectRow({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <DragHandle />
      {project.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- served straight from MinIO/S3
        <img src={project.image} alt="" className="size-14 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ImagePlusIcon className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {project.title}
          {project.is_featured && <StarIcon className="size-3.5 fill-current text-amber-500" aria-label="Избранный" />}
        </p>
        {project.description && <p className="truncate text-xs text-muted-foreground">{project.description}</p>}
        {!!project.technologies?.length && (
          <div className="mt-1 flex flex-wrap gap-1">
            {project.technologies.slice(0, 5).map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon-sm" aria-label="Редактировать" onClick={onEdit}>
        <PencilIcon />
      </Button>
      <ConfirmDelete title={project.title} onConfirm={onDelete} />
    </div>
  );
}

function ProjectDialog({
  project,
  onCreated,
  onClose,
}: {
  project?: Project;
  onCreated: (project: Project) => void;
  onClose: () => void;
}) {
  const { create, update } = useCollection("projects");
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(schema), defaultValues: toValues(project) });

  async function onSubmit(values: Output) {
    try {
      if (project) {
        await update.mutateAsync({ id: project.id, ...values });
        onClose();
      } else {
        // Stay open on the new project so a cover image can be added right away
        onCreated(await create.mutateAsync(values));
        toast.success("Проект добавлен. Можно загрузить обложку.");
      }
    } catch (error) {
      applyApiErrors(error, form.setError, FIELDS);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Редактировать проект" : "Новый проект"}</DialogTitle>
        </DialogHeader>
        {project && <ProjectImage project={project} />}
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <TextField control={form.control} name="title" label="Название" placeholder="MyCar" />
            <TextField
              control={form.control}
              name="description"
              label="Описание"
              multiline
              placeholder="Что делает проект и какую задачу решает"
            />
            <Controller
              control={form.control}
              name="technologies"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="technologies">Технологии</FieldLabel>
                  <TagInput
                    id="technologies"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Django, Vue, PostgreSQL — Enter или запятая"
                  />
                </Field>
              )}
            />
            <TextField control={form.control} name="github_url" label="GitHub" placeholder="github.com/user/repo" />
            <TextField control={form.control} name="demo_url" label="Демо" placeholder="mycar.app" />
            <SwitchField
              control={form.control}
              name="is_featured"
              label="Избранный проект"
              description="Будет выделен на публичной странице"
            />
            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {project ? "Отмена" : "Закрыть"}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {project ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectImage({ project }: { project: Project }) {
  const input = useRef<HTMLInputElement>(null);
  const { list, replace } = useCollection("projects");
  const path = `/me/projects/${project.id}/image`;
  const upload = useMutation({
    mutationFn: (file: File) => uploadImage<Project>(path, file),
    onSuccess: replace,
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: () => api<Project>(path, { method: "DELETE" }),
    onSuccess: replace,
  });
  // The dialog keeps the project it was opened with; the list cache has the current image
  const image = (list.data?.find((p) => p.id === project.id) ?? project).image;

  return (
    <div className="flex items-center gap-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- served straight from MinIO/S3
        <img src={image} alt="Обложка" className="h-20 w-32 rounded-md object-cover" />
      ) : (
        <div className="flex h-20 w-32 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ImagePlusIcon className="size-6" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => input.current?.click()}
        >
          {upload.isPending ? "Загружаем…" : image ? "Заменить обложку" : "Загрузить обложку"}
        </Button>
        {image && (
          <Button type="button" variant="ghost" size="sm" onClick={() => remove.mutate()}>
            Удалить
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload.mutate(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
