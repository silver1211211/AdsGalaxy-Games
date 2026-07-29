const loads = new Map<string, Promise<void>>();

export function loadAdsGalaxySdk(miniAppId: string, timeoutMs = 15_000) {
  if (!/^\d+$/.test(miniAppId)) return Promise.reject(new Error("INVALID_CONFIGURATION"));
  const existing = loads.get(miniAppId);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    if (window.showAdsGalaxy) return resolve();
    const script = document.createElement("script");
    script.src = `https://app.adsgalaxy.online/sdk.js/sdk.js?id=${encodeURIComponent(miniAppId)}`;
    script.async = true;
    script.dataset.adsGalaxyMiniAppId = miniAppId;
    const timeout = window.setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs);
    script.onload = () => { window.clearTimeout(timeout); resolve(); };
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error("SDK_UNAVAILABLE")); };
    document.head.appendChild(script);
  });
  loads.set(miniAppId, promise);
  return promise;
}
