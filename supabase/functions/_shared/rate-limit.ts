import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Shared rate-limiting utility for Edge Functions.
 * Uses the edge_function_rate_limits table.
 *
 * @param functionName - Name of the edge function
 * @param clientKey - Unique key for the client (user_id, IP, etc.)
 * @param maxRequests - Max requests allowed in the window
 * @param windowMinutes - Time window in minutes (default 15)
 * @returns { allowed: boolean, remaining: number }
 */
export async function checkRateLimit(
  functionName: string,
  clientKey: string,
  maxRequests: number = 30,
  windowMinutes: number = 15
): Promise<{ allowed: boolean; remaining: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://vkrcobprntictsxqmjjl.supabase.co";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const client = createClient(supabaseUrl, supabaseKey);

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Clean old entries
  await client
    .from("edge_function_rate_limits")
    .delete()
    .eq("function_name", functionName)
    .eq("client_key", clientKey)
    .lt("window_start", windowStart);

  // Get current count
  const { data: existing } = await client
    .from("edge_function_rate_limits")
    .select("id, request_count")
    .eq("function_name", functionName)
    .eq("client_key", clientKey)
    .gte("window_start", windowStart)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const newCount = existing.request_count + 1;
    if (newCount > maxRequests) {
      // Log abuse event
      await client.from("security_events").insert({
        event_type: "rate_limit_exceeded",
        user_id: clientKey.length === 36 ? clientKey : null,
        function_name: functionName,
        metadata: { request_count: newCount, window_minutes: windowMinutes },
      }).then(() => {});
      return { allowed: false, remaining: 0 };
    }
    await client
      .from("edge_function_rate_limits")
      .update({ request_count: newCount })
      .eq("id", existing.id);
    return { allowed: true, remaining: maxRequests - newCount };
  }

  // Create new window
  await client.from("edge_function_rate_limits").insert({
    function_name: functionName,
    client_key: clientKey,
    request_count: 1,
    window_start: new Date().toISOString(),
  });

  return { allowed: true, remaining: maxRequests - 1 };
}

/**
 * Returns a 429 response if rate limit is exceeded.
 */
export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
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
