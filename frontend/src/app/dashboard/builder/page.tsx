"use client";

import {
  FolderKanbanIcon,
  LinkIcon,
  MailIcon,
  PlusIcon,
  Settings2Icon,
  SparklesIcon,
  TypeIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import NextLink from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";
import { DragHandle, SortableList } from "@/components/sortable-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "@/lib/api";
import { type AnyBlock, BLOCK_TYPES, BLOCKS, type BlockType, blockTitle } from "@/lib/blocks";
import { useCollection, useProfile, useUpdateProfile } from "@/lib/queries";
import { THEME_NAMES, THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";

const ICONS: Record<BlockType, LucideIcon> = {
  profile: UserIcon,
  links: LinkIcon,
  text: TypeIcon,
  projects: FolderKanbanIcon,
  skills: SparklesIcon,
  contact: MailIcon,
};

export default function BuilderPage() {
  const blocks = useCollection("blocks");

  return (
    <>
      <PageHeader
        title="Конструктор"
        description="Страница собирается из блоков. Перетаскивайте их, скрывайте и настраивайте — превью справа обновляется сразу."
        action={<AddBlockDialog blocks={blocks.list.data ?? []} />}
      />
      <div className="flex max-w-2xl flex-col gap-6">
        <ThemePicker />
        {blocks.list.data ? (
          <SortableList
            items={blocks.list.data}
            onReorder={(ids) => blocks.reorder.mutate(ids)}
            renderItem={(block) => <BlockRow block={block} />}
          />
        ) : (
          <Skeleton className="h-64" />
        )}
      </div>
    </>
  );
}

function ThemePicker() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const current = update.isPending ? update.variables.theme : profile?.theme;

  return (
    <div>
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Тема</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Тема страницы">
        {THEME_NAMES.map((name) => {
          const [background, accent] = THEMES[name].swatch;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={current === name}
              disabled={!profile}
              onClick={() =>
                update.mutate({ theme: name }, { onError: () => toast.error("Не удалось сменить тему") })
              }
              className={cn(
                "flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm transition-colors hover:bg-muted",
                current === name && "border-foreground ring-1 ring-foreground",
              )}
            >
              <span
                className="size-5 rounded-full border"
                style={{ background: `linear-gradient(135deg, ${background} 50%, ${accent} 50%)` }}
              />
              {THEMES[name].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BlockRow({ block }: { block: Block }) {
  const { update, remove } = useCollection("blocks");
  const meta = BLOCKS[block.type];
  const Icon = ICONS[block.type];
  const title = blockTitle(block as unknown as AnyBlock);
  const visible = block.is_visible ?? true;

  return (
    <div className={cn("flex items-center gap-3 rounded-lg border bg-card px-3 py-3", !visible && "opacity-60")}>
      <DragHandle />
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{title === meta.label ? meta.description : meta.label}</p>
      </div>
      <Switch
        checked={visible}
        onCheckedChange={(is_visible) => update.mutate({ id: block.id, is_visible })}
        aria-label={visible ? "Скрыть блок" : "Показать блок"}
      />
      <BlockSettingsDialog block={block} />
      {meta.deletable !== false && <ConfirmDelete title={title} onConfirm={() => remove.mutate(block.id)} />}
    </div>
  );
}

function BlockSettingsDialog({ block }: { block: Block }) {
  const meta = BLOCKS[block.type];
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(block.config);
  const { update } = useCollection("blocks");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await update.mutateAsync({ id: block.id, config });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setConfig(block.config); // start from the saved config every time
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Настроить" />}>
        <Settings2Icon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.label}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-4">
          <FieldGroup>
            {meta.fields.map((field) => {
              const value = config[field.key];
              const set = (v: unknown) => setConfig((c) => ({ ...c, [field.key]: v }));
              const id = `block-${block.id}-${field.key}`;
              if (field.kind === "switch") {
                return (
                  <Field key={field.key} orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
                      {field.description && <FieldDescription>{field.description}</FieldDescription>}
                    </FieldContent>
                    <Switch id={id} checked={!!value} onCheckedChange={set} />
                  </Field>
                );
              }
              if (field.kind === "choice") {
                const selected = value ?? field.options[0].value; // older blocks may lack the key
                return (
                  <Field key={field.key}>
                    <FieldLabel>{field.label}</FieldLabel>
                    <div className="flex gap-2">
                      {field.options.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={selected === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => set(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </Field>
                );
              }
              const Control = field.kind === "textarea" ? Textarea : Input;
              return (
                <Field key={field.key}>
                  <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
                  <Control
                    id={id}
                    value={String(value ?? "")}
                    maxLength={field.max}
                    placeholder={field.placeholder}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(e.target.value)}
                    {...(field.kind === "textarea" ? { rows: 6 } : {})}
                  />
                </Field>
              );
            })}
            {meta.dataHref && (
              <p className="text-sm text-muted-foreground">
                Содержимое блока редактируется в разделе{" "}
                <NextLink href={meta.dataHref} className="text-foreground underline underline-offset-2">
                  {meta.dataHref === "/dashboard/profile" ? "«Профиль»" : `«${meta.label}»`}
                </NextLink>
                .
              </p>
            )}
          </FieldGroup>
          {meta.fields.length > 0 && (
            <DialogFooter>
              <Button type="submit" disabled={update.isPending}>
                Сохранить
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddBlockDialog({ blocks }: { blocks: Block[] }) {
  const [open, setOpen] = useState(false);
  const { create } = useCollection("blocks");
  const present = new Set(blocks.map((b) => b.type));

  async function add(type: BlockType) {
    try {
      await create.mutateAsync({ type });
      setOpen(false);
      toast.success(`Блок «${BLOCKS[type].label}» добавлен в конец страницы`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось добавить блок");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon /> Добавить блок
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить блок</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {BLOCK_TYPES.map((type) => {
            const meta = BLOCKS[type];
            const Icon = ICONS[type];
            const taken = !meta.repeatable && present.has(type);
            return (
              <button
                key={type}
                type="button"
                disabled={taken || create.isPending}
                onClick={() => add(type)}
                className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{taken ? "Уже есть на странице" : meta.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
