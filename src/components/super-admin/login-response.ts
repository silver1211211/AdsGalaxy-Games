export type BrowserLoginResponseBody = {
  error?: string;
  destination?: string;
};

export async function parseBrowserLoginResponse(response: Response): Promise<BrowserLoginResponseBody> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return {};
  try {
    const value = await response.json();
    return value && typeof value === "object" ? value as BrowserLoginResponseBody : {};
  } catch {
    return {};
  }
}
