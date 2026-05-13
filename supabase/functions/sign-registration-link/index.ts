import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, requireRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await requireUser(req).catch((r) => { throw r; });
    requireRole(caller, "nutritionist", "admin");

    const { nutriId } = await req.json();
    if (!nutriId) throw new Error("nutriId is required");

    // Nutritionists may only sign their own ID; admins may sign any
    if (!caller.roles.includes("admin") && nutriId !== caller.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden — can only sign your own nutritionist id" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secret = Deno.env.get("REGISTRATION_SIGNING_SECRET");
    if (!secret) {
      console.error("[sign-registration-link] REGISTRATION_SIGNING_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Signing secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(nutriId));
    const hashHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    return new Response(
      JSON.stringify({ signature: hashHex }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    if (e instanceof Response) return e;
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
