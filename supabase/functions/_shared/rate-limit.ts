import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Enhanced rate-limiting for Edge Functions using the new rate_limits table.
 */
export async function checkRateLimit(
  endpoint: string,
  clientKey: string,
  maxRequests: number = 30,
  windowSeconds: number = 600
): Promise<{ allowed: boolean; remaining?: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
      p_key: clientKey,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds
    });

    if (error) {
      console.error("[RateLimit] Error checking limit:", error);
      return { allowed: true }; // Fail open if infrastructure fails
    }

    if (!allowed) {
      // Log security event for blocking
      await supabase.rpc("log_security_event", {
        p_event_type: "rate_limit_blocked",
        p_severity: "warning",
        p_message: `Rate limit exceeded for endpoint ${endpoint}`,
        p_metadata: { clientKey, endpoint, maxRequests }
      });
    }

    return { allowed: !!allowed };
  } catch (err) {
    console.error("[RateLimit] Catch error:", err);
    return { allowed: true };
  }
}

export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({ 
      error: "Muitas requisições. Por favor, tente novamente mais tarde.",
      code: "TOO_MANY_REQUESTS"
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
