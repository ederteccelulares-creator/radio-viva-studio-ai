import { supabase } from "@/integrations/supabase/client";

export type AuthorizationDetails = {
  client?: { name?: string; client_name?: string; uri?: string };
  redirect_uri?: string;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type Result<T> = { data: T | null; error: { message: string } | null };
type RedirectResult = { redirect_url?: string; redirect_to?: string };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<Result<AuthorizationDetails>>;
  approveAuthorization: (id: string) => Promise<Result<RedirectResult>>;
  denyAuthorization: (id: string) => Promise<Result<RedirectResult>>;
};
// Local wrapper for the beta OAuth namespace; all calls still use the installed SDK.
function oauthApi() { return (supabase.auth as unknown as { oauth: OAuthApi }).oauth; }
export async function loadAuthorization(id: string) {
  if (!id) throw new Error("O link de autorização está incompleto. Inicie a conexão novamente no seu assistente.");
  const { data, error } = await oauthApi().getAuthorizationDetails(id);
  if (error || !data) throw new Error("Esta autorização expirou ou não está disponível. Inicie a conexão novamente no seu assistente.");
  return data;
}
export async function decideAuthorization(id: string, approve: boolean) {
  if (!id) throw new Error("Autorização não informada.");
  const { data, error } = approve ? await oauthApi().approveAuthorization(id) : await oauthApi().denyAuthorization(id);
  if (error) throw new Error(approve ? "Não foi possível aprovar a conexão. Tente novamente." : "Não foi possível cancelar a conexão. Tente novamente.");
  const target = data?.redirect_url ?? data?.redirect_to;
  if (!target) throw new Error("Não foi possível retornar ao assistente. Inicie a conexão novamente.");
  return target;
}
export function authorizationRedirect(details: AuthorizationDetails) {
  return !details.client ? details.redirect_url ?? details.redirect_to : undefined;
}