import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, Plus, FileUp, BookPlus, Megaphone, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/erich/AppShell";
import { useIsAdmin } from "@/hooks/useRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return <AppShell title="Admin"><p className="text-sm text-muted-foreground">Checking access…</p></AppShell>;
  if (!isAdmin) return (
    <AppShell title="Admin">
      <div className="erich-card p-6 text-center">
        <AlertTriangle className="mx-auto text-destructive mb-2" />
        <h2 className="font-semibold">Restricted area</h2>
        <p className="text-sm text-muted-foreground mt-1">Only the ERICH super admin can access this dashboard.</p>
        <Button asChild className="mt-4"><Link to="/app">Back to app</Link></Button>
      </div>
    </AppShell>
  );

  return (
    <AppShell title="Admin Dashboard" subtitle="Super admin tools" right={<Shield size={18} className="text-warning"/>}>
      <Tabs defaultValue="notes">
        <TabsList className="grid grid-cols-4 w-full mb-4">
          <TabsTrigger value="notes"><FileUp size={14}/></TabsTrigger>
          <TabsTrigger value="quiz"><BookPlus size={14}/></TabsTrigger>
          <TabsTrigger value="q"><Plus size={14}/></TabsTrigger>
          <TabsTrigger value="ann"><Megaphone size={14}/></TabsTrigger>
        </TabsList>
        <TabsContent value="notes"><UploadNote/></TabsContent>
        <TabsContent value="quiz"><CreateQuiz/></TabsContent>
        <TabsContent value="q"><AddQuestion/></TabsContent>
        <TabsContent value="ann"><PostAnnouncement/></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function useCourses() {
  return useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, year, semester").order("year").order("semester").order("sort_order");
      return data ?? [];
    },
  });
}

function UploadNote() {
  const { data: courses } = useCourses();
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !courseId || !title) return;
    setBusy(true);
    try {
      const path = `${courseId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("notes").upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("notes").insert({ course_id: courseId, title, pdf_url: path });
      if (insErr) throw insErr;
      toast.success("Note uploaded");
      setTitle(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["notes"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="erich-card p-4 space-y-3">
      <h2 className="font-semibold">Upload PDF note</h2>
      <CourseSelect value={courseId} onChange={setCourseId} courses={courses ?? []}/>
      <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required/></div>
      <div><Label>PDF file</Label><Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required/></div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Uploading…" : "Upload"}</Button>
    </form>
  );
}

function CreateQuiz() {
  const { data: courses } = useCourses();
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("course");
  const [timer, setTimer] = useState(600);
  const [difficulty, setDifficulty] = useState("medium");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { title, quiz_type: type, timer_seconds: timer, difficulty };
    if (type === "course") payload.course_id = courseId;
    const { error } = await supabase.from("quizzes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Quiz created");
    setTitle("");
  }
  return (
    <form onSubmit={submit} className="erich-card p-4 space-y-3">
      <h2 className="font-semibold">Create quiz</h2>
      <div><Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="course">Course quiz</SelectItem>
            <SelectItem value="trivia">Daily trivia</SelectItem>
            <SelectItem value="mock">Full mock exam</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {type === "course" && <CourseSelect value={courseId} onChange={setCourseId} courses={courses ?? []}/>}
      <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Timer (seconds)</Label><Input type="number" value={timer} onChange={(e) => setTimer(+e.target.value)}/></div>
        <div><Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full">Create</Button>
    </form>
  );
}

function AddQuestion() {
  const { data: quizzes } = useQuery({
    queryKey: ["all-quizzes"],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("id, title, quiz_type").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [quizId, setQuizId] = useState("");
  const [q, setQ] = useState({ question: "", a: "", b: "", c: "", d: "", answer: "A", rationale: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("questions").insert({
      quiz_id: quizId, question: q.question,
      option_a: q.a, option_b: q.b, option_c: q.c, option_d: q.d,
      answer: q.answer, rationale: q.rationale || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Question added");
    setQ({ question: "", a: "", b: "", c: "", d: "", answer: "A", rationale: "" });
  }
  return (
    <form onSubmit={submit} className="erich-card p-4 space-y-3">
      <h2 className="font-semibold">Add question</h2>
      <div><Label>Quiz</Label>
        <Select value={quizId} onValueChange={setQuizId}>
          <SelectTrigger><SelectValue placeholder="Select quiz"/></SelectTrigger>
          <SelectContent>{(quizzes ?? []).map((qz) => <SelectItem key={qz.id} value={qz.id}>{qz.title} ({qz.quiz_type})</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Question</Label><Textarea value={q.question} onChange={(e) => setQ({ ...q, question: e.target.value })} required rows={3}/></div>
      {(["a","b","c","d"] as const).map((k) => (
        <div key={k}><Label>Option {k.toUpperCase()}</Label><Input value={q[k]} onChange={(e) => setQ({ ...q, [k]: e.target.value })} required/></div>
      ))}
      <div><Label>Correct answer</Label>
        <Select value={q.answer} onValueChange={(v) => setQ({ ...q, answer: v })}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>{["A","B","C","D"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Rationale (optional)</Label><Textarea value={q.rationale} onChange={(e) => setQ({ ...q, rationale: e.target.value })} rows={2}/></div>
      <Button type="submit" className="w-full">Add question</Button>
    </form>
  );
}

function PostAnnouncement() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("announcements").insert({ title, body, pinned });
    if (error) return toast.error(error.message);
    toast.success("Announcement posted");
    setTitle(""); setBody(""); setPinned(false);
  }
  return (
    <form onSubmit={submit} className="erich-card p-4 space-y-3">
      <h2 className="font-semibold">Post announcement</h2>
      <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required/></div>
      <div><Label>Body</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={5}/></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}/> Pin to top</label>
      <Button type="submit" className="w-full">Post</Button>
    </form>
  );
}

function CourseSelect({ value, onChange, courses }: { value: string; onChange: (v: string) => void; courses: { id: string; title: string; year: number; semester: number }[] }) {
  return (
    <div><Label>Course</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select course"/></SelectTrigger>
        <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>Y{c.year}S{c.semester} — {c.title}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
