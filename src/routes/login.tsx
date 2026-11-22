import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Radio, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ next: oauthReturnPath(s['next']) }),
  head: () => pageHead("Entrar · Sintonia Radio Viva", "Entre na sua conta para autorizar uma conexão com a rádio."),
  component: Login,
});
function Login() {
  const { next } = Route.useSearch();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "");
    const password = String(values.get("password") ?? "");
    try {
      if (signup) {
        const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL(next, window.location.origin).href } });
        if (result.error) throw result.error;
        if (result.data.session) { window.location.assign(next); return; }
        setNotice("Confira seu e-mail para confirmar a conta e continuar a conexão.");
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        window.location.assign(next);
      }
    } catch { setError(signup ? "Não foi possível criar a conta. Verifique seus dados e tente novamente." : "Não foi possível entrar. Confira seu e-mail e senha."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
    <Radio className="mb-6 size-10 text-neon-cyan" />
    <p className="mb-3 text-sm text-muted-foreground">Sintonia Radio Viva</p>
    <h1 className="mb-8 text-2xl font-semibold">{signup ? "Criar conta" : "Entrar na sua conta"}</h1>
    <form onSubmit={submit} className="space-y-5">
      <label className="block space-y-2"><span>E-mail</span><Input name="email" type="email" autoComplete="email" required disabled={busy} /></label>
      <label className="block space-y-2"><span>Senha</span><Input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={6} required disabled={busy} /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-success">{notice}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}</Button>
    </form>
    <Button variant="link" className="mt-4" disabled={busy} onClick={() => { setSignup(!signup); setError(""); setNotice(""); }}>{signup ? "Já tenho uma conta" : "Criar uma conta"}</Button>
    <Button asChild variant="ghost" className="mt-4"><a href="/"><ArrowLeft /> Voltar à rádio</a></Button>
  </main>;
}