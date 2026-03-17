import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is nutritionist/personal/admin
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (callerRoles || []).map((r: any) => r.role);
    if (!roles.includes("nutritionist") && !roles.includes("personal") && !roles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription - must be premium
    const { data: subData } = await supabaseAdmin
      .from("subscribers")
      .select("subscribed, subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle();

    const tier = subData?.subscription_tier || "basic";
    const maxByTier: Record<string, number> = { basic: 0, profissional: 2, premium: 10, enterprise: 999 };
    const maxMembers = roles.includes("admin") ? 999 : (maxByTier[tier] || 0);

    if (maxMembers === 0) {
      return new Response(JSON.stringify({ error: "Seu plano não permite equipe clínica. Faça upgrade para Premium." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check current team size
    const { count: currentCount } = await supabaseAdmin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("head_professional_id", user.id);

    if ((currentCount || 0) >= maxMembers) {
      return new Response(JSON.stringify({ error: `Limite de ${maxMembers} funcionários atingido. Faça upgrade do plano.` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, display_name } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "E-mail é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user by email
    const { data: { users: foundUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = (foundUsers || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado. O funcionário precisa ter uma conta criada primeiro." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-add
    if (targetUser.id === user.id) {
      return new Response(JSON.stringify({ error: "Não é possível adicionar você mesmo à equipe." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert team member
    const { data: member, error: insertError } = await supabaseAdmin
      .from("team_members")
      .insert({
        head_professional_id: user.id,
        user_id: targetUser.id,
        display_name: display_name || targetUser.user_metadata?.full_name || email,
        role: "employee_clinical",
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ error: "Este usuário já faz parte da sua equipe." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw insertError;
    }

    // Log activity
    await supabaseAdmin.rpc("log_team_activity", {
      _head_professional_id: user.id,
      _team_member_id: member.id,
      _action: "member_added",
      _resource_type: "team_member",
      _resource_id: member.id,
      _metadata: { email, display_name: display_name || "" },
    });

    return new Response(JSON.stringify({ success: true, member }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("team-member-add error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
