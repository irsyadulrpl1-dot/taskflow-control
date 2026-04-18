import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";
import { formatDate } from "@/lib/task-helpers";

export const Route = createFileRoute("/activity")({
  component: ActivityPage,
});

interface LogRow {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  user: { full_name: string } | null;
  task: { title: string } | null;
}

function ActivityPage() {
  return (
    <ProtectedRoute allow={["admin", "hrd"]}>
      <AppShell>
        <Inner />
      </AppShell>
    </ProtectedRoute>
  );
}

function Inner() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("task_logs")
      .select(
        "id, action, details, created_at, user:profiles!task_logs_user_id_fkey(full_name), task:tasks(title)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs((data as unknown as LogRow[]) ?? []);
    setLoading(false);
  }

  return (
    <>
      <PageHeader
        title="Log Aktivitas"
        description="Audit trail semua aksi di sistem (100 terbaru)."
      />

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Memuat...</Card>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
        </Card>
      ) : (
        <Card className="shadow-card-soft">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {logs.map((l) => (
                <div key={l.id} className="px-5 py-4 flex items-start gap-3">
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-semibold">{l.user?.full_name ?? "Seseorang"}</span>{" "}
                      <span className="text-muted-foreground">{l.action}</span>
                      {l.task?.title && (
                        <span className="text-foreground"> "{l.task.title}"</span>
                      )}
                    </div>
                    {l.details && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">{l.details}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">{formatDate(l.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
