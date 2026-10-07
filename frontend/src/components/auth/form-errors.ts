import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { AuthError } from "@/lib/auth";

// Maps allauth `errors[].param` onto form fields; everything else becomes a form-level error.
export function applyAuthErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  if (!(error instanceof AuthError)) {
    setError("root", { message: "Сервер недоступен. Попробуйте позже." });
    return;
  }
  for (const { param, message } of error.errors) {
    if (param && (fields as readonly string[]).includes(param)) {
      setError(param as Path<T>, { message });
    } else {
      setError("root", { message });
    }
  }
}
