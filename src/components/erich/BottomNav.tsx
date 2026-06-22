import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen, Activity, GraduationCap, Users, MessageCircle, Shield } from "lucide-react";
import { useIsAdmin } from "@/hooks/useRole";

const tabs: { to: string; label: string; icon: typeof BookOpen; exact?: boolean }[] = [
  { to: "/app", label: "Syllabus", icon: BookOpen, exact: true },
  { to: "/app/ospe", label: "OSPE", icon: Activity },
  { to: "/app/exam", label: "Exam", icon: GraduationCap },
  { to: "/app/community", label: "Community", icon: Users },
  { to: "/app/chats", label: "Chats", icon: MessageCircle },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { data: isAdmin } = useIsAdmin();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {tabs.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link to={to} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium">
                <Icon size={22} className={active ? "text-primary" : "text-muted-foreground"} strokeWidth={active ? 2.4 : 1.8} />
                <span className={active ? "text-primary" : "text-muted-foreground"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {isAdmin && (
        <Link to="/app/admin" className="absolute -top-4 right-4 bg-warning text-warning-foreground rounded-full px-3 py-1.5 text-xs font-semibold shadow-elevated inline-flex items-center gap-1">
          <Shield size={14} /> Admin
        </Link>
      )}
    </nav>
  );
}
