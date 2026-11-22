import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Radio, ShieldCheck, CalendarDays, ListMusic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { loadAuthorization, decideAuthorization, authorizationRedirect } from "@/lib/oauth-consent";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "" }),
  head: () => pageHead("Autorizar conexão · Sintonia Radio Viva", "Revise e autorize o acesso de um assistente à sua conta da rádio."),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("O link de autorização está incompleto. Inicie a conexão novamente no seu assistente.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Não foi possível verificar sua conta. Tente novamente.");
    const next = location.pathname + location.searchStr + location.hash;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.searchStr).get("authorization_id") ?? "";
    const details = await loadAuthorization(id);
    const immediate = authorizationRedirect(details);
    if (immediate) throw redirect({ href: immediate });
    const { data } = await supabase.auth.getSession();
    return { details, email: data.session?.user.email ?? "Conta conectada" };
  },
  pendingComponent: () => <main className="mx-auto max-w-lg px-6 py-20" role="status">Carregando autorização…</main>,
  errorComponent: ({ error, reset }) => <main className="mx-auto max-w-lg px-6 py-20"><ShieldCheck className="mb-6 size-10 text-neon-cyan" /><h1 className="mb-4 text-2xl">Conexão indisponível</h1><p role="alert" className="mb-6 text-muted-foreground">{error instanceof Error ? error.message : "Não foi possível carregar esta autorização."}</p><Button onClick={reset}>Tentar novamente</Button><Button variant="ghost" asChild><a href="/">Voltar à rádio</a></Button></main>,
  component: Consent,
});
function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const client = details.client?.name ?? details.client?.client_name ?? "Assistente";
  const scopes = details.scopes ?? (details.scope ?? "").split(" ").filter(Boolean);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(approve: boolean) {
    if (busy) return; setBusy(true); setError("");
    try { window.location.assign(await decideAuthorization(authorization_id, approve)); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir a conexão."); setBusy(false); }
  }
  async function switchAccount() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      const next = window.location.pathname + window.location.search + window.location.hash;
      window.location.assign("/login?next=" + encodeURIComponent(next));
    } catch { setError("Não foi possível trocar de conta. Tente novamente."); setBusy(false); }
  }
  return <main className="mx-auto max-w-lg px-6 py-12 md:py-20">
    <Radio className="mb-6 size-10 text-neon-cyan" />
    <h1 className="mb-4 break-words text-2xl font-semibold">Conectar {client} à Sintonia Radio Viva</h1>
    <p className="text-muted-foreground">Isso permite que {client} consulte a rádio usando sua conta.</p>
    <div className="my-6 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4"><span className="break-all text-sm">{email}</span><Button variant="link" disabled={busy} onClick={switchAccount}>Trocar conta</Button></div>
    {details.redirect_uri && <p className="mb-6 break-all text-xs text-muted-foreground">Destino da conexão: {details.redirect_uri}</p>}
    <ul className="space-y-4 text-sm">
      <li className="flex items-center gap-3"><Radio className="size-5 shrink-0 text-neon-cyan" /> Consultar informações da rádio</li>
      <li className="flex items-center gap-3"><CalendarDays className="size-5 shrink-0 text-neon-cyan" /> Consultar programação</li>
      <li className="flex items-center gap-3"><ListMusic className="size-5 shrink-0 text-neon-cyan" /> Consultar fila pública de músicas</li>
      {scopes.map(scope => <li key={scope}>{scope === "openid" || scope === "profile" ? "Compartilhar seu perfil básico" : scope === "email" ? "Compartilhar seu endereço de e-mail" : `Permissão adicional solicitada: ${scope}`}</li>)}
    </ul>
    <p className="my-6 text-sm text-muted-foreground">As permissões da rádio continuam valendo. Esta conexão não permite alterar configurações ou enviar pedidos.</p>
    {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}><ShieldCheck />{busy ? "Aguarde…" : "Aprovar conexão"}</Button><Button variant="outline" disabled={busy} onClick={() => decide(false)}>Cancelar conexão</Button></div>
  </main>;
}