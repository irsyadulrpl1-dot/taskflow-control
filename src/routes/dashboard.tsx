import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity as ActivityIcon,
  TrendingUp,
} from "lucide-react";
import { formatDate, isOverdue, statusColor, statusLabel } from "@/lib/task-helpers";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

interface Stats {
  todayTotal: number;
  done: number;
  ongoing: number;
  overdue: number;
}
interface ActivityRow {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  user: { full_name: string } | null;
  task: { title: string } | null;
}
interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  assignee: { full_name: string } | null;
}

function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Inner />
      </AppShell>
    </ProtectedRoute>
  );
}

function Inner() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ todayTotal: 0, done: 0, ongoing: 0, overdue: 0 });
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ data: tasks }, { data: logs }, { data: recent }] = await Promise.all([
      supabase.from("tasks").select("id, status, deadline, created_at"),
      supabase
        .from("task_logs")
        .select("id, action, details, created_at, user:profiles!task_logs_user_id_fkey(full_name), task:tasks(title)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("tasks")
        .select("id, title, status, priority, deadline, assignee:profiles!tasks_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const t = tasks ?? [];
    setStats({
      todayTotal: t.filter((x) => new Date(x.created_at) >= todayStart).length,
      done: t.filter((x) => x.status === "done").length,
      ongoing: t.filter((x) => x.status !== "done").length,
      overdue: t.filter((x) => isOverdue(x.deadline, x.status)).length,
    });
    setActivity((logs as unknown as ActivityRow[]) ?? []);
    setRecentTasks((recent as unknown as TaskRow[]) ?? []);
    setLoading(false);
  }

  const cards = [
    {
      label: "Tugas hari ini",
      value: stats.todayTotal,
      icon: ListTodo,
      color: "bg-info/10 text-info",
    },
    {
      label: "Selesai",
      value: stats.done,
      icon: CheckCircle2,
      color: "bg-success/10 text-success",
    },
    {
      label: "Sedang berjalan",
      value: stats.ongoing,
      icon: Clock,
      color: "bg-warning/15 text-warning-foreground",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Halo, ${profile?.full_name?.split(" ")[0] ?? "Tim"} 👋`}
        description="Berikut ringkasan aktivitas tim Anda hari ini."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-card-soft border-border/60 hover:shadow-elegant transition-smooth">
            <CardContent className="p-5">
              <div className={`size-10 rounded-lg flex items-center justify-center ${c.color} mb-4`}>
                <c.icon className="size-5" />
              </div>
              <div className="text-3xl font-display font-bold tabular-nums">
                {loading ? "—" : c.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                {c.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-card-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">
              <TrendingUp className="size-4 inline mr-2 text-primary" />
              Tugas terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Belum ada tugas. Mulai dengan membuat tugas baru.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTasks.map((t) => (
                  <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Untuk {t.assignee?.full_name ?? "—"} · {formatDate(t.deadline)}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColor[t.status]}>
                      {statusLabel[t.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card-soft">
          <CardHeader>
            <CardTitle className="text-base font-display">
              <ActivityIcon className="size-4 inline mr-2 text-primary" />
              Aktivitas tim
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activity.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Belum ada aktivitas.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activity.map((a) => (
                  <div key={a.id} className="px-5 py-3 text-sm">
                    <div className="font-medium">{a.user?.full_name ?? "Seseorang"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.action}
                      {a.task?.title ? ` "${a.task.title}"` : ""}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDate(a.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
