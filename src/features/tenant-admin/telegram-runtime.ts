export type TelegramRuntimeSnapshot = {
  sdkDetected: boolean;
  webAppDetected: boolean;
  signedInitDataPresent: boolean;
  initDataLength: number;
  startParamPresent: boolean;
  initData: string;
};

export type TelegramRuntimeDiagnostics = Omit<
  TelegramRuntimeSnapshot,
  "initData"
> & {
  routeTenantSlug: string;
  providerPhase:
    | "UNRESOLVED"
    | "BROWSER"
    | "TELEGRAM_AUTHENTICATING"
    | "TELEGRAM_AUTHENTICATED"
    | "TELEGRAM_FAILED"
    | "TENANT_MISMATCH"
    | "LOCAL_DEVELOPMENT_AUTHENTICATED"
    | "LOCAL_DEVELOPMENT_REQUIRED";
  authenticationAttempted: boolean;
  authenticatedTenantSlug: string | null;
  authenticationErrorCode: string | null;
};

export const TELEGRAM_DETECTION_WINDOW_MS = 2_000;
export const TELEGRAM_DETECTION_INTERVAL_MS = 50;

export function emptyTelegramRuntimeSnapshot(): TelegramRuntimeSnapshot {
  return {
    sdkDetected: false,
    webAppDetected: false,
    signedInitDataPresent: false,
    initDataLength: 0,
    startParamPresent: false,
    initData: "",
  };
}

export async function detectTelegramRuntime(input: {
  inspect(): TelegramRuntimeSnapshot;
  wait(milliseconds: number): Promise<void>;
  windowMs?: number;
  intervalMs?: number;
  onSnapshot?(snapshot: TelegramRuntimeSnapshot): void;
}) {
  const windowMs = input.windowMs ?? TELEGRAM_DETECTION_WINDOW_MS;
  const intervalMs = input.intervalMs ?? TELEGRAM_DETECTION_INTERVAL_MS;
  const attempts = Math.max(1, Math.ceil(windowMs / intervalMs));
  let snapshot = input.inspect();
  input.onSnapshot?.(snapshot);
  if (snapshot.signedInitDataPresent) return snapshot;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await input.wait(intervalMs);
    snapshot = input.inspect();
    input.onSnapshot?.(snapshot);
    if (snapshot.signedInitDataPresent) return snapshot;
  }
  return snapshot;
}
