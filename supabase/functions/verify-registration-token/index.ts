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

    const secret = Deno.env.get("REGISTRATION_SIGNING_SECRET") || "fallback-secret-for-dev";
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const expectedSignatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(nutriId)
    );
    
    const hashArray = Array.from(new Uint8Array(expectedSignatureBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const isValid = signature === expectedSignature;

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
