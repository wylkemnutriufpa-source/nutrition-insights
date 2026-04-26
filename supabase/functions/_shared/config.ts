/**
 * Configurações centralizadas para Supabase Edge Functions do FitJourney.
 */

export const BASE_URL = "https://www.fitjourney.com.br";
export const ALLOWED_DOMAINS = ["www.fitjourney.com.br", "fitjourney.com.br"];

/**
 * Verifica se uma URL redireciona para o domínio oficial.
 * @param url A URL a ser verificada.
 * @returns boolean indicando se é válida.
 */
export function isValidDomain(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Retorna uma resposta de erro para domínios não autorizados.
 */
export function unauthorizedDomainResponse() {
  return new Response(
    JSON.stringify({ 
      error: "Domínio não autorizado. Utilize apenas o endereço oficial www.fitjourney.com.br" 
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Log compacto para auditoria de links gerados.
 */
export async function logInvitation(
  adminClient: any, 
  { invitation_id, event_type, details, domain_used, user_agent, professional_id, patient_email }: {
    invitation_id?: string;
    event_type: string;
    details?: any;
    domain_used?: string;
    user_agent?: string;
    professional_id?: string;
    patient_email?: string;
  }
) {

  try {
    await adminClient.from("invitation_logs").insert({
      invitation_id,
      event_type,
      details,
      domain_used: domain_used || BASE_URL,
      user_agent: user_agent || null
    });
  } catch (err) {
    console.error("[config:logInvitation] Falha ao registrar log:", err);
  }
}
