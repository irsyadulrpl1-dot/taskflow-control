import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  taskId: string,
  userId: string,
  action: string,
  details?: string,
) {
  await supabase.from("task_logs").insert({
    task_id: taskId,
    user_id: userId,
    action,
    details: details ?? null,
  });
}

export const priorityColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-info/15 text-info border-info/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
};

export const statusColor: Record<string, string> = {
  unread: "bg-muted text-muted-foreground border-border",
  read: "bg-info/15 text-info border-info/30",
  in_progress: "bg-warning/20 text-warning-foreground border-warning/40",
  done: "bg-success/15 text-success border-success/30",
};

export const statusLabel: Record<string, string> = {
  unread: "Belum dibaca",
  read: "Sudah dibaca",
  in_progress: "Dikerjakan",
  done: "Selesai",
};

export const priorityLabel: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};

export function isOverdue(deadline: string | null, status: string) {
  if (!deadline || status === "done") return false;
  return new Date(deadline) < new Date();
}

export function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
