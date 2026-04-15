/**
 * ⚠️ DEPRECATED — Biquini Branco Meal Plan Generator
 * 
 * Este endpoint foi deprecado na v8.0.0-unified.
 * Todas as gerações de plano alimentar agora passam pelo motor unificado:
 * `generate-meal-plan` com strategy = "bikini_protocol"
 * 
 * Este wrapper redireciona chamadas para o motor unificado automaticamente.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const authHeader = req.headers.get("Authorization") || "";

    console.warn("[generate-bb-meal-plan] DEPRECATED: Redirecting to unified generate-meal-plan with bikini_protocol strategy");

    // Forward to unified engine with bikini_protocol strategy
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Map BB-specific params to unified engine format
    const unifiedBody = {
      ...body,
      strategy: "bikini_protocol",
      // Preserve BB-specific fields
      bb_phase: body.phase || body.bb_phase || 1,
      // Mark as redirected for observability
      _redirected_from: "generate-bb-meal-plan",
      _redirect_version: "8.0.0-unified",
    };

    const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
      body: unifiedBody,
    });

    if (error) {
      console.error("[generate-bb-meal-plan] Redirect error:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ...data,
        _deprecated: true,
        _deprecation_notice: "Este endpoint será removido. Use generate-meal-plan com strategy='bikini_protocol'.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Deprecated": "true",
          "X-Redirect-To": "generate-meal-plan",
        },
      }
    );
  } catch (err) {
    console.error("[generate-bb-meal-plan] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno no redirecionamento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
