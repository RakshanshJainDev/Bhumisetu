import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Brand } from "@/components/bhumisetu";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/primary/login")({
  ssr: false,
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Primary User Login — BHUMISETU" },
      {
        name: "description",
        content: "Sign in to upload, process and verify land records in BHUMISETU.",
      },
      { property: "og:title", content: "Primary User Login — BHUMISETU" },
      { property: "og:description", content: "Secure access for BHUMISETU primary users." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const target = search.redirect?.startsWith("/") ? search.redirect : "/primary/dashboard";

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: target, replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate, target]);

  async function afterLogin(userId: string, userEmail: string) {
    await supabase
      .from("profiles")
      .upsert({ id: userId, email: userEmail, name: name || userEmail.split("@")[0] || "Primary User" });
    await supabase.from("audit_logs").insert({
      action: "USER_LOGIN",
      user_id: userId,
      details: userEmail,
    });
    navigate({ to: target, replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/primary/dashboard` },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Account created. Please confirm your email, then sign in.");
          setMode("signin");
          return;
        }
        await afterLogin(data.user!.id, email);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await afterLogin(data.user.id, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in failed. Please try email and password.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) await afterLogin(data.user.id, data.user.email ?? "");
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto max-w-6xl">
          <Brand />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-primary">Primary User Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access the upload, extraction and verification workspace.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-primary">Full name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Your name"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-primary">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-primary">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="••••••••"
              />
            </label>

            {error ? (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="rounded-md border border-verified/30 bg-verified/10 px-3 py-2 text-sm text-verified">
                {notice}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="mt-3 w-full rounded-md border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            Continue with Google
          </button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New primary user?" : "Already registered?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="mt-4 text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary">
              Back to public site
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
