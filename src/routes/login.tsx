import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard" });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Login gagal", { description: error.message });
      return;
    }
    toast.success("Selamat datang kembali!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2.5 mb-10">
            <div className="size-10 rounded-lg gradient-brand flex items-center justify-center shadow-glow">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight">TaskFlow</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Control System
              </div>
            </div>
          </Link>

          <h1 className="text-3xl font-display font-bold">Masuk ke akun Anda</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-8">
            Pantau tim dengan transparansi penuh.
          </p>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memproses..." : "Masuk"}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Daftar di sini
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right: brand */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-sidebar text-sidebar-foreground">
        <div className="absolute inset-0 gradient-glow" />
        <div className="relative z-10 flex flex-col justify-center p-16 max-w-xl">
          <div className="size-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-6">
            <Sparkles className="size-6" />
          </div>
          <h2 className="text-4xl font-display font-bold leading-tight">
            Transparansi tim yang <span className="text-primary-glow">tidak bisa disembunyikan.</span>
          </h2>
          <p className="mt-4 text-base text-sidebar-foreground/75">
            Lihat siapa yang sudah baca, siapa yang sedang kerja, dan siapa yang menunda — semua
            dalam satu dashboard.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { n: "100%", l: "Transparan" },
              { n: "Real-time", l: "Tracking" },
              { n: "Audit", l: "Trail" },
            ].map((s) => (
              <div key={s.l} className="border border-white/10 rounded-lg p-4 backdrop-blur bg-white/5">
                <div className="text-xl font-display font-bold">{s.n}</div>
                <div className="text-xs text-sidebar-foreground/60 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
