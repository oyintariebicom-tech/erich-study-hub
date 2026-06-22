import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pin, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/erich/AppShell";

export const Route = createFileRoute("/_authenticated/app/community")({
  component: CommunityPage,
});

function CommunityPage() {
  const { data: notices } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <AppShell title="Community" subtitle="Notice board & discussions">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Megaphone size={14}/> Notices</h2>
      {(notices ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ul className="space-y-2">
          {notices!.map((n) => (
            <li key={n.id} className="erich-card p-4">
              <div className="flex items-start gap-2">
                {n.pinned && <Pin size={14} className="text-warning mt-1 shrink-0"/>}
                <div className="flex-1">
                  <div className="font-semibold">{n.title}</div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>
                  <div className="text-[11px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 erich-card p-5 text-center text-sm text-muted-foreground">
        Discussion boards, posts, comments and moderation are coming in the next release.
      </div>
    </AppShell>
  );
}
