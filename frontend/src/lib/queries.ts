"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, json, uploadImage, type Link, type Profile, type Project, type Skill } from "@/lib/api";

export const keys = {
  profile: ["me", "profile"] as const,
  collection: (name: CollectionName) => ["me", name] as const,
};

function toastError(error: Error) {
  toast.error(error.message || "Не удалось сохранить");
}

// --- Profile -------------------------------------------------------------

export function useProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: () => api<Profile>("/me/profile") });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Profile>) => api<Profile>("/me/profile", json("PATCH", data)),
    onSuccess: (profile) => queryClient.setQueryData(keys.profile, profile),
  });
}

export function useAvatar() {
  const queryClient = useQueryClient();
  const onSuccess = (profile: Profile) => queryClient.setQueryData(keys.profile, profile);
  return {
    upload: useMutation({
      mutationFn: (file: File) => uploadImage<Profile>("/me/profile/avatar", file),
      onSuccess,
      onError: toastError,
    }),
    remove: useMutation({
      mutationFn: () => api<Profile>("/me/profile/avatar", { method: "DELETE" }),
      onSuccess,
      onError: toastError,
    }),
  };
}

// --- Ordered collections: links, projects, skills ------------------------

type Collections = { links: Link; projects: Project; skills: Skill };
export type CollectionName = keyof Collections;

export function useCollection<N extends CollectionName>(name: N) {
  type Item = Collections[N];
  const queryClient = useQueryClient();
  const key = keys.collection(name);
  const base = `/me/${name}`;

  const setItems = (update: (items: Item[]) => Item[]) =>
    queryClient.setQueryData<Item[]>(key, (items) => update(items ?? []));
  const replace = (item: Item) => setItems((items) => items.map((i) => (i.id === item.id ? item : i)));

  const list = useQuery({ queryKey: key, queryFn: () => api<Item[]>(base) });

  const create = useMutation({
    mutationFn: (data: Partial<Item>) => api<Item>(base, json("POST", data)),
    onSuccess: (item) => setItems((items) => [...items, item]),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: Partial<Item> & { id: number }) =>
      api<Item>(`${base}/${id}`, json("PATCH", data)),
    onSuccess: replace,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api<null>(`${base}/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => setItems((items) => items.filter((i) => i.id !== id)),
    onError: toastError,
  });

  // Optimistic: the list is reordered immediately, rolled back if the server refuses
  const reorder = useMutation({
    mutationFn: (ids: number[]) => api<null>(`${base}/reorder`, json("POST", { ids })),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Item[]>(key);
      setItems((items) => ids.map((id) => items.find((i) => i.id === id)!).filter(Boolean));
      return { previous };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(key, context?.previous);
      toastError(error);
    },
  });

  return { list, create, update, remove, reorder, replace };
}
