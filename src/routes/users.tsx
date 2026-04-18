import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

interface UserView {
  id: string;
  full_name: string;
  position: string | null;
  roles: AppRole[];
}

function UsersPage() {
  return (
    <ProtectedRoute allow={["admin"]}>
      <AppShell>
        <Inner />
      </AppShell>
    </ProtectedRoute>
  );
}

function Inner() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, position").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const merged: UserView[] = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      position: p.position,
      roles: ((roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) as AppRole[]),
    }));
    setUsers(merged);
    setLoading(false);
  }

  const setRole = async (userId: string, newRole: AppRole) => {
    // Remove all existing roles, add new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) {
      toast.error("Gagal mengubah role", { description: error.message });
    } else {
      toast.success(`Role diubah menjadi ${newRole}`);
      void load();
    }
  };

  const initials = (n: string) => n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const roleBadge: Record<AppRole, string> = {
    admin: "bg-primary text-primary-foreground border-primary",
    hrd: "bg-info/15 text-info border-info/30",
    staff: "bg-muted text-muted-foreground border-border",
  };

  return (
    <>
      <PageHeader
        title="User Management"
        description="Kelola akun & role anggota tim."
      />

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Memuat...</Card>
      ) : (
        <Card className="shadow-card-soft">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {users.map((u) => {
                const currentRole = u.roles[0] ?? "staff";
                const isSelf = u.id === currentUser?.id;
                return (
                  <div
                    key={u.id}
                    className="px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {u.full_name}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2 text-[10px]">Anda</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.position ?? "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className={roleBadge[currentRole]}>
                        {currentRole.toUpperCase()}
                      </Badge>
                      <Select
                        value={currentRole}
                        onValueChange={(v) => setRole(u.id, v as AppRole)}
                        disabled={isSelf}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="hrd">HRD</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
