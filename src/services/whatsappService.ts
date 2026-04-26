import { supabase } from "@/integrations/supabase/client";
import { validateWhatsApp, normalizeWhatsApp } from "@/utils/whatsapp";


export interface WhatsAppIntegration {
  id: string;
  professional_id: string;
  provider: string;
  instance_id: string;
  phone_number: string | null;
  is_active: boolean;
  connection_validated_at: string | null;
  last_error: string | null;
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

/**
 * Get integration using the SAFE view (no token exposed)
 */
export async function getIntegration(professionalId: string): Promise<WhatsAppIntegration | null> {
  const { data, error } = await (supabase as any)
    .from("whatsapp_integrations")
    .select("id, professional_id, provider, instance_id, phone_number, is_active, connection_validated_at, last_error, created_at, updated_at")
    .eq("professional_id", professionalId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as WhatsAppIntegration;
}

/**
 * Validate and save integration via secure edge function (token never touches frontend state)
 */
export async function validateAndSaveIntegration(params: {
  instanceId: string;
  token: string;
  phoneNumber?: string;
}): Promise<{ success: boolean; validated: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("whatsapp-validate", {
    body: {
      action: "save",
      instance_id: params.instanceId,
      api_token: params.token,
      phone_number: params.phoneNumber || null,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Validate Z-API credentials without saving
 */
export async function validateZApiCredentials(params: {
  instanceId: string;
  token: string;
}): Promise<{ valid: boolean; connected: boolean; phone?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("whatsapp-validate", {
    body: {
      action: "validate",
      instance_id: params.instanceId,
      api_token: params.token,
    },
  });
  if (error) throw error;
  return data;
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

/**
 * Normalize Brazilian phone number: ensures DDI 55, removes masks
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withDdi = digits.startsWith("55") ? digits : `55${digits}`;
  if (withDdi.length < 12 || withDdi.length > 13) return null;
  return withDdi;
}
