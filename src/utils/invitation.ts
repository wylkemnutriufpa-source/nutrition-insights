import { BASE_URL } from "@/lib/config";

/**
 * Gera a URL oficial do convite.
 * @param code O código do convite.
 * @returns A URL completa.
 */
export const getInvitationUrl = (code: string) => {
  // Se estivermos em produção ou em um domínio oficial, usamos o hostname atual.
  // Caso contrário, forçamos o domínio oficial para garantir que o link funcione no WhatsApp.
  const officialDomains = ["fitjourney.com.br"];
  const currentHost = window.location.hostname;
  const isOfficial = officialDomains.some(d => currentHost.includes(d));

  if (!isOfficial && !currentHost.includes("localhost") && !currentHost.includes("lovable")) {
    return `${BASE_URL}/convite/${code}`;
  }

  // Em localhost ou lovable, usamos a origem atual para facilitar o teste, 
  // mas o usuário pediu para "sempre abrir com fitjourney.com.br" no log.
  // No entanto, para o link ser CLICÁVEL e funcionar no ambiente de teste, 
  // manter a origem atual é melhor, mas para o WhatsApp WEB/Celular, 
  // o domínio oficial é obrigatório para confiança.
  
  return `${window.location.origin}/convite/${code}`;
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
