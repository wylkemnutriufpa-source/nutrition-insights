import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppIntegration {
  id: string;
  professional_id: string;
  provider: string;
  instance_id: string;
  token: string;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppLog {
  id: string;
  professional_id: string;
  patient_id: string | null;
  event_type: string;
  message_body: string;
  delivery_status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

// Templates with variable placeholders
const MESSAGE_TEMPLATES: Record<string, string> = {
  ONBOARDING_RELEASED: "Olá {{patient_name}}! 🎉 Seu onboarding foi liberado por {{professional_name}}. Acesse a plataforma para começar sua jornada de transformação!",
  PLAN_PUBLISHED: "Olá {{patient_name}} 📋 Seu novo plano alimentar já está disponível! Acesse agora para conferir todas as refeições e orientações.",
  DAILY_FOCUS: "Olá {{patient_name}} 👋 Seu foco de hoje é: {{focus_title}}. {{focus_description}}",
  TASK_REMINDER: "Oi {{patient_name}} 💪 Você ainda tem uma tarefa importante pendente hoje: {{task_title}}.",
  LOW_ADHERENCE_ALERT: "Oi {{patient_name}}, percebemos que sua adesão caiu nos últimos dias. Vamos retomar juntos? Cada pequeno passo conta! 💪",
  CHECKIN_REMINDER: "Oi {{patient_name}}, faz alguns dias que não recebemos seu check-in. Como você está? Registre sua evolução para mantermos o acompanhamento! 📊",
  WEEKLY_SUMMARY: "Resumo da sua semana 📊\nChecklist: {{checklist_rate}}%\nContinue assim! 👏",
  NEW_PATIENT: "Novo paciente cadastrado no seu perfil: {{patient_name}}. Acesse a plataforma para revisar e liberar o onboarding.",
};

export function buildMessage(templateCode: string, variables: Record<string, string>): string {
  let template = MESSAGE_TEMPLATES[templateCode] || templateCode;
  for (const [key, value] of Object.entries(variables)) {
    template = template.split(`{{${key}}}`).join(value);
  }
  return template;
}

export async function getIntegration(professionalId: string): Promise<WhatsAppIntegration | null> {
  const { data, error } = await (supabase as any)
    .from("whatsapp_integrations")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as WhatsAppIntegration;
}

export async function saveIntegration(params: {
  professionalId: string;
  instanceId: string;
  token: string;
  phoneNumber?: string;
}) {
  const { data: existing } = await (supabase as any)
    .from("whatsapp_integrations")
    .select("id")
    .eq("professional_id", params.professionalId)
    .maybeSingle();

  if (existing) {
    const { error } = await (supabase as any)
      .from("whatsapp_integrations")
      .update({
        instance_id: params.instanceId,
        token: params.token,
        phone_number: params.phoneNumber || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("professional_id", params.professionalId);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any)
      .from("whatsapp_integrations")
      .insert({
        professional_id: params.professionalId,
        instance_id: params.instanceId,
        token: params.token,
        phone_number: params.phoneNumber || null,
      });
    if (error) throw error;
  }
}

export async function disconnectIntegration(professionalId: string) {
  const { error } = await (supabase as any)
    .from("whatsapp_integrations")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("professional_id", professionalId);
  if (error) throw error;
}

export async function sendWhatsAppMessage(params: {
  patientPhone: string;
  message: string;
  eventType: string;
  patientId?: string;
}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      patient_phone: params.patientPhone,
      message: params.message,
      event_type: params.eventType,
      patient_id: params.patientId,
    },
  });
  if (error) throw error;
  return data;
}

export async function getWhatsAppLogs(professionalId: string, limit = 50): Promise<WhatsAppLog[]> {
  const { data, error } = await (supabase as any)
    .from("whatsapp_logs")
    .select("*")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as WhatsAppLog[];
}
