import { z } from "zod";

export type SafeApiError = {
  error: string;
  code: string;
  fieldErrors?: Record<string, string>;
};

export function zodApiError(
  error: z.ZodError,
  fallback = "Please check the highlighted fields.",
): SafeApiError {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field])
      fieldErrors[field] = issue.message;
  }
  return {
    error: error.issues[0]?.message || fallback,
    code: "VALIDATION_ERROR",
    ...(Object.keys(fieldErrors).length ? { fieldErrors } : {}),
  };
}

export function safeApiError(
  error: string,
  code: string,
  fieldErrors?: Record<string, string>,
): SafeApiError {
  return { error, code, ...(fieldErrors ? { fieldErrors } : {}) };
}
