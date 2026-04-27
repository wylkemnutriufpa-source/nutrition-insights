import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatInternationalWhatsApp } from "./whatsapp";

export type WhatsAppTemplateType = "meal_plan_ready" | "protocol_activated" | "registration_updated" | "invitation";

export interface WhatsAppTemplateParams {
  patientName: string;
  patientId?: string;
  professionalName: string;
  clinicName?: string;
  appUrl?: string;
  invitationCode?: string;
}

export const getWhatsAppTemplate = (type: WhatsAppTemplateType, params: WhatsAppTemplateParams) => {
  const firstName = params.patientName ? params.patientName.split(" ")[0] : "Paciente";
  const clinicPart = params.clinicName ? ` da clínica *${params.clinicName}*` : "";

  switch (type) {
    case "meal_plan_ready":
      return `Olá ${firstName}! Aqui é o(a) nutricionista ${params.professionalName}. Seu plano alimentar está pronto! 🎉\n\nVocê pode acessá-lo agora pelo link: ${params.appUrl}\n\nQualquer dúvida, estou à disposição!`;
    case "protocol_activated":
      return `Olá ${firstName}! Seu novo protocolo foi ativado por ${params.professionalName}${clinicPart}. 🚀\n\nAcesse agora para conferir as novidades: ${params.appUrl}`;
    case "registration_updated":
      return `Olá ${firstName}! Seu cadastro foi atualizado com sucesso no sistema do(a) ${params.professionalName}. ✅\n\nAcesse seu painel: ${params.appUrl}`;
    case "invitation":
      return `Olá ${firstName}! Sou o(a) nutricionista *${params.professionalName}*${clinicPart}. Seu acesso ao FitJourney foi criado! 🚀\n\nClique no link abaixo para aceitar seu convite e começar seu acompanhamento:\n\n${params.appUrl}`;
    default:
      return "";
  }
};

/**
 * Backward compatibility helper for MealPlanEditorV2
 */
export const getMealPlanReadyMessage = (patientName: string, professionalName: string, appUrl: string) => {
  return getWhatsAppTemplate("meal_plan_ready", { patientName, professionalName, appUrl });
};

export const sendWhatsAppNotification = async (params: {
  patientId: string;
  message: string;
  phone?: string;
}) => {
  let targetPhone = params.phone;

  if (!targetPhone) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", params.patientId)
      .maybeSingle();

    if (error || !profile?.phone) {
      toast.error("Não foi possível encontrar o telefone do paciente.");
      return;
    }
    targetPhone = profile.phone;
  }

  const formattedPhone = formatInternationalWhatsApp(targetPhone);
  const cleanPhone = formattedPhone.replace(/\+/g, "");
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(params.message)}`;
  
  window.open(url, "_blank");
};

/**
 * Hook or helper to centralize WhatsApp notification prompts
 */
export const promptWhatsAppNotification = (params: {
  patientId: string;
  patientName: string;
  professionalName: string;
  type: WhatsAppTemplateType;
  appUrl: string;
  clinicName?: string;
  phone?: string;
}) => {
  const message = getWhatsAppTemplate(params.type, {
    patientName: params.patientName,
    professionalName: params.professionalName,
    appUrl: params.appUrl,
    clinicName: params.clinicName
  });

  toast("Notificar paciente via WhatsApp?", {
    description: "O paciente será informado sobre esta atualização.",
    action: {
      label: "Enviar",
      onClick: () => sendWhatsAppNotification({
        patientId: params.patientId,
        message,
        phone: params.phone
      }),
    },
    duration: 10000,
  });
};
