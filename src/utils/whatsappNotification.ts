import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatInternationalWhatsApp } from "./whatsapp";

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

export const getMealPlanReadyMessage = (patientName: string, professionalName: string, appUrl: string) => {
  return `Olá ${patientName.split(" ")[0]}! Aqui é o(a) nutricionista ${professionalName}. Seu plano alimentar está pronto! 🎉\n\nVocê pode acessá-lo agora pelo link: ${appUrl}\n\nQualquer dúvida, estou à disposição!`;
};
