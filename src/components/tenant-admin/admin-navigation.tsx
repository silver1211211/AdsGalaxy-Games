"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  Gamepad2,
  Settings,
  Users,
} from "lucide-react";
import { adminSectionActive } from "@/features/tenant-admin/refinement-policy";
const sections = [
  ["Dashboard", "", BarChart3],
  ["Users", "/users", Users],
  ["Games", "/games", Gamepad2],
  ["Tasks", "/tasks", ClipboardList],
  ["Wallet", "/wallet", CircleDollarSign],
  ["Settings", "/settings", Settings],
] as const;
export function AdminNavigation({
  tenantSlug,
  mobile = false,
}: {
  tenantSlug: string;
  mobile?: boolean;
}) {
  const pathname = usePathname(),
    base = `/${tenantSlug}/admin`,
    items = mobile ? sections.slice(0, 5) : sections;
  return (
    <nav
      aria-label={mobile ? "Admin mobile navigation" : "Admin sections"}
      className={
        mobile
          ? "safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-warm-100 bg-white/95 px-2 pt-2 backdrop-blur lg:hidden"
          : "mt-8 grid gap-1"
      }
    >
      {items.map(([label, suffix, Icon]) => {
        const active = adminSectionActive(pathname, base, suffix);
        return (
          <Link
            key={label}
            href={`${base}${suffix}`}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? `grid min-h-14 place-items-center rounded-xl text-[9px] font-extrabold ${active ? "bg-teal-50 text-teal-800" : "text-warm-500"}`
                : `flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-extrabold ${active ? "bg-teal-50 text-teal-800" : "text-warm-600 hover:bg-warm-50 hover:text-ink"}`
            }
          >
            <Icon size={mobile ? 19 : 18} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
