import { supabase } from "@/integrations/supabase/client";

/**
 * Log an auditable action for LGPD compliance.
 * Fire-and-forget — never blocks the UI.
 */
export function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string | null,
  metadata?: Record<string, unknown>
) {
  supabase
    .rpc("log_audit", {
      _action: action,
      _resource_type: resourceType,
      _resource_id: resourceId ?? null,
      _metadata: metadata ?? {},
    })
    .then(({ error }) => {
      if (error) console.warn("[audit]", error.message);
    });
}
