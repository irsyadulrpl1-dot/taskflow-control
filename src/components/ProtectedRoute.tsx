import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Sparkles } from "lucide-react";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: AppRole[];
}) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    } else if (!loading && allow && role && !allow.includes(role)) {
      navigate({ to: "/dashboard" });
    }
  }, [user, role, loading, navigate, allow]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-10 rounded-lg gradient-brand flex items-center justify-center animate-pulse">
            <Sparkles className="size-5 text-white" />
          </div>
          <p className="text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (allow && role && !allow.includes(role)) return null;

  return <>{children}</>;
}
