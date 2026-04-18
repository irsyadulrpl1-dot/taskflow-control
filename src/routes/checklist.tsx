import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checklist")({
  component: ChecklistPage,
});

interface ChecklistRow {
  id: string;
  task_name: string;
  status: "pending" | "in_progress" | "done";
  is_recurring: boolean;
  date: string;
}

function ChecklistPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Inner />
      </AppShell>
    </ProtectedRoute>
  );
}

function Inner() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<ChecklistRow[]>([]);
  const [newName, setNewName] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) void load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    // Auto-create today's recurring items if missing
    const { data: rec } = await supabase
      .from("checklists")
      .select("task_name")
      .eq("user_id", user.id)
      .eq("is_recurring", true);

    if (rec && rec.length > 0) {
      const names = Array.from(new Set(rec.map((r) => r.task_name)));
      const { data: existsToday } = await supabase
        .from("checklists")
        .select("task_name")
        .eq("user_id", user.id)
        .eq("date", today);
      const existing = new Set((existsToday ?? []).map((e) => e.task_name));
      const toInsert = names
        .filter((n) => !existing.has(n))
        .map((n) => ({
          user_id: user.id,
          task_name: n,
          is_recurring: true,
          date: today,
          status: "pending" as const,
        }));
      if (toInsert.length > 0) {
        await supabase.from("checklists").insert(toInsert);
      }
    }

    const { data } = await supabase
      .from("checklists")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at", { ascending: true });
    setItems((data as ChecklistRow[]) ?? []);
    setLoading(false);
  }

  const add = async () => {
    if (!user || !newName.trim()) return;
    const { error } = await supabase.from("checklists").insert({
      user_id: user.id,
      task_name: newName.trim(),
      is_recurring: recurring,
      date: today,
      status: "pending",
    });
    if (error) {
      toast.error("Gagal menambah", { description: error.message });
      return;
    }
    setNewName("");
    setRecurring(false);
    void load();
  };

  const toggle = async (item: ChecklistRow) => {
    const next: ChecklistRow["status"] = item.status === "done" ? "pending" : "done";
    await supabase.from("checklists").update({ status: next }).eq("id", item.id);
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("checklists").delete().eq("id", id);
    void load();
  };

  const completedCount = items.filter((i) => i.status === "done").length;

  return (
    <>
      <PageHeader
        title="Checklist Harian"
        description={`${completedCount} dari ${items.length} selesai hari ini.`}
      />

      <Card className="mb-6 shadow-card-soft">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Tambah item checklist..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="flex-1"
            />
            <div className="flex items-center gap-2 px-2">
              <Checkbox id="recurring" checked={recurring} onCheckedChange={(v) => setRecurring(!!v)} />
              <Label htmlFor="recurring" className="text-sm cursor-pointer">
                Berulang harian
              </Label>
            </div>
            <Button onClick={add}>
              <Plus className="size-4 mr-1" />
              Tambah
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Memuat...</Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada item. Tambah checklist pertama Anda di atas.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <Card key={i.id} className="shadow-card-soft border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <Checkbox checked={i.status === "done"} onCheckedChange={() => toggle(i)} />
                <span
                  className={`flex-1 text-sm ${
                    i.status === "done" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {i.task_name}
                </span>
                {i.is_recurring && (
                  <Badge variant="outline" className="gap-1">
                    <Repeat className="size-3" />
                    Harian
                  </Badge>
                )}
                <button
                  onClick={() => remove(i.id)}
                  className="text-muted-foreground hover:text-destructive transition-smooth"
                >
                  <Trash2 className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
