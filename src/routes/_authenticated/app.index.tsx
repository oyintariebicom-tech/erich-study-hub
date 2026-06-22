import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, BookOpen, ChevronRight, LogOut, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/erich/AppShell";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useRole";

export const Route = createFileRoute("/_authenticated/app/")({
  component: SyllabusPage,
});

function SyllabusPage() {
  const [year, setYear] = useState(1);
  const [q, setQ] = useState("");
  const { data: user } = useCurrentUser();

  const { data: courses } = useQuery({
    queryKey: ["courses", year],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("year", year).order("semester").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("course_progress").select("course_id, percent").eq("user_id", user!.id);
      return Object.fromEntries((data ?? []).map((r) => [r.course_id, r.percent]));
    },
  });

  const filtered = (courses ?? []).filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  const bySem = (s: number) => filtered.filter((c) => c.semester === s);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <AppShell
      title="Syllabus"
      subtitle="Year-by-year coursework"
      right={
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut size={18} />
        </Button>
      }
    >
      {/* Hero progress card */}
      <div className="erich-hero rounded-2xl p-4 mb-4 text-primary-foreground shadow-elevated">
        <div className="flex items-center gap-2 text-xs opacity-90"><Flame size={14}/> Daily streak</div>
        <div className="flex items-end justify-between mt-1">
          <div className="text-3xl font-bold font-display">Keep going!</div>
          <Link to="/app/exam" className="text-xs bg-white/15 px-3 py-1.5 rounded-full">Daily trivia →</Link>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11" />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto -mx-4 px-4 no-scrollbar">
        {[1,2,3].map((y) => (
          <button key={y} onClick={() => setYear(y)} className={`erich-chip ${year === y ? "erich-chip-active" : "erich-chip-idle"}`}>
            Year {y}
          </button>
        ))}
      </div>

      <Accordion type="multiple" defaultValue={["s1"]} className="space-y-2">
        {[1,2].map((s) => (
          <AccordionItem key={s} value={`s${s}`} className="erich-card px-3 border-0">
            <AccordionTrigger className="hover:no-underline py-3">
              <span className="font-semibold">Semester {s}</span>
              <span className="text-xs text-muted-foreground mr-2">{bySem(s).length} courses</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-3">
              {bySem(s).map((c) => (
                <CourseRow key={c.id} id={c.id} title={c.title} percent={progress?.[c.id] ?? 0} />
              ))}
              {bySem(s).length === 0 && <p className="text-sm text-muted-foreground py-2">No courses match.</p>}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </AppShell>
  );
}

function CourseRow({ id, title, percent }: { id: string; title: string; percent: number }) {
  return (
    <Link to="/app/course/$courseId" params={{ courseId: id }} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition">
      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><BookOpen size={18}/></div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{title}</div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={percent} className="h-1.5 flex-1" />
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{percent}%</span>
        </div>
      </div>
      <ChevronRight size={18} className="text-muted-foreground" />
    </Link>
  );
}
