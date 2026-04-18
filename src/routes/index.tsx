import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) navigate({ to: "/dashboard" });
    else navigate({ to: "/login" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="size-12 rounded-xl gradient-brand flex items-center justify-center animate-pulse shadow-glow">
          <Sparkles className="size-6 text-white" />
        </div>
        <p className="text-sm">Memuat TaskFlow...</p>
      </div>
    </div>
  );
}
