export function tenantLaunchDecision(input: {
  providerPhase:
    | "UNRESOLVED"
    | "BROWSER"
    | "TELEGRAM_AUTHENTICATING"
    | "TELEGRAM_AUTHENTICATED"
    | "TELEGRAM_FAILED"
    | "TENANT_MISMATCH";
  botConfigured: boolean;
}) {
  if (input.providerPhase === "UNRESOLVED") return "UNRESOLVED";
  if (input.providerPhase === "TELEGRAM_AUTHENTICATING")
    return "AUTHENTICATING";
  if (input.providerPhase === "TELEGRAM_AUTHENTICATED")
    return "AUTHENTICATED";
  if (input.providerPhase === "TELEGRAM_FAILED") return "FAILED";
  if (input.providerPhase === "TENANT_MISMATCH") return "MISMATCH";
  return input.botConfigured
    ? "BROWSER_CONFIGURED"
    : "BROWSER_UNCONFIGURED";
}
