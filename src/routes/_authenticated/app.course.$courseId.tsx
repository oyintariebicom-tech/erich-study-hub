import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/erich/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/course/$courseId")({
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = useParams({ from: "/_authenticated/app/course/$courseId" });

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      return data;
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["notes", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("notes").select("*").eq("course_id", courseId);
      return data ?? [];
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["course-quizzes", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("course_id", courseId);
      return data ?? [];
    },
  });

  async function openNote(path: string) {
    // path stored as either full URL or storage path "courseId/file.pdf"
    if (path.startsWith("http")) { window.open(path, "_blank"); return; }
    const { data } = await supabase.storage.from("notes").createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <AppShell title={course?.title ?? "Course"} subtitle={course ? `Year ${course.year} • Semester ${course.semester}` : ""} right={
      <Link to="/app" className="text-muted-foreground"><ArrowLeft size={20}/></Link>
    }>
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</h2>
        {notes && notes.length > 0 ? (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="erich-card p-3 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><FileDown size={18}/></div>
                <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{n.title}</div></div>
                <Button size="sm" onClick={() => openNote(n.pdf_url)}>Open</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No notes uploaded yet for this course.</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quizzes</h2>
        {quizzes && quizzes.length > 0 ? (
          <ul className="space-y-2">
            {quizzes.map((q) => (
              <li key={q.id} className="erich-card p-3 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center"><Play size={18}/></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{q.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{q.difficulty} • {Math.round(q.timer_seconds/60)} min</div>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/app/quiz/$quizId" params={{ quizId: q.id }}>Start</Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No quizzes available yet.</p>
        )}
      </section>
    </AppShell>
  );
}
