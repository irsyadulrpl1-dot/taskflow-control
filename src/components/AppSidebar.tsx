import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListTodo,
  CheckSquare,
  Activity,
  BarChart3,
  Users,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hrd", "staff"] },
  { to: "/tasks", label: "Tugas", icon: ListTodo, roles: ["admin", "hrd", "staff"] },
  { to: "/checklist", label: "Checklist", icon: CheckSquare, roles: ["admin", "hrd", "staff"] },
  { to: "/activity", label: "Log Aktivitas", icon: Activity, roles: ["admin", "hrd"] },
  { to: "/reports", label: "Report", icon: BarChart3, roles: ["admin", "hrd"] },
  { to: "/users", label: "User Management", icon: Users, roles: ["admin"] },
];

export function AppSidebar() {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg gradient-brand flex items-center justify-center shadow-glow">
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-base leading-tight">TaskFlow</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              Control System
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav
          .filter((n) => !role || n.roles.includes(role))
          .map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="size-9 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile?.full_name ?? "User"}</div>
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] uppercase mt-0.5">
              {role ?? "—"}
            </Badge>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth"
        >
          <LogOut className="size-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
