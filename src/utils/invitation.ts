import { BASE_URL, OFFICIAL_DOMAIN } from "@/lib/config";

/**
 * Guard de integridade: garante que NENHUM link de convite emitido pelo app
 * use as rotas legadas /convite/ ou /~oauth/convite/ — elas só existem como
 * rotas de redirecionamento. O canal oficial é /cadastro?code=...
 *
 * Em DEV/Preview, joga um erro para falhar testes. Em produção, sanitiza e
 * loga (não derruba o usuário em runtime).
 */
const enforceCanonicalInvitePath = (url: string, code: string): string => {
  const lower = url.toLowerCase();
  const usesLegacyConvite = /\/(?:~oauth\/)?convite\//.test(lower);
  if (!usesLegacyConvite) return url;

  const message = `[invitation:guard] URL não-canônica detectada (${url}). Forçando /cadastro?code=...`;
  if (import.meta.env.DEV) {
    // Falha alto durante desenvolvimento/testes
    throw new Error(message);
  }
  console.error(message);
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : BASE_URL;
  return `${origin}/cadastro?code=${encodeURIComponent(code)}`;
};

/**
 * Gera a URL oficial do convite.
 * @param code O código do convite.
 * @param nutriId O ID do nutricionista (opcional, mas recomendado para robustez).
 * @returns A URL completa.
 */
export const getInvitationUrl = (code: string, nutriId?: string) => {
  const currentHost = window.location.hostname;

  // Se estivermos em produção ou em um domínio oficial, usamos o hostname atual.
  const isProduction = currentHost === OFFICIAL_DOMAIN || currentHost === "fitjourney.com.br";
  const isPreview = currentHost.includes("lovable") || currentHost.includes("localhost");

  // Log para depuração solicitado pelo usuário
  console.log("[getInvitationUrl] Config:", {
    currentHost,
    isProduction,
    isPreview,
    BASE_URL,
    OFFICIAL_DOMAIN,
    nutriId
  });

  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (nutriId) params.set("nutri", nutriId);
  
  const query = params.toString();
  const path = `/cadastro${query ? `?${query}` : ""}`;

  const origin = isPreview ? window.location.origin : BASE_URL;
  return `${origin}${path}`;
};


/**
 * Tipos de convites suportados
 */
export type WhatsAppTemplateType = 'patient_invite' | 'patient_onboarding' | 'quick_link';

/**
 * Gera a mensagem padrão de WhatsApp para convites com fallbacks seguros.
 */
export const getWhatsAppInvitationMessage = (params: {
  patientName: string;
  professionalName: string;
  clinicName?: string;
  invitationCode: string;
  professionalId?: string;
  templateType?: WhatsAppTemplateType;
  customTemplate?: string;
}) => {
  const { 
    patientName, 
    professionalName, 
    clinicName, 
    invitationCode, 
    professionalId, 
    templateType = 'patient_onboarding',
    customTemplate 
  } = params;

  // Fallbacks para dados ausentes para evitar campos vazios na mensagem
  const safePatientName = patientName?.trim() ? patientName.split(" ")[0] : "Paciente";
  const safeProfName = professionalName?.trim() || "Seu Nutricionista";
  const safeClinicPart = clinicName?.trim() ? ` da clínica *${clinicName}*` : "";
  const url = getInvitationUrl(invitationCode, professionalId);

  // Se houver um template customizado (do banco de dados), processamos as variáveis
  if (customTemplate) {
    return customTemplate
      .replace(/{{patientName}}/g, safePatientName)
      .replace(/{{professionalName}}/g, safeProfName)
      .replace(/{{clinicName}}/g, clinicName?.trim() || "")
      .replace(/{{url}}/g, url);
  }

  // Templates padrão com fallback
  if (templateType === 'patient_invite') {
    return `*Olá ${safePatientName}!* Tudo bem?\n\nSou o(a) nutricionista *${safeProfName}*${safeClinicPart}. Convido você a começar seu acompanhamento nutricional na plataforma *FitJourney*! 🚀\n\nClique no link abaixo para se cadastrar:\n\n👉 ${url}\n\nVamos juntos buscar sua melhor versão! 💪`;
  }

  if (templateType === 'quick_link') {
    return `*Olá!* Sou o(a) nutricionista *${safeProfName}*${safeClinicPart} e convido você a começar seu acompanhamento através deste link rápido: ${url}\n\nVamos juntos! 💪🍎`;
  }

  // Padrão: patient_onboarding
  return `*Olá ${safePatientName}!* Tudo bem?\n\nSou o(a) nutricionista *${safeProfName}*${safeClinicPart} e estou muito feliz em te acompanhar na sua jornada! 🚀\n\nSeu acesso exclusivo à plataforma *FitJourney* já está pronto. Lá você terá seu plano alimentar, orientações e toda a sua evolução na palma da mão. ✨\n\n*Clique no link abaixo para começar:* \n👉 ${url}\n\nVamos juntos buscar sua melhor versão! 💪🍎`;
};
