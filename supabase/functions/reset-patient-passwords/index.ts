import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated and has admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isNutri } = await supabase.rpc("has_role", { _user_id: user.id, _role: "nutritionist" });
    if (!isAdmin && !isNutri) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetPatientIds: string[] | undefined = body.patient_ids;

    // If specific patient IDs provided, reset only those; otherwise reject mass reset
    if (!targetPatientIds || !Array.isArray(targetPatientIds) || targetPatientIds.length === 0) {
      return new Response(JSON.stringify({ error: "Forneça patient_ids específicos. Reset em massa não é permitido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit batch size
    if (targetPatientIds.length > 50) {
      return new Response(JSON.stringify({ error: "Máximo de 50 pacientes por vez." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let errors: string[] = [];

    for (const patientId of targetPatientIds) {
      // Verify the target is actually a patient
      const { data: roleCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", patientId)
        .eq("role", "patient")
        .maybeSingle();

      if (!roleCheck) {
        errors.push(`${patientId}: not a patient`);
        continue;
      }

      // Generate a unique random password per patient
      const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);

      const { error } = await supabase.auth.admin.updateUserById(patientId, {
        password: randomPassword,
      });
      if (error) {
        errors.push(`${patientId}: ${error.message}`);
      } else {
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Senhas resetadas para ${updated} pacientes`, updated, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
