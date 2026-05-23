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
    const mode: string = body.mode || "specific"; // "specific" or "all_my_patients"

    // SECURITY: generate a cryptographically random temporary password per patient
    const randomStrongPassword = () => {
      const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
      // Mix-in to satisfy complexity policies
      return `Fj!${raw.slice(0, 20)}A9`;
    };

    let idsToReset: string[] = [];

    if (mode === "all_my_patients") {
      // Get all patients linked to this nutritionist
      const { data: patients } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user.id)
        .eq("status", "active");

      idsToReset = (patients || []).map((p: any) => p.patient_id);
    } else {
      if (!targetPatientIds || !Array.isArray(targetPatientIds) || targetPatientIds.length === 0) {
        return new Response(JSON.stringify({ error: "Forneça patient_ids ou use mode: all_my_patients" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // SECURITY: filter to only patients owned by this nutritionist (admins skip the check)
      if (!isAdmin) {
        const { data: owned } = await supabase
          .from("nutritionist_patients")
          .select("patient_id")
          .eq("nutritionist_id", user.id)
          .eq("status", "active")
          .in("patient_id", targetPatientIds);
        idsToReset = (owned || []).map((r: any) => r.patient_id);
      } else {
        idsToReset = targetPatientIds;
      }
    }

    let updated = 0;
    let errors: string[] = [];
    const generated: Array<{ patient_id: string; temp_password: string }> = [];
    const BATCH = 5;

    for (let i = 0; i < idsToReset.length; i += BATCH) {
      const chunk = idsToReset.slice(i, i + BATCH);
      const results = await Promise.all(chunk.map(async (patientId) => {
        try {
          const tempPassword = randomStrongPassword();
          const { error } = await supabase.auth.admin.updateUserById(patientId, {
            password: tempPassword,
          });
          if (error) return { ok: false, err: `${patientId}: ${error.message}` };
          return { ok: true, patient_id: patientId, temp_password: tempPassword };
        } catch (e: any) {
          return { ok: false, err: `${patientId}: ${e.message}` };
        }
      }));

      for (const r of results) {
        if (r.ok) {
          updated++;
          if ((r as any).patient_id) generated.push({ patient_id: (r as any).patient_id, temp_password: (r as any).temp_password });
        } else if (r.err) errors.push(r.err);
      }
    }

    return new Response(
      JSON.stringify({ message: `Senhas resetadas para ${updated} pacientes`, updated, errors, generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
