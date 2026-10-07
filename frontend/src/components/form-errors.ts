import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api";

// Maps DRF `{field: [message]}` errors onto form fields; anything else becomes a form-level error.
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  if (!(error instanceof ApiError)) {
    setError("root", { message: "Сервер недоступен. Попробуйте позже." });
    return;
  }
  const fieldErrors = Object.entries(error.fieldErrors);
  if (fieldErrors.length === 0) {
    setError("root", { message: error.message });
  }
  for (const [field, message] of fieldErrors) {
    setError((fields as readonly string[]).includes(field) ? (field as Path<T>) : "root", { message });
  }
}
