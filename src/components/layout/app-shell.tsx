import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1180px] px-4 pb-32 pt-5 sm:px-7 sm:pt-8 lg:px-10">
      {children}
      <BottomNav />
    </div>
  );
}
