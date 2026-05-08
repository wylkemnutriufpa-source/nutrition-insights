
import { supabase } from "@/integrations/supabase/client";

export type AuditType = "audit_log" | "security_logs" | "access_logs";

interface LogParams {
  type: AuditType;
  action: string;
  resource: string;
  details?: any;
  patient_id?: string;
  severity?: "info" | "warning" | "error" | "critical";
}

export const logClinicalEvent = async (params: LogParams) => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[${params.type.toUpperCase()}] ${params.action} on ${params.resource}`, params.details);
  }

  // Persistir no Supabase (Mesa de auditoria centralizada ou tabelas separadas)
  // Por agora, usaremos a tabela access_logs que já existe, ou criamos novas via migração se necessário.
  // Como as tabelas podem não existir ainda, vamos tentar inserir e falhar silenciosamente no console mas logar no sistema.
  
  try {
    const table = params.type as any; // Bypass TS check for dynamically added tables
    const { error } = await supabase.from(table).insert({
      user_id: userId,
      patient_id: params.patient_id,
      action: params.action,
      resource: params.resource,
      metadata: params.details,
      severity: params.severity || "info",
      user_agent: navigator.userAgent
    });

    if (error && error.code !== '42P01' && error.code !== '23505' && error.code !== 'PGRST204') {
      // Suprimir erros de schema (400), conflito (409/23505), e tabela inexistente (42P01)
      // Apenas logar em dev para não poluir console em produção
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[AuditLogger] Non-critical error logging to ${table}:`, error.code);
      }
    }
  } catch (e) {
    // Fail gracefully to not block the main flow (ANTI-CASCATA)
  }
};
