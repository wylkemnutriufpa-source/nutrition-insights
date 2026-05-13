import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nutriId, signature } = await req.json();
    if (!nutriId || !signature) throw new Error("nutriId and signature are required");

    const secret = Deno.env.get("REGISTRATION_SIGNING_SECRET");
    if (!secret) {
      console.error("[verify-registration-token] REGISTRATION_SIGNING_SECRET is not configured");
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

    const expectedSignatureBuffer = await crypto.subtle.sign(
      "HMAC", key, encoder.encode(nutriId)
    );

    const expectedSignature = Array.from(new Uint8Array(expectedSignatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    // constant-time comparison
    let diff = expectedSignature.length ^ signature.length;
    for (let i = 0; i < Math.min(expectedSignature.length, signature.length); i++) {
      diff |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    const isValid = diff === 0;

    return new Response(
      JSON.stringify({ isValid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
