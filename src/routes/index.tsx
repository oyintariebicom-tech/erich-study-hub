import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/erich-logo.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ERICH — Study Smart. Practice Better. Pass UNMC." },
      { name: "description", content: "Nursing & midwifery study companion for Ugandan UNMC students. Coursework, PDF notes, OSPE practice, mock exams." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) {
    return (
      <main className="min-h-screen erich-hero flex items-center justify-center">
        <img src={logo} alt="ERICH" width={120} height={120} className="animate-pulse" />
      </main>
    );
  }

  return (
    <main className="min-h-screen erich-hero flex flex-col items-center justify-between px-6 py-12 text-primary-foreground">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <img src={logo} alt="ERICH logo" width={140} height={140} className="drop-shadow-2xl" />
        <div>
          <h1 className="text-5xl font-bold tracking-tight">ERICH</h1>
          <p className="mt-3 text-base/relaxed opacity-90 max-w-xs mx-auto">
            Study Smart. Practice Better. <span className="font-semibold">Pass UNMC.</span>
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs opacity-90 mt-4 max-w-sm">
          <Feature label="Coursework & PDFs" />
          <Feature label="OSPE drills" />
          <Feature label="Mock UNMC exams" />
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Button asChild size="lg" variant="secondary" className="w-full h-12 text-base font-semibold">
          <Link to="/auth" search={{ mode: "login" }}>Login</Link>
        </Button>
        <Button asChild size="lg" className="w-full h-12 text-base font-semibold bg-white text-primary hover:bg-white/90">
          <Link to="/auth" search={{ mode: "signup" }}>Create account</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10">
          <Link to="/app">Continue as guest</Link>
        </Button>
      </div>
    </main>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur px-2 py-3 text-center border border-white/15">
      {label}
    </div>
  );
}
