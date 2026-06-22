import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Clock, Check, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/erich/AppShell";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useRole";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/quiz/$quizId")({
  component: QuizRunner,
});

type Q = { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string; answer: string; rationale: string | null };

function QuizRunner() {
  const { quizId } = useParams({ from: "/_authenticated/app/quiz/$quizId" });
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const { data: quiz } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle();
      return data;
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["questions", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("*").eq("quiz_id", quizId).order("order_index");
      return (data ?? []) as Q[];
    },
  });

  const shuffled = useMemo(() => questions ? [...questions].sort(() => Math.random() - 0.5) : [], [questions]);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!quiz) return;
    setTimeLeft(quiz.timer_seconds);
  }, [quiz]);

  useEffect(() => {
    if (done || timeLeft <= 0 || !quiz) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [done, timeLeft, quiz]);

  useEffect(() => {
    if (timeLeft === 0 && quiz && !done) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  if (!quiz) return <AppShell title="Loading…"><p className="text-sm text-muted-foreground">Loading quiz…</p></AppShell>;
  if (!questions || questions.length === 0) return <AppShell title={quiz.title}><p className="text-sm text-muted-foreground">No questions yet. The admin will add them soon.</p></AppShell>;

  const q = shuffled[idx];
  const opts = [
    { k: "A", t: q.option_a },
    { k: "B", t: q.option_b },
    { k: "C", t: q.option_c },
    { k: "D", t: q.option_d },
  ];

  function pick(k: string) {
    if (revealed) return;
    setPicked(k);
    setRevealed(true);
    if (k === q.answer) setScore((s) => s + 1);
  }

  async function next() {
    if (idx + 1 < shuffled.length) {
      setIdx(idx + 1);
      setPicked(null);
      setRevealed(false);
    } else {
      finish();
    }
  }

  async function finish() {
    setDone(true);
    if (user) {
      await supabase.from("quiz_attempts").insert({
        user_id: user.id, quiz_id: quizId, score, total: shuffled.length,
      });
    } else {
      toast.info("Sign in to save your score and earn XP.");
    }
  }

  if (done) {
    const pct = Math.round((score / shuffled.length) * 100);
    return (
      <AppShell title="Results">
        <div className="erich-card p-6 text-center">
          <div className="text-5xl font-bold font-display text-primary">{pct}%</div>
          <p className="mt-2 text-muted-foreground">{score} of {shuffled.length} correct</p>
          <div className="mt-6 flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate({ to: "/app/exam" })}>Back to exams</Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <AppShell title={quiz.title} subtitle={`Question ${idx + 1} of ${shuffled.length}`} right={
      <div className="flex items-center gap-1.5 text-sm font-timer font-semibold text-primary"><Clock size={14}/> {mm}:{ss}</div>
    }>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div className="h-full bg-primary transition-all" style={{ width: `${((idx + 1) / shuffled.length) * 100}%` }} />
      </div>

      <h2 className="text-lg font-semibold mb-4 leading-snug">{q.question}</h2>

      <div className="space-y-2">
        {opts.map((o) => {
          const isCorrect = revealed && o.k === q.answer;
          const isWrong = revealed && picked === o.k && o.k !== q.answer;
          return (
            <button
              key={o.k}
              disabled={revealed}
              onClick={() => pick(o.k)}
              className={[
                "w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition",
                isCorrect ? "border-success bg-success/10" :
                isWrong ? "border-destructive bg-destructive/10" :
                picked === o.k ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
              ].join(" ")}
            >
              <span className="size-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold shrink-0">{o.k}</span>
              <span className="flex-1 text-sm">{o.t}</span>
              {isCorrect && <Check size={18} className="text-success"/>}
              {isWrong && <X size={18} className="text-destructive"/>}
            </button>
          );
        })}
      </div>

      {revealed && q.rationale && (
        <div className="mt-4 p-3 rounded-xl bg-accent/40 border border-accent text-sm">
          <div className="font-semibold text-accent-foreground mb-1">Rationale</div>
          <p className="text-muted-foreground">{q.rationale}</p>
        </div>
      )}

      <div className="mt-6">
        <Button onClick={next} disabled={!revealed} className="w-full h-12 text-base font-semibold">
          {idx + 1 === shuffled.length ? "Finish" : (<>Next <ArrowRight className="ml-1.5" size={18}/></>)}
        </Button>
      </div>
    </AppShell>
  );
}
