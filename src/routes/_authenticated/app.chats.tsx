import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erich/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/chats")({
  component: () => <ComingSoon title="Chats" subtitle="Private messaging" blurb="Real-time 1:1 chats with typing indicators, read receipts and file sharing are coming next." />,
});
