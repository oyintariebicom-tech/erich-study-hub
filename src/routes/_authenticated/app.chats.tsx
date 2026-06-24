import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/erich/AppShell";

export const Route = createFileRoute("/_authenticated/app/chats")({
  component: ChatsPage,
});

type Profile = { id: string; full_name: string | null; email: string; avatar_url: string | null };
type Conversation = { id: string; user1_id: string; user2_id: string; last_message_at: string };
type Message = { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function ChatsPage() {
  const [me, setMe] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!me) return;
    const load = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${me},user2_id.eq.${me}`)
        .order("last_message_at", { ascending: false });
      const convs = (data ?? []) as Conversation[];
      setConversations(convs);
      const otherIds = Array.from(new Set(convs.map((c) => (c.user1_id === me ? c.user2_id : c.user1_id))));
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", otherIds);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p: any) => (map[p.id] = p));
        setProfiles((prev) => ({ ...prev, ...map }));
      }
    };
    load();

    const channel = supabase
      .channel("conversations-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me]);

  if (!me) return <AppShell title="Chats"><div className="p-4 text-sm text-muted-foreground">Loading…</div></AppShell>;

  if (activeConv) {
    const otherId = activeConv.user1_id === me ? activeConv.user2_id : activeConv.user1_id;
    return (
      <ChatRoom
        me={me}
        conversation={activeConv}
        other={profiles[otherId]}
        onBack={() => setActiveConv(null)}
      />
    );
  }

  return (
    <AppShell title="Chats">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <button
            onClick={() => setShowNew(true)}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No conversations yet. Tap "New chat" to start one.
            </div>
          ) : (
            conversations.map((c) => {
              const otherId = c.user1_id === me ? c.user2_id : c.user1_id;
              const p = profiles[otherId];
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveConv(c)}
                  className="w-full flex items-center gap-3 p-4 border-b hover:bg-muted/50 text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {(p?.full_name || p?.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p?.full_name || p?.email || "User"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.last_message_at).toLocaleString()}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      {showNew && (
        <NewChatModal
          me={me}
          onClose={() => setShowNew(false)}
          onCreated={(conv, other) => {
            setProfiles((prev) => ({ ...prev, [other.id]: other }));
            setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
            setShowNew(false);
            setActiveConv(conv);
          }}
        />
      )}
    </AppShell>
  );
}

function NewChatModal({
  me,
  onClose,
  onCreated,
}: {
  me: string;
  onClose: () => void;
  onCreated: (conv: Conversation, other: Profile) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .neq("id", me)
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(20);
      setResults((data ?? []) as Profile[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, me]);

  const startChat = async (other: Profile) => {
    const [u1, u2] = orderedPair(me, other.id);
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();
    if (existing) {
      onCreated(existing as Conversation, other);
      return;
    }
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user1_id: u1, user2_id: u2 })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    onCreated(created as Conversation, other);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Start new chat</h3>
          <button onClick={onClose} className="text-sm text-muted-foreground">Close</button>
        </div>
        <div className="p-3 border-b">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-4 text-sm text-muted-foreground">Searching…</div>}
          {!loading && q && results.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No users found.</div>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => startChat(p)}
              className="w-full flex items-center gap-3 p-3 border-b hover:bg-muted/50 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {(p.full_name || p.email).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.full_name || p.email}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatRoom({
  me,
  conversation,
  other,
  onBack,
}: {
  me: string;
  conversation: Conversation;
  other: Profile | undefined;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Message[]);
    };
    load();

    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversation.id, sender_id: me, content });
    if (error) {
      alert(error.message);
      setText(content);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <div className="flex items-center gap-3 p-3 border-b">
        <button onClick={onBack} className="text-sm text-primary font-medium">← Back</button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
          {(other?.full_name || other?.email || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{other?.full_name || other?.email || "User"}</div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Say hi 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words ${
                  mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                }`}
              >
                <div>{m.content}</div>
                <div className={`text-[10px] mt-1 opacity-70`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-3 border-t flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          className="flex-1 px-3 py-2 rounded-full border bg-background"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
