import { BASE_URL, OFFICIAL_DOMAIN } from "@/lib/config";

/**
 * Gera a URL oficial do convite.
 * @param code O código do convite.
 * @returns A URL completa.
 */
export const getInvitationUrl = (code: string) => {
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
    OFFICIAL_DOMAIN
  });

  // Para o WhatsApp, se não for produção e não for preview, usamos o BASE_URL (produção)
  // Mas se for preview, usamos o origin atual para o desenvolvedor testar.
  if (isPreview) {
    return `${window.location.origin}/convite/${code}`;
  }

  // Fallback padrão: Produção
  return `${BASE_URL}/convite/${code}`;
};


/**
 * Gera a mensagem padrão de WhatsApp para convites.
 */
export const getWhatsAppInvitationMessage = (params: {
  patientName: string;
  professionalName: string;
  clinicName?: string;
  invitationCode: string;
}) => {
  const { patientName, professionalName, clinicName, invitationCode } = params;
  const greeting = patientName ? `Olá ${patientName.split(" ")[0]}! ` : "Olá! ";
  const clinicPart = clinicName ? ` da clínica *${clinicName}*` : "";
  const url = getInvitationUrl(invitationCode);

  return `${greeting}Sou o(a) nutricionista *${professionalName}*${clinicPart}. Seu acesso ao FitJourney foi criado! 🚀\n\nClique no link abaixo para aceitar seu convite e começar seu acompanhamento:\n\n${url}`;
};
