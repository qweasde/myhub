"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DownloadIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ConfirmDelete } from "@/components/confirm-delete";
import { applyApiErrors } from "@/components/form-errors";
import { TextField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import { DragHandle, SortableList } from "@/components/sortable-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError, type Education, type Experience, type LanguageLevel } from "@/lib/api";
import { type CollectionName, useCollection } from "@/lib/queries";
import { educationPeriod, experiencePeriod, LEVEL_LABELS } from "@/lib/resume";
import { useMe } from "@/lib/session";

export default function ResumePage() {
  const { data: me } = useMe();
  return (
    <>
      <PageHeader
        title="Резюме"
        description="Опыт, образование и языки. На странице показываются блоками, а целиком скачиваются в PDF."
        action={
          me && (
            <a href={`/u/${me.username}/resume.pdf`} className={buttonVariants({ variant: "outline" })}>
              <DownloadIcon /> Скачать PDF
            </a>
          )
        }
      />
      <div className="flex max-w-2xl flex-col gap-10">
        <ExperienceSection />
        <EducationSection />
        <LanguagesSection />
      </div>
    </>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function Row({
  title,
  subtitle,
  meta,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <DragHandle />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      {onEdit && (
        <Button variant="ghost" size="icon-sm" aria-label="Редактировать" onClick={onEdit}>
          <PencilIcon />
        </Button>
      )}
      <ConfirmDelete title={title} onConfirm={onDelete} />
    </div>
  );
}

/** Sortable list + create/edit dialog for one resume collection. */
function useEditor<T extends { id: number }>(name: CollectionName) {
  const collection = useCollection(name);
  const [editing, setEditing] = useState<T | null | undefined>(undefined); // undefined: closed, null: new
  return { collection, editing, setEditing, items: collection.list.data as T[] | undefined };
}

// --- Experience ------------------------------------------------------------

const month = z.string().regex(/^\d{4}-\d{2}$/, "Укажите месяц и год");
const experienceSchema = z
  .object({
    position: z.string().trim().min(1, "Укажите должность").max(100),
    company: z.string().trim().min(1, "Укажите компанию").max(100),
    location: z.string().max(80),
    start: month,
    current: z.boolean(),
    end: z.string(),
    description: z.string().max(2000),
  })
  .refine((v) => v.current || /^\d{4}-\d{2}$/.test(v.end), { path: ["end"], message: "Укажите месяц и год" })
  .refine((v) => v.current || v.end >= v.start, { path: ["end"], message: "Раньше даты начала" });
type ExperienceValues = z.infer<typeof experienceSchema>;

function ExperienceSection() {
  const { collection, editing, setEditing, items } = useEditor<Experience>("experience");
  return (
    <Section
      title="Опыт работы"
      action={
        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
          <PlusIcon /> Добавить
        </Button>
      }
    >
      {!items ? (
        <Skeleton className="h-24" />
      ) : items.length ? (
        <SortableList
          items={items}
          onReorder={(ids) => collection.reorder.mutate(ids)}
          renderItem={(job) => (
            <Row
              title={job.position}
              subtitle={[job.company, job.location].filter(Boolean).join(" · ")}
              meta={experiencePeriod(job)}
              onEdit={() => setEditing(job)}
              onDelete={() => collection.remove.mutate(job.id)}
            />
          )}
        />
      ) : (
        <Empty>Добавьте место работы — начните с текущего</Empty>
      )}
      {editing !== undefined && (
        <ExperienceDialog key={editing?.id ?? "new"} job={editing ?? undefined} onClose={() => setEditing(undefined)} />
      )}
    </Section>
  );
}

function ExperienceDialog({ job, onClose }: { job?: Experience; onClose: () => void }) {
  const { create, update } = useCollection("experience");
  const form = useForm<ExperienceValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      position: job?.position ?? "",
      company: job?.company ?? "",
      location: job?.location ?? "",
      start: job?.start_date.slice(0, 7) ?? "",
      current: job ? !job.end_date : true,
      end: job?.end_date?.slice(0, 7) ?? "",
      description: job?.description ?? "",
    },
  });
  const current = useWatch({ control: form.control, name: "current" });

  async function onSubmit(v: ExperienceValues) {
    const data = {
      position: v.position,
      company: v.company,
      location: v.location,
      start_date: `${v.start}-01`,
      end_date: v.current ? null : `${v.end}-01`,
      description: v.description,
    };
    try {
      await (job ? update.mutateAsync({ id: job.id, ...data }) : create.mutateAsync(data));
      onClose();
    } catch (error) {
      applyApiErrors(error, form.setError, ["position", "company", "location", "description"]);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{job ? "Место работы" : "Новое место работы"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <TextField control={form.control} name="position" label="Должность" placeholder="Backend developer" />
            <TextField control={form.control} name="company" label="Компания" placeholder="ООО «Ромашка»" />
            <TextField control={form.control} name="location" label="Город или формат" placeholder="Москва, удалённо" />
            <div className="grid grid-cols-2 gap-4">
              <TextField control={form.control} name="start" label="Начало" type="month" />
              {!current && <TextField control={form.control} name="end" label="Окончание" type="month" />}
            </div>
            <Controller
              control={form.control}
              name="current"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="current">Работаю сейчас</FieldLabel>
                  <Switch id="current" checked={field.value} onCheckedChange={field.onChange} />
                </Field>
              )}
            />
            <TextField
              control={form.control}
              name="description"
              label="Чем занимались"
              multiline
              placeholder="Задачи и результаты: что сделали, что улучшили, с какими технологиями"
            />
            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Education ---------------------------------------------------------------

const year = z.union([z.literal(""), z.string().regex(/^(19[5-9]\d|20\d\d)$/, "Год, например 2020")]);
const educationSchema = z
  .object({
    institution: z.string().trim().min(1, "Укажите учебное заведение").max(150),
    degree: z.string().max(100),
    field: z.string().max(100),
    start_year: year,
    end_year: year,
    description: z.string().max(1000),
  })
  .refine((v) => !v.start_year || !v.end_year || v.end_year >= v.start_year, {
    path: ["end_year"],
    message: "Раньше года начала",
  });
type EducationValues = z.infer<typeof educationSchema>;

function EducationSection() {
  const { collection, editing, setEditing, items } = useEditor<Education>("education");
  return (
    <Section
      title="Образование"
      action={
        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
          <PlusIcon /> Добавить
        </Button>
      }
    >
      {!items ? (
        <Skeleton className="h-24" />
      ) : items.length ? (
        <SortableList
          items={items}
          onReorder={(ids) => collection.reorder.mutate(ids)}
          renderItem={(item) => (
            <Row
              title={item.institution}
              subtitle={[item.degree, item.field].filter(Boolean).join(", ")}
              meta={educationPeriod(item)}
              onEdit={() => setEditing(item)}
              onDelete={() => collection.remove.mutate(item.id)}
            />
          )}
        />
      ) : (
        <Empty>Вуз, колледж или курсы</Empty>
      )}
      {editing !== undefined && (
        <EducationDialog key={editing?.id ?? "new"} item={editing ?? undefined} onClose={() => setEditing(undefined)} />
      )}
    </Section>
  );
}

function EducationDialog({ item, onClose }: { item?: Education; onClose: () => void }) {
  const { create, update } = useCollection("education");
  const form = useForm<EducationValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution: item?.institution ?? "",
      degree: item?.degree ?? "",
      field: item?.field ?? "",
      start_year: item?.start_year ? String(item.start_year) : "",
      end_year: item?.end_year ? String(item.end_year) : "",
      description: item?.description ?? "",
    },
  });

  async function onSubmit(v: EducationValues) {
    const data = {
      ...v,
      start_year: v.start_year ? Number(v.start_year) : null,
      end_year: v.end_year ? Number(v.end_year) : null,
    };
    try {
      await (item ? update.mutateAsync({ id: item.id, ...data }) : create.mutateAsync(data));
      onClose();
    } catch (error) {
      applyApiErrors(error, form.setError, ["institution", "degree", "field", "start_year", "end_year", "description"]);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Образование" : "Новое образование"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <TextField control={form.control} name="institution" label="Учебное заведение" placeholder="МГТУ им. Баумана" />
            <div className="grid grid-cols-2 gap-4">
              <TextField control={form.control} name="degree" label="Степень" placeholder="Бакалавр" />
              <TextField control={form.control} name="field" label="Специальность" placeholder="Информатика" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField control={form.control} name="start_year" label="Год начала" placeholder="2016" />
              <TextField control={form.control} name="end_year" label="Год окончания" placeholder="2020" />
            </div>
            <TextField control={form.control} name="description" label="Комментарий" multiline />
            <FieldError errors={[form.formState.errors.root]} />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Languages ---------------------------------------------------------------

function LanguagesSection() {
  const languages = useCollection("languages");
  const [name, setName] = useState("");
  const [level, setLevel] = useState<LanguageLevel>("B2");
  const [error, setError] = useState<string>();

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await languages.create.mutateAsync({ name: name.trim(), level });
      setName("");
      setError(undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Сервер недоступен");
    }
  }

  return (
    <Section title="Языки">
      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, English"
          maxLength={40}
          aria-label="Язык"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as LanguageLevel)}
          aria-label="Уровень"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={languages.create.isPending || !name.trim()}>
          <PlusIcon /> Добавить
        </Button>
      </form>
      {error && <FieldError>{error}</FieldError>}
      {languages.list.data?.length ? (
        <SortableList
          items={languages.list.data}
          onReorder={(ids) => languages.reorder.mutate(ids)}
          renderItem={(lang) => (
            <Row
              title={lang.name}
              subtitle={LEVEL_LABELS[lang.level]}
              onDelete={() => languages.remove.mutate(lang.id)}
            />
          )}
        />
      ) : null}
    </Section>
  );
}
