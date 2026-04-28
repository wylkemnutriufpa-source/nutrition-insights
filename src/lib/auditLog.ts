import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Generate a session-persistent correlation ID
const SESSION_CORRELATION_ID = `fj_sess_${Math.random().toString(36).substring(2, 11)}`;

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
  const finalCorrelationId = correlationId || SESSION_CORRELATION_ID;
  
  supabase
    .rpc("log_audit", {
      _action: action,
      _resource_type: resourceType,
      _resource_id: resourceId ?? null,
      _metadata: (metadata ?? {}) as unknown as Json,
      _correlation_id: finalCorrelationId,
      _status: status
    })
    .then(({ error }) => {
      if (error) {
        console.warn("[audit] Failed to persist log, attempting silent retry...", error.message);
        // Minimal silent retry logic
        setTimeout(async () => {
          try {
            await supabase.rpc("log_audit", {
              _action: action,
              _resource_type: resourceType,
              _resource_id: resourceId ?? null,
              _metadata: { ...metadata, retry: true } as unknown as Json,
              _correlation_id: finalCorrelationId,
              _status: status
            });
          } catch (e) {
            // Silent failure on retry
          }
        }, 2000);
      }
    });
}
}

export function getSessionCorrelationId() {
  return SESSION_CORRELATION_ID;
}

