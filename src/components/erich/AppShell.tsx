import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, title, subtitle, right }: { children: ReactNode; title?: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border px-4 pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto h-14 flex items-center justify-between">
          <div>
            {title && <h1 className="text-lg font-semibold leading-tight">{title}</h1>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {right}
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
