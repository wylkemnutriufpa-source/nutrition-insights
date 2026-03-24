import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate caller via JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
    
    if (authError || !caller) {
      console.log("Auth failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });
    }

    // Check caller is nutritionist or admin
    const { data: callerRole } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).single();
    if (!callerRole || (callerRole.role !== "nutritionist" && callerRole.role !== "admin")) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: corsHeaders });
    }

    const { user_id, new_password } = await req.json();
    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: "user_id e new_password obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    const { error } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
