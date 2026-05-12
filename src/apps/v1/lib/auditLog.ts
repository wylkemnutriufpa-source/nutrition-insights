import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Generate a session-persistent correlation ID
const SESSION_CORRELATION_ID = `fj_sess_${Math.random().toString(36).substring(2, 11)}`;

/**
 * Generates a granular request-specific correlation ID linked to parent.
 */
export function generateRequestCorrelationId() {
  return `${SESSION_CORRELATION_ID}_req_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Log an auditable action for LGPD compliance and production tracing.
 * Fire-and-forget — never blocks the UI.
 */
export function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string | null,
  metadata?: Record<string, string | number | boolean | null>,
  status: 'success' | 'error' | 'blocked' = 'success',
  correlationId?: string
) {
  const finalCorrelationId = correlationId || generateRequestCorrelationId();
  
  // Enriquecimento automático de metadados clínicos
  const enrichedMetadata = {
    ...metadata,
    engine_version: "4.0.0",
    client_timestamp: new Date().toISOString(),
    platform: "web-clinical-admin"
  };

  supabase
    .rpc("log_audit", {
      _action: action,
      _resource_type: resourceType,
      _resource_id: resourceId ?? null,
      _metadata: enrichedMetadata as unknown as Json,
      _correlation_id: finalCorrelationId,
      _status: status,
      _parent_correlation_id: SESSION_CORRELATION_ID
    })
    .then(({ error }) => {
      if (error) {
        console.warn("[audit] Failed to persist log", error.message);
      }
    });

  // Alerta de Threshold (Simulação de monitoramento)
  if (status === 'error' && action.includes('generation')) {
    console.error(`[THRESHOLD ALERT] Falha crítica na geração clínica do paciente ${resourceId}`);
    // Aqui seria disparado o alerta para Slack/Edge Function se necessário
  }
}

export function getSessionCorrelationId() {
  return SESSION_CORRELATION_ID;
}


