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

    // Verify caller is admin or service role
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !authHeader.includes("service_role")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) throw new Error("Não autenticado");

      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      const { data: isNutri } = await supabase.rpc("has_role", { _user_id: user.id, _role: "nutritionist" });
      if (!isAdmin && !isNutri) throw new Error("Sem permissão");
    }

    const defaultPassword = "123456";

    // Get all patients
    const { data: patientRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "patient");

    if (!patientRoles || patientRoles.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum paciente encontrado", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let errors: string[] = [];

    for (const pr of patientRoles) {
      const { error } = await supabase.auth.admin.updateUserById(pr.user_id, {
        password: defaultPassword,
      });
      if (error) {
        errors.push(`${pr.user_id}: ${error.message}`);
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
