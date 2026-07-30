export type ClientApiError = {
  error: string;
  code?: string;
  fieldErrors: Record<string, string>;
};

export async function readClientApiError(
  response: Response,
  fallback: string,
): Promise<ClientApiError> {
  const body = await response.json().catch(() => null) as unknown;
  if (!body || typeof body !== "object")
    return { error: fallback, fieldErrors: {} };
  const value = body as Record<string, unknown>;
  const fields =
    value.fieldErrors && typeof value.fieldErrors === "object"
      ? Object.fromEntries(
          Object.entries(value.fieldErrors as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {};
  return {
    error: typeof value.error === "string" ? value.error : fallback,
    code: typeof value.code === "string" ? value.code : undefined,
    fieldErrors: fields,
  };
}
