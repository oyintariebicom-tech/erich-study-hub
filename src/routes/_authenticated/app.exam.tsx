import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Zap, GraduationCap, TrendingDown, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/erich/AppShell";
import { useCurrentUser } from "@/hooks/useRole";

export const Route = createFileRoute("/_authenticated/app/exam")({
  component: ExamDashboard,
});

function ExamDashboard() {
  const { data: user } = useCurrentUser();

  const { data: trivia } = useQuery({
    queryKey: ["quizzes", "trivia"],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("quiz_type", "trivia").limit(1);
      return data?.[0];
    },
  });

  const { data: mocks } = useQuery({
    queryKey: ["quizzes", "mock"],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("quiz_type", "mock");
      return data ?? [];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id, score, total, finished_at, quizzes(title)")
        .eq("user_id", user!.id)
        .order("finished_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <AppShell title="Exam Simulator" subtitle="UNMC mock exams & trivia">
      <Card
        to={trivia ? "/app/quiz/$quizId" : "/app/exam"}
        params={trivia ? { quizId: trivia.id } : undefined}
        icon={<Zap size={20}/>}
        accent="bg-warning/15 text-warning"
        title="Daily Trivia Challenge"
        desc={trivia ? "5 quick questions • +20 XP" : "No trivia available yet — check back later"}
        disabled={!trivia}
      />
      <div className="h-3" />
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">Full Mock Board Exams</h2>
      {(mocks ?? []).length === 0 && <p className="text-sm text-muted-foreground">No mock exams yet. The admin will add these soon.</p>}
      {(mocks ?? []).map((m) => (
        <div key={m.id} className="mb-2">
          <Card
            to="/app/quiz/$quizId"
            params={{ quizId: m.id }}
            icon={<GraduationCap size={20}/>}
            accent="bg-primary/10 text-primary"
            title={m.title}
            desc={`${m.difficulty} • ${Math.round(m.timer_seconds/60)} min`}
          />
        </div>
      ))}

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2">Recent attempts</h2>
      <ul className="space-y-2">
        {(attempts ?? []).length === 0 && <p className="text-sm text-muted-foreground">No attempts yet.</p>}
        {(attempts ?? []).map((a) => (
          <li key={a.id} className="erich-card p-3 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center"><Clock size={16}/></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{(a as any).quizzes?.title ?? "Quiz"}</div>
              <div className="text-xs text-muted-foreground">{new Date(a.finished_at).toLocaleDateString()}</div>
            </div>
            <div className="text-sm font-mono font-semibold">{a.score}/{a.total}</div>
          </li>
        ))}
      </ul>

      <div className="mt-6 p-4 rounded-2xl bg-muted/50 text-sm text-muted-foreground flex items-start gap-3">
        <TrendingDown className="text-warning mt-0.5" size={18}/>
        <span>Weakest-topic review unlocks after you complete a few quizzes.</span>
      </div>
    </AppShell>
  );
}

function Card({ to, params, icon, accent, title, desc, disabled }: { to: any; params?: any; icon: React.ReactNode; accent: string; title: string; desc: string; disabled?: boolean }) {
  const content = (
    <div className={`erich-card p-4 flex items-center gap-3 ${disabled ? "opacity-50" : ""}`}>
      <div className={`size-11 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight size={18} className="text-muted-foreground"/>
    </div>
  );
  if (disabled) return content;
  return <Link to={to} params={params}>{content}</Link>;
}
