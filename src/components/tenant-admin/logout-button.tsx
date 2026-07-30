"use client";
import { LogOut } from "lucide-react";

export function TenantAdminLogoutButton({ tenantSlug }: { tenantSlug: string }) {
  async function logout() {
    const response = await fetch(`/api/${encodeURIComponent(tenantSlug)}/admin/browser-logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await response.json().catch(() => null) as { redirect?: string } | null;
    location.assign(response.ok && body?.redirect ? body.redirect : `/${tenantSlug}/admin/login`);
  }
  return <button type="button" onClick={() => void logout()} className="game-icon-button" aria-label="Administrator logout"><LogOut size={17} /></button>;
}
