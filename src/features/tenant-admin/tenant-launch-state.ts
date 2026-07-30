export function tenantLaunchDecision(input: {
  ready: boolean;
  signedInitDataPresent: boolean;
  authenticationStatus:
    | "DETECTING"
    | "BROWSER"
    | "AUTHENTICATING"
    | "AUTHENTICATED"
    | "FAILED";
  authenticated: boolean;
  currentTenantSlug: string | null;
  tenantSlug: string;
  botConfigured: boolean;
}) {
  if (!input.ready || input.authenticationStatus === "DETECTING")
    return input.signedInitDataPresent ? "AUTHENTICATING" : "DETECTING";
  if (input.signedInitDataPresent) {
    if (
      input.authenticationStatus === "AUTHENTICATED" &&
      input.authenticated &&
      input.currentTenantSlug === input.tenantSlug
    )
      return "AUTHENTICATED";
    if (input.authenticationStatus === "AUTHENTICATING")
      return "AUTHENTICATING";
    return "FAILED";
  }
  return input.botConfigured
    ? "BROWSER_CONFIGURED"
    : "BROWSER_UNCONFIGURED";
}
