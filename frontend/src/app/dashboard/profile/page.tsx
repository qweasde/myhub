"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { applyApiErrors } from "@/components/form-errors";
import { SwitchField, TextField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/lib/api";
import { useAvatar, useProfile, useUpdateProfile } from "@/lib/queries";
import { optionalUrlField } from "@/lib/url";

const schema = z.object({
  display_name: z.string().max(80, "Максимум 80 символов"),
  profession: z.string().max(80, "Максимум 80 символов"),
  bio: z.string().max(1000, "Максимум 1000 символов"),
  location: z.string().max(80, "Максимум 80 символов"),
  website: optionalUrlField,
  contact_email: z.union([z.literal(""), z.email("Введите корректный email")]),
  is_published: z.boolean(),
});
type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;
const FIELDS = Object.keys(schema.shape) as (keyof Values)[];

const toValues = (p: Profile): Values => ({
  display_name: p.display_name ?? "",
  profession: p.profession ?? "",
  bio: p.bio ?? "",
  location: p.location ?? "",
  website: p.website ?? "",
  contact_email: p.contact_email ?? "",
  is_published: p.is_published ?? true,
});

export default function ProfilePage() {
  const { data: profile } = useProfile();

  return (
    <>
      <PageHeader title="Профиль" description="Основная информация на вашей публичной странице" />
      {profile ? (
        <div className="flex max-w-xl flex-col gap-8">
          <AvatarEditor profile={profile} />
          <ProfileForm profile={profile} />
        </div>
      ) : (
        <Skeleton className="h-96 max-w-xl" />
      )}
    </>
  );
}

function AvatarEditor({ profile }: { profile: Profile }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, remove } = useAvatar();
  const busy = upload.isPending || remove.isPending;
  const initial = (profile.display_name || profile.username)[0]?.toUpperCase();

  return (
    <div className="flex items-center gap-4">
      {profile.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- served straight from MinIO/S3
        <img src={profile.avatar} alt="Аватар" className="size-20 rounded-full object-cover" />
      ) : (
        <div className="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
          {initial}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {upload.isPending ? "Загружаем…" : "Загрузить фото"}
          </Button>
          {profile.avatar && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove.mutate()}>
              Удалить
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG или WebP до 5 МБ</p>
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

function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(schema), defaultValues: toValues(profile) });
  const { reset } = form;

  // Keep the form in sync when the profile is refetched (e.g. after an avatar upload)
  useEffect(() => reset(toValues(profile), { keepDirtyValues: true }), [profile, reset]);

  async function onSubmit(values: Output) {
    try {
      const saved = await update.mutateAsync(values);
      reset(toValues(saved));
      toast.success("Профиль сохранён");
    } catch (error) {
      applyApiErrors(error, form.setError, FIELDS);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField control={form.control} name="display_name" label="Имя" placeholder="Ислам Джамилов" />
        <TextField
          control={form.control}
          name="profession"
          label="Профессия"
          placeholder="Python / Django backend developer"
        />
        <TextField
          control={form.control}
          name="bio"
          label="О себе"
          multiline
          placeholder="Пара предложений о том, чем вы занимаетесь"
        />
        <TextField control={form.control} name="location" label="Город" placeholder="Москва" />
        <TextField
          control={form.control}
          name="website"
          label="Сайт"
          type="url"
          placeholder="https://example.com"
        />
        <TextField
          control={form.control}
          name="contact_email"
          label="Email для связи"
          type="email"
          description="Будет виден на публичной странице. Можно не указывать."
        />
        <FieldSeparator />
        <SwitchField
          control={form.control}
          name="is_published"
          label="Профиль опубликован"
          description={`Если выключить, страница myhub.site/@${profile.username} будет недоступна`}
        />
        <FieldError errors={[form.formState.errors.root]} />
        <div>
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
            {form.formState.isSubmitting ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
