import { PRODUCTION_URL } from "@/lib/config";

/**
 * Guard de integridade: garante que NENHUM link de convite emitido pelo app
 * use as rotas legadas /convite/ ou /~oauth/convite/ — elas só existem como
 * rotas de redirecionamento. O canal oficial é /cadastro?code=...
 */
const enforceCanonicalInvitePath = (url: string, code: string): string => {
  const lower = url.toLowerCase();
  const usesLegacyConvite = /\/(?:~oauth\/)?convite\//.test(lower);
  if (!usesLegacyConvite) return url;

  const message = `[invitation:guard] URL não-canônica detectada (${url}). Forçando /cadastro?code=...`;
  if (import.meta.env.DEV) {
    throw new Error(message);
  }
  console.error(message);
  
  return `${PRODUCTION_URL}/cadastro?code=${encodeURIComponent(code)}`;
};

/**
 * Gera a URL oficial do convite.
 * @param code O código do convite.
 * @param nutriId O ID do nutricionista.
 * @param forceProduction Se true, sempre usa o domínio de produção (bom para compartilhamento real).
 * @returns A URL completa.
 */
export const getInvitationUrl = (code?: string, nutriId?: string, forceProduction = false) => {
  const origin = PRODUCTION_URL;
  
  if (code && code.length <= 12) {
    return `${origin}/convite/${code}`;
  }

  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (nutriId) params.set("nutri", nutriId);
  
  const query = params.toString();
  return `${origin}/cadastro${query ? `?${query}` : ""}`;
};

/**
 * Gera a URL de vínculo rápido.
 */
export const getQuickLinkUrl = (nutriId: string, forceProduction = false) => {
  return `${PRODUCTION_URL}/quick-link/${nutriId}`;
};

/**
 * Gera a URL de onboarding genérica para o paciente.
 */
export const getOnboardingUrl = (forceProduction = false) => {
  return `${PRODUCTION_URL}/onboarding`;
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
  invitationCode?: string;
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
  const safeProfName = formatProfessionalName(professionalName?.trim() || "Dr. Wylkem Raiol");
  const safeClinicPart = clinicName?.trim() ? ` da clínica *${clinicName}*` : "";
  const url = getInvitationUrl(invitationCode || undefined, professionalId, true);

  // Se houver um template customizado (do banco de dados), processamos as variáveis
  if (customTemplate) {
    return customTemplate
      .replace(/{{patientName}}/g, safePatientName)
      .replace(/{{professionalName}}/g, safeProfName)
      .replace(/{{clinicName}}/g, clinicName?.trim() || "FitJourney")
      .replace(/{{url}}/g, url);
  }

  // Templates padrão com fallback
  if (templateType === 'patient_invite') {
    return `*Olá ${safePatientName}!* Tudo bem?\n\nSou o(a) nutricionista *${safeProfName}*${safeClinicPart}. Convido você a começar seu acompanhamento nutricional na plataforma *FitJourney*! 🚀\n\nClique no link abaixo para se cadastrar:\n\n👉 ${url}\n\nVamos juntos buscar sua melhor versão! 💪`;
  }

  if (templateType === 'quick_link') {
    return `*Olá!* Sou o(a) nutricionista *${safeProfName}*${safeClinicPart} e convido você a começar seu acompanhamento através deste link rápido: ${url}\n\nVamos juntos! 💪🍎`;
  }

  return `*Olá ${safePatientName}!* Tudo bem?\n\nSou o(a) nutricionista *${safeProfName}*${safeClinicPart} e estou muito feliz em te acompanhar na sua jornada! 🚀\n\nSeu acesso exclusivo à plataforma *FitJourney* já está pronto. Lá você terá seu plano alimentar, orientações e toda a sua evolução na palma da mão. ✨\n\n*Clique no link abaixo para começar:* \n👉 ${url}\n\nVamos juntos buscar sua melhor versão! 💪🍎`;
};

/**
 * Normaliza o nome para exibição profissional, removendo excessos (como nome completo)
 * para manter apenas o nome social/profissional (ex: Dr. Wylkem Raiol).
 */
export const formatProfessionalName = (name: string) => {
  if (!name) return "";
  const trimmed = name.trim();
  
  // Se já tiver títulos comuns, provavelmente é o nome profissional desejado
  if (/^(Dr|Dra|Nutri|Prof|Coach)\.?\s/i.test(trimmed)) {
    return trimmed;
  }

  // Se for um nome muito longo (ex: Wylkem Raiol da Silva Junior), pegamos apenas os dois primeiros
  const parts = trimmed.split(/\s+/);
  if (parts.length > 2) {
    return `${parts[0]} ${parts[1]}`;
  }

  return trimmed;
};
