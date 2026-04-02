/**
 * LLM Gate — Verifica se IA LLM está habilitada via feature_flags (controle admin)
 * Somente admins podem ativar/desativar. Profissionais e pacientes herdam a permissão.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let cachedResult: { allowed: boolean; checkedAt: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute cache

export async function isLLMEnabled(): Promise<boolean> {
  // Use cache to avoid repeated DB calls
  if (cachedResult && Date.now() - cachedResult.checkedAt < CACHE_TTL) {
    return cachedResult.allowed;
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "llm_global_enabled")
      .maybeSingle();

    const allowed = error ? false : (data?.enabled ?? false);
    cachedResult = { allowed, checkedAt: Date.now() };
    return allowed;
  } catch (e) {
    console.error("[LLM-Gate] Error checking flag:", e);
    // Fail closed — if we can't check, block LLM
    return false;
  }
}

export function llmBlockedResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "llm_disabled",
      message: "IA LLM está desativada pelo administrador. Contate o admin para habilitar.",
    }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
