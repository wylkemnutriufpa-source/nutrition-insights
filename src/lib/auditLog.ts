import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Log an auditable action for LGPD compliance.
 * Fire-and-forget — never blocks the UI.
 */
export function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string | null,
  metadata?: Record<string, string | number | boolean | null>
) {
  supabase
    .rpc("log_audit", {
      _action: action,
      _resource_type: resourceType,
      _resource_id: resourceId ?? null,
      _metadata: (metadata ?? {}) as unknown as Json,
    })
    .then(({ error }) => {
      if (error) console.warn("[audit]", error.message);
    });
}
