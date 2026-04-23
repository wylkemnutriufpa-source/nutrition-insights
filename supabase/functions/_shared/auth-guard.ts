/**
 * Shared auth guard helpers for Edge Functions.
 * Deterministic, no LLM, no AI — pure auth validation.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

/**
 * Extract and validate the authenticated user from request headers.
 * Returns the user or throws with a ready-to-send Response.
 */
export async function requireUser(req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized — missing token" }),
      { status: 401, headers: corsHeaders }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://vkrcobprntictsxqmjjl.supabase.co";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error } = await authClient.auth.getUser();

  if (error || !userData?.user?.id) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized — invalid token" }),
      { status: 401, headers: corsHeaders }
    );
  }

  const userId = userData.user.id;
  const email = userData.user.email || "";

  // Fetch roles from user_roles table
  // Use authClient (authenticated as the user) to fetch roles, as Users can view own roles via RLS
  const { data: roleRows, error: roleError } = await authClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roleError) {
    console.error(`[auth-guard] Error fetching roles for user ${userId}:`, roleError);
  }

  const roles = (roleRows || []).map((r: any) => r.role);
  
  // If no roles found via authClient, fallback to serviceClient only if key is available
  if (roles.length === 0) {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceRoleKey) {
      const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { data: serviceRoleRows } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (serviceRoleRows && serviceRoleRows.length > 0) {
        return { id: userId, email, roles: serviceRoleRows.map((r: any) => r.role) };
      }
    }
  }

  return { id: userId, email, roles };
}

/**
 * Require the user has a specific role. Throws 403 if not.
 */
export function requireRole(user: AuthUser, ...allowedRoles: string[]): void {
  const hasRole = user.roles.some((r) => allowedRoles.includes(r));
  if (!hasRole) {
    throw new Response(
      JSON.stringify({
        error: `Forbidden — requires one of: ${allowedRoles.join(", ")}`,
      }),
      { status: 403, headers: corsHeaders }
    );
  }
}

/**
 * Assert that the authenticated user owns the resource or is admin.
 */
export function assertOwnerOrAdmin(
  resourceUserId: string,
  authUser: AuthUser
): void {
  if (resourceUserId === authUser.id) return;
  if (authUser.roles.includes("admin")) return;
  throw new Response(
    JSON.stringify({ error: "Forbidden — not owner" }),
    { status: 403, headers: corsHeaders }
  );
}

/**
 * Assert that the authenticated user is a linked professional for the patient.
 * Uses service role to check nutritionist_patients.
 */
export async function assertLinkedProfessional(
  patientId: string,
  authUser: AuthUser
): Promise<void> {
  if (authUser.roles.includes("admin")) return;

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "https://vkrcobprntictsxqmjjl.supabase.co",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data } = await serviceClient
    .from("nutritionist_patients")
    .select("id")
    .eq("nutritionist_id", authUser.id)
    .eq("patient_id", patientId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!data) {
    throw new Response(
      JSON.stringify({ error: "Forbidden — not linked to this patient" }),
      { status: 403, headers: corsHeaders }
    );
  }
}

/**
 * Helper to mask sensitive data in logs.
 * Masks emails: "user@email.com" → "us***@em***.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  const [domName, ...ext] = domain.split(".");
  return `${local.slice(0, 2)}***@${domName.slice(0, 2)}***.${ext.join(".")}`;
}

/**
 * Sanitize log data — remove tokens, mask emails.
 */
export function sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  const sensitiveKeys = ["token", "password", "secret", "authorization", "apikey", "service_role"];
  for (const key of Object.keys(sanitized)) {
    const lk = key.toLowerCase();
    if (sensitiveKeys.some((s) => lk.includes(s))) {
      sanitized[key] = "[REDACTED]";
    }
    if (lk.includes("email") && typeof sanitized[key] === "string") {
      sanitized[key] = maskEmail(sanitized[key] as string);
    }
  }
  return sanitized;
}
