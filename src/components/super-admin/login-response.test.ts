import { describe, expect, it } from "vitest";
import { parseBrowserLoginResponse } from "./login-response";

describe("Super Admin login response parsing", () => {
  it("reads safe JSON errors", async () => {
    const response = Response.json({ error: "Request origin could not be verified." }, { status: 403 });
    expect(await parseBrowserLoginResponse(response)).toEqual({ error: "Request origin could not be verified." });
  });
  it("handles non-JSON and malformed JSON without throwing", async () => {
    expect(await parseBrowserLoginResponse(new Response("Forbidden", { status: 403 }))).toEqual({});
    expect(await parseBrowserLoginResponse(new Response("<html>error</html>", { status: 500, headers: { "content-type": "application/json" } }))).toEqual({});
  });
});
