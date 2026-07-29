"use client";
import { useCallback, useRef, useState } from "react";
import { showAdsGalaxy } from "@/lib/ads/adsgalaxy-provider";
import type { AdOutcome } from "@/lib/ads/types";

export function useRewardedAd(miniAppId: string | null) {
  const busyRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const show = useCallback(async (): Promise<AdOutcome> => {
    if (!miniAppId) return { status: "SDK_UNAVAILABLE", message: "Ads are not configured." };
    if (busyRef.current) return { status: "SDK_ERROR", message: "An ad request is already active." };
    busyRef.current = true; setLoading(true);
    try { return await showAdsGalaxy(miniAppId); }
    finally { busyRef.current = false; setLoading(false); }
  }, [miniAppId]);
  return { show, loading };
}
