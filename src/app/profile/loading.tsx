import { AppShell } from "@/components/layout/app-shell";
export default function Loading() {
  return <AppShell><div className="mx-auto max-w-3xl animate-pulse space-y-4" aria-label="Loading profile">
    <div className="h-52 rounded-4xl bg-white" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1,2,3,4].map(x=><div key={x} className="h-24 rounded-3xl bg-white" />)}</div><div className="h-72 rounded-4xl bg-white" />
  </div></AppShell>;
}
