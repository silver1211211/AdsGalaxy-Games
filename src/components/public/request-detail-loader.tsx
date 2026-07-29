"use client";

import { useEffect, useState } from "react";
import { RequestDetail } from "./request-detail";
import { PlatformPopup } from "@/components/system/platform-popup";

export function RequestDetailLoader({ publicReference }: { publicReference: string }) {
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const access = new URLSearchParams(location.search).get("access");
    const url = `/api/mini-app-requests/${encodeURIComponent(publicReference)}${access ? `?access=${encodeURIComponent(access)}` : ""}`;
    void fetch(url, { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Request access failed.");
      setItem(body);
      if (access) history.replaceState(null, "", `/request-mini-app/status/${publicReference}`);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Request access failed."));
  }, [publicReference]);
  if (error) return <PlatformPopup title="Request access failed" message={error} primary={{ label: "Request Status", href: "/request-mini-app/status" }} secondary={{ label: "Return Home", href: "/" }} />;
  if (!item) return <p className="rounded-3xl bg-white p-6 shadow-card">Loading protected request…</p>;
  return <RequestDetail item={item} />;
}
