"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: string;
  autoComplete?: string;
};

export function TextField<T extends FieldValues>({ control, name, label, type = "text", autoComplete }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            {...field}
            id={name}
            type={type}
            autoComplete={autoComplete}
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
