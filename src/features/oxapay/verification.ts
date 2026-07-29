import { OXAPAY_API_BASE } from "./policy";

type VerificationBody = {
  message?: string;
  error?: { type?: string; message?: string };
};

export async function testOxaPayConnection(
  payoutApiKey: string,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(`${OXAPAY_API_BASE}/payout?size=1&page=1`, {
      method: "GET",
      headers: { payout_api_key: payoutApiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(
        Number(process.env.OXAPAY_CONNECT_TIMEOUT_MS ?? 8_000),
      ),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    )
      throw new Error("OXAPAY_TIMEOUT");
    throw new Error("OXAPAY_UNAVAILABLE");
  }
  if (response.status === 401 || response.status === 403)
    throw new Error("OXAPAY_INVALID_API_KEY");
  if (response.status === 429) throw new Error("OXAPAY_RATE_LIMITED");
  if (response.status >= 500) throw new Error("OXAPAY_UNAVAILABLE");
  const body = (await response.json().catch(() => null)) as VerificationBody | null;
  if (!body) throw new Error("OXAPAY_UNEXPECTED_RESPONSE");
  if (!response.ok || (body.error && Object.keys(body.error).length)) {
    const providerMessage =
      `${body.message ?? ""} ${body.error?.type ?? ""} ${body.error?.message ?? ""}`;
    if (/merchant/i.test(providerMessage))
      throw new Error("OXAPAY_WRONG_API_KEY_TYPE");
    throw new Error("OXAPAY_INVALID_API_KEY");
  }
  return true;
}
