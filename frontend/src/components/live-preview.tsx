"use client";

import { EyeIcon } from "lucide-react";
import { useMemo } from "react";
import { ProfileView, type ProfileViewData } from "@/components/profile-view";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnyBlock } from "@/lib/blocks";
import { useCollection, useProfile } from "@/lib/queries";

/** What /@username shows, assembled from the dashboard's own (already cached) queries. */
function usePreviewData(): ProfileViewData | undefined {
  const { data: profile } = useProfile();
  const blocks = useCollection("blocks").list.data;
  const links = useCollection("links").list.data;
  const projects = useCollection("projects").list.data;
  const skills = useCollection("skills").list.data;

  return useMemo(() => {
    if (!profile || !blocks || !links || !projects || !skills) return undefined;
    return {
      username: profile.username,
      display_name: profile.display_name,
      profession: profile.profession,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      contact_email: profile.contact_email,
      avatar: profile.avatar,
      theme: profile.theme,
      blocks: blocks.filter((b) => b.is_visible ?? true) as unknown as AnyBlock[],
      links: links.filter((l) => l.is_visible ?? true).map(({ id, title, url, icon }) => ({ id, title, url, icon })),
      projects,
      skills: skills.map((s) => s.name),
    };
  }, [profile, blocks, links, projects, skills]);
}

function PreviewBody() {
  const preview = usePreviewData();
  return preview ? <ProfileView profile={preview} preview /> : <Skeleton className="m-6 h-96" />;
}

/** Right-hand column on wide screens: the public page as it looks after the last save. */
export function LivePreviewPanel() {
  return (
    <aside className="hidden w-[400px] shrink-0 xl:block 2xl:w-[460px]" aria-label="Превью страницы">
      <div className="sticky top-6">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Превью</p>
        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border shadow-sm">
          <PreviewBody />
        </div>
      </div>
    </aside>
  );
}

/** Narrow screens: no room for a column, so the preview opens in a dialog. */
export function LivePreviewButton() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg xl:hidden" />}
      >
        <EyeIcon /> Превью
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Превью страницы</DialogTitle>
        <PreviewBody />
      </DialogContent>
    </Dialog>
  );
}
