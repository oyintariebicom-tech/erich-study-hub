import { AppShell } from "./AppShell";
import { Sparkles } from "lucide-react";

export function ComingSoon({ title, subtitle, blurb }: { title: string; subtitle: string; blurb: string }) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <div className="erich-card p-8 text-center mt-12">
        <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Sparkles size={28}/>
        </div>
        <h2 className="text-xl font-semibold font-display">Coming soon</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">{blurb}</p>
      </div>
    </AppShell>
  );
}
