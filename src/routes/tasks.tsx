import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Plus, Search, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  isOverdue,
  logActivity,
  priorityColor,
  priorityLabel,
  statusColor,
  statusLabel,
} from "@/lib/task-helpers";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  assigned_to: string;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  status: "unread" | "read" | "in_progress" | "done";
  progress: number;
  read_at: string | null;
  completed_at: string | null;
  created_at: string;
  assignee: { full_name: string } | null;
  creator: { full_name: string } | null;
}

interface UserOpt {
  id: string;
  full_name: string;
}

function TasksPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Inner />
      </AppShell>
    </ProtectedRoute>
  );
}

function Inner() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<TaskRow | null>(null);

  const canCreate = role === "admin" || role === "hrd";

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: u }] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "*, assignee:profiles!tasks_assigned_to_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);
    setTasks((t as unknown as TaskRow[]) ?? []);
    setUsers((u as UserOpt[]) ?? []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const openDetail = async (t: TaskRow) => {
    setDetailTask(t);
    // mark as read if assignee opens unread
    if (user && t.assigned_to === user.id && t.status === "unread") {
      const now = new Date().toISOString();
      await supabase.from("tasks").update({ status: "read", read_at: now }).eq("id", t.id);
      await logActivity(t.id, user.id, "membaca tugas");
      void load();
    }
  };

  return (
    <>
      <PageHeader
        title="Manajemen Tugas"
        description="Kelola, assign, dan pantau progres tugas tim."
        action={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 mr-1.5" />
              Tugas Baru
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari tugas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="unread">Belum dibaca</SelectItem>
            <SelectItem value="read">Sudah dibaca</SelectItem>
            <SelectItem value="in_progress">Dikerjakan</SelectItem>
            <SelectItem value="done">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Memuat...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Belum ada tugas yang cocok.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => {
            const overdue = isOverdue(t.deadline, t.status);
            return (
              <Card
                key={t.id}
                onClick={() => openDetail(t)}
                className="cursor-pointer hover:shadow-elegant transition-smooth border-border/60"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{t.title}</h3>
                        {overdue && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                            <AlertTriangle className="size-3" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant="outline" className={statusColor[t.status]}>
                        {statusLabel[t.status]}
                      </Badge>
                      <Badge variant="outline" className={priorityColor[t.priority]}>
                        {priorityLabel[t.priority]}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span>Untuk: <span className="text-foreground font-medium">{t.assignee?.full_name ?? "—"}</span></span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">Deadline: {formatDate(t.deadline)}</span>
                    </div>
                    {t.progress > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Progress value={t.progress} className="w-20 h-1.5" />
                        <span className="tabular-nums">{t.progress}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        users={users}
        onCreated={load}
      />

      <TaskDetailDialog
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onUpdated={load}
      />
    </>
  );
}

// =====================================================
function CreateTaskDialog({
  open,
  onOpenChange,
  users,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: UserOpt[];
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(""); setDesc(""); setAssignedTo(""); setDeadline(""); setPriority("medium");
  };

  const submit = async () => {
    if (!user || !title.trim() || !assignedTo) {
      toast.error("Isi judul dan pilih penerima tugas");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description: desc.trim() || null,
        created_by: user.id,
        assigned_to: assignedTo,
        deadline: deadline || null,
        priority,
        status: "unread",
        progress: 0,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("Gagal membuat tugas", { description: error?.message });
      return;
    }
    await logActivity(data.id, user.id, "membuat tugas");
    toast.success("Tugas berhasil dibuat");
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tugas Baru</DialogTitle>
          <DialogDescription>Buat dan delegasikan tugas baru ke anggota tim.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Judul *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Siapkan laporan mingguan" />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Detail tugas..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assign ke *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Pilih user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioritas</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Rendah</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="high">Tinggi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Menyimpan..." : "Buat Tugas"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
interface LogRow {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  user: { full_name: string } | null;
}

function TaskDetailDialog({
  task,
  onClose,
  onUpdated,
}: {
  task: TaskRow | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { user, role } = useAuth();
  const [progress, setProgress] = useState(0);
  const [updateNote, setUpdateNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    if (task) {
      setProgress(task.progress);
      setUpdateNote("");
      void loadLogs(task.id);
    }
  }, [task]);

  async function loadLogs(taskId: string) {
    const { data } = await supabase
      .from("task_logs")
      .select("id, action, details, created_at, user:profiles!task_logs_user_id_fkey(full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    setLogs((data as unknown as LogRow[]) ?? []);
  }

  if (!task) return null;
  const isAssignee = user?.id === task.assigned_to;
  const canEdit = isAssignee || role === "admin" || role === "hrd";
  const canDelete = role === "admin" || role === "hrd";

  const saveProgress = async () => {
    if (!user) return;
    setSaving(true);
    const newStatus = progress >= 100 ? "done" : progress > 0 ? "in_progress" : task.status;
    const completed_at =
      newStatus === "done" && !task.completed_at ? new Date().toISOString() : task.completed_at;
    const { error } = await supabase
      .from("tasks")
      .update({ progress, status: newStatus, completed_at })
      .eq("id", task.id);
    if (!error) {
      await logActivity(
        task.id,
        user.id,
        progress >= 100 ? "menyelesaikan tugas" : "memperbarui progres",
        updateNote || `Progress: ${progress}%`,
      );
      toast.success(progress >= 100 ? "Tugas diselesaikan!" : "Progres disimpan");
      setUpdateNote("");
      onUpdated();
      void loadLogs(task.id);
    } else {
      toast.error("Gagal menyimpan", { description: error.message });
    }
    setSaving(false);
  };

  const deleteTask = async () => {
    if (!user || !confirm("Hapus tugas ini? Tindakan tidak bisa dibatalkan.")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
    } else {
      toast.success("Tugas dihapus");
      onClose();
      onUpdated();
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-2 flex-wrap">
            <DialogTitle className="text-xl pr-2">{task.title}</DialogTitle>
            <Badge variant="outline" className={statusColor[task.status]}>{statusLabel[task.status]}</Badge>
            <Badge variant="outline" className={priorityColor[task.priority]}>{priorityLabel[task.priority]}</Badge>
          </div>
          <DialogDescription className="text-xs">
            Dibuat oleh {task.creator?.full_name ?? "—"} · {formatDate(task.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {task.description && (
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Deskripsi</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Penerima</Label>
              <p className="mt-1 font-medium">{task.assignee?.full_name ?? "—"}</p>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Deadline</Label>
              <p className="mt-1 font-medium">{formatDate(task.deadline)}</p>
            </div>
            {task.read_at && (
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Dibaca pada</Label>
                <p className="mt-1 text-success font-medium">{formatDate(task.read_at)}</p>
              </div>
            )}
            {task.completed_at && (
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Selesai pada</Label>
                <p className="mt-1 text-success font-medium">{formatDate(task.completed_at)}</p>
              </div>
            )}
          </div>

          {canEdit && task.status !== "done" && (
            <div className="border-t border-border pt-4 space-y-3">
              <Label>Update progres ({progress}%)</Label>
              <Slider
                value={[progress]}
                onValueChange={(v) => setProgress(v[0])}
                max={100}
                step={5}
              />
              <Textarea
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                placeholder="Catatan pembaruan (opsional)..."
                rows={2}
              />
              <Button onClick={saveProgress} disabled={saving} className="w-full">
                {saving ? "Menyimpan..." : progress >= 100 ? "Tandai Selesai ✓" : "Simpan Progres"}
              </Button>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <Label className="text-xs uppercase text-muted-foreground mb-2 block">Riwayat aktivitas</Label>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.map((l) => (
                  <div key={l.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                    <span className="font-medium">{l.user?.full_name ?? "Seseorang"}</span>{" "}
                    <span className="text-muted-foreground">{l.action}</span>
                    {l.details && <div className="text-muted-foreground italic">"{l.details}"</div>}
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {formatDate(l.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {canDelete ? (
            <Button variant="outline" onClick={deleteTask} className="text-destructive hover:text-destructive">
              <Trash2 className="size-4 mr-1.5" />
              Hapus
            </Button>
          ) : <div />}
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
