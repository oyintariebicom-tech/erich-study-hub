import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/erich-logo.png";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).default("login") });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — ERICH" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created! Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (result.error) { toast.error("Google sign-in failed"); return; }
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <main className="min-h-screen bg-background flex flex-col px-6 py-8">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <img src={logo} alt="" width={36} height={36} />
        <span className="font-display font-semibold text-lg">ERICH</span>
      </Link>

      <div className="max-w-sm w-full mx-auto flex-1">
        <h1 className="text-2xl font-semibold mb-1">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isSignup ? "Start studying for UNMC today." : "Sign in to continue your prep."}
        </p>

        <Button onClick={handleGoogle} variant="outline" className="w-full h-11 mb-4">
          <GoogleIcon /> Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground my-4">
          <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Akello" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
            {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isSignup ? (
            <>Have an account? <Link to="/auth" search={{ mode: "login" }} className="text-primary font-medium">Sign in</Link></>
          ) : (
            <>New to ERICH? <Link to="/auth" search={{ mode: "signup" }} className="text-primary font-medium">Create one</Link></>
          )}
        </p>
        <p className="text-center mt-4">
          <Link to="/app" className="text-xs text-muted-foreground hover:text-foreground">Continue as guest →</Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" className="mr-2">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-4.9c-1.9 1.3-4.3 2-6.9 2-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.2 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.4 5.5l6 4.9c-.4.4 6.6-4.8 6.6-14.4 0-1.2-.1-2.3-.3-3.5z"/>
    </svg>
  );
}
