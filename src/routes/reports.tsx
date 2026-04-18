import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { isOverdue } from "@/lib/task-helpers";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

interface UserStat {
  user_id: string;
  full_name: string;
  total: number;
  done: number;
  overdue: number;
}

function ReportsPage() {
  return (
    <ProtectedRoute allow={["admin", "hrd"]}>
      <AppShell>
        <Inner />
      </AppShell>
    </ProtectedRoute>
  );
}

function Inner() {
  const [stats, setStats] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: tasks }] = await Promise.all([
      supabase.from("profiles").select("id, full_name"),
      supabase.from("tasks").select("assigned_to, status, deadline"),
    ]);

    const result: UserStat[] = (profiles ?? []).map((p) => {
      const myTasks = (tasks ?? []).filter((t) => t.assigned_to === p.id);
      return {
        user_id: p.id,
        full_name: p.full_name,
        total: myTasks.length,
        done: myTasks.filter((t) => t.status === "done").length,
        overdue: myTasks.filter((t) => isOverdue(t.deadline, t.status)).length,
      };
    });
    result.sort((a, b) => b.total - a.total);
    setStats(result);
    setLoading(false);
  }

  return (
    <>
      <PageHeader title="Report & Analytics" description="Performa setiap anggota tim." />

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Memuat...</Card>
      ) : (
        <div className="grid gap-3">
          {stats.map((s) => {
            const completionRate = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
            return (
              <Card key={s.user_id} className="shadow-card-soft border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{s.full_name}</h3>
                    <span className="text-2xl font-display font-bold tabular-nums">
                      {completionRate}%
                    </span>
                  </div>
                  <Progress value={completionRate} className="h-2 mb-3" />
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-display font-semibold tabular-nums">{s.total}</div>
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Total</div>
                    </div>
                    <div>
                      <div className="text-lg font-display font-semibold text-success tabular-nums">{s.done}</div>
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Selesai</div>
                    </div>
                    <div>
                      <div className="text-lg font-display font-semibold text-destructive tabular-nums">{s.overdue}</div>
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Overdue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
