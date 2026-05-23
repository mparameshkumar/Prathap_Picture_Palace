import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api, setAuth } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — Prathap Theatre" }] }),
  component: Login,
});

function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Try customer login first, then admin if it fails
      let res;
      let userRole;
      
      try {
        // Try customer endpoint: POST /user/token
        const form = new URLSearchParams();
        form.append("username", username);
        form.append("password", password);

        res = await api.post("/user/token", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        userRole = "customer";
      } catch (customerErr) {
        // Try admin endpoint: POST /api/auth/login
        const form = new URLSearchParams();
        form.append("username", username);
        form.append("password", password);

        res = await api.post("/api/auth/login", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        userRole = "admin";
      }

      const token = res.data?.access_token || res.data?.token;
      const finalRole = res.data?.user?.role || userRole;
      if (!token) throw new Error("No token returned");

      setAuth(token, finalRole);
      window.dispatchEvent(new Event("auth:update"));
      toast.success(`Welcome back!`);
      router.navigate({ to: finalRole === "admin" ? "/admin" : "/menu" });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed. Check your credentials.";
      toast.error(typeof msg === "string" ? msg : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="absolute inset-0 bg-hero opacity-50" />
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Film className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl tracking-wider">PRATHAP</span>
        </Link>

        <div className="rounded-2xl bg-gradient-card border border-border/60 p-8 shadow-elegant">
          <h1 className="font-display text-3xl text-center">Welcome Back</h1>
          <p className="text-center text-sm text-muted-foreground mt-1">
            Sign in to continue
          </p>

          
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Connecting to <span className="font-mono">localhost:8000</span>
          </p>
        </div>
      </div>
    </div>
  );
}
