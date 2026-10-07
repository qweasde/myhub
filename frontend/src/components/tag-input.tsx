"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  max?: number;
};

/** Tags typed into an input: Enter or comma adds, Backspace on empty input removes the last one. */
export function TagInput({ id, value, onChange, placeholder, max = 15 }: Props) {
  const [draft, setDraft] = useState("");

  function commit(text = draft) {
    const tag = text.replace(/,+$/, "").trim();
    if (tag && value.length < max && !value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-xs">
              {tag}
              <button
                type="button"
                aria-label={`Удалить ${tag}`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="rounded-full p-0.5 hover:bg-background"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={draft}
        maxLength={30}
        placeholder={value.length >= max ? `Не больше ${max}` : placeholder}
        disabled={value.length >= max}
        onChange={(e) => (e.target.value.endsWith(",") ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit()}
      />
    </div>
  );
}
