import type { components } from "@/lib/api-schema";

export type BlockType = components["schemas"]["BlockTypeEnum"];

// Mirrors the per-type config serializers in backend/apps/profiles/serializers.py
export type BlockConfigs = {
  profile: Record<string, never>;
  links: { layout: "list" | "icons" };
  text: { title: string; body: string };
  projects: { title: string; featured_only: boolean };
  skills: { title: string };
  contact: { title: string; text: string };
  experience: { title: string };
  education: { title: string };
  languages: { title: string };
};

export type AnyBlock = { [T in BlockType]: { id: number; type: T; config: BlockConfigs[T] } }[BlockType];

type Field =
  | { key: string; label: string; kind: "text" | "textarea"; placeholder?: string; max: number }
  | { key: string; label: string; kind: "switch"; description?: string }
  | { key: string; label: string; kind: "choice"; options: { value: string; label: string }[] };

type BlockMeta = {
  label: string;
  description: string;
  /** Title shown on the page when config.title is empty */
  defaultTitle?: string;
  repeatable?: boolean;
  deletable?: boolean;
  /** Where the block's data is edited */
  dataHref?: string;
  fields: Field[];
};

const titleField = (placeholder: string): Field => ({
  key: "title",
  label: "Заголовок",
  kind: "text",
  placeholder,
  max: 60,
});

// Resume sections: data lives on /dashboard/resume, the block only sets the title
function resumeBlock(label: string, description: string): BlockMeta {
  return { label, description, defaultTitle: label, dataHref: "/dashboard/resume", fields: [titleField(label)] };
}

export const BLOCKS: Record<BlockType, BlockMeta> = {
  profile: {
    label: "Шапка профиля",
    description: "Фото, имя, профессия и описание",
    deletable: false,
    dataHref: "/dashboard/profile",
    fields: [],
  },
  links: {
    label: "Ссылки",
    description: "Кнопки со ссылками на соцсети и сайты",
    dataHref: "/dashboard/links",
    fields: [
      {
        key: "layout",
        label: "Вид",
        kind: "choice",
        options: [
          { value: "list", label: "Кнопки" },
          { value: "icons", label: "Иконки в ряд" },
        ],
      },
    ],
  },
  text: {
    label: "Текст",
    description: "Свободный текст: о себе, услуги, цели",
    repeatable: true,
    fields: [
      titleField("Например, «Чем я занимаюсь»"),
      { key: "body", label: "Текст", kind: "textarea", placeholder: "Пара абзацев текста", max: 5000 },
    ],
  },
  projects: {
    label: "Проекты",
    description: "Карточки проектов",
    defaultTitle: "Проекты",
    dataHref: "/dashboard/projects",
    fields: [
      titleField("Проекты"),
      { key: "featured_only", label: "Только избранные", kind: "switch", description: "Показывать проекты со звёздочкой" },
    ],
  },
  skills: {
    label: "Навыки",
    description: "Теги с технологиями",
    defaultTitle: "Навыки",
    dataHref: "/dashboard/skills",
    fields: [titleField("Навыки")],
  },
  contact: {
    label: "Контакты",
    description: "Призыв связаться и кнопка «Написать»",
    defaultTitle: "Связаться со мной",
    dataHref: "/dashboard/profile",
    fields: [
      titleField("Связаться со мной"),
      {
        key: "text",
        label: "Текст",
        kind: "textarea",
        placeholder: "Открыт к предложениям о работе и интересным проектам",
        max: 500,
      },
    ],
  },
  experience: resumeBlock("Опыт работы", "Места работы и должности"),
  education: resumeBlock("Образование", "Вузы и курсы"),
  languages: resumeBlock("Языки", "Языки и уровень владения"),
};

export const BLOCK_TYPES = Object.keys(BLOCKS) as BlockType[];

export function blockTitle(block: AnyBlock): string {
  const config = block.config as { title?: string };
  return config.title || BLOCKS[block.type].defaultTitle || BLOCKS[block.type].label;
}
