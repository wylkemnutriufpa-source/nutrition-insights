import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Error("Not authenticated");

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError) throw new Error("Invalid session");
    if (!caller) throw new Error("Invalid session");

    // Verify caller is admin or nutritionist
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerRoles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isAuthorized = callerRoles?.some((r: any) => ["admin", "nutritionist", "personal"].includes(r.role));
    if (!isAuthorized) throw new Error("Unauthorized: only professionals can update user identity");

    const { target_user_id, action, payload } = await req.json();
    if (!target_user_id || !action) throw new Error("target_user_id and action required");

    const auditMeta: Record<string, unknown> = { action, target_user_id, performed_by: caller.id };
    let result: Record<string, unknown> = {};

    // Resolve tenant for caller
    const { data: callerTenantData } = await adminClient.from("user_tenants").select("tenant_id").eq("user_id", caller.id).limit(1).maybeSingle();
    const callerTenant = callerTenantData?.tenant_id || null;

    switch (action) {
      case "update_name": {
        if (!payload?.name) throw new Error("name required");
        await adminClient.from("profiles").update({ full_name: payload.name }).eq("user_id", target_user_id);
        await adminClient.auth.admin.updateUserById(target_user_id, {
          user_metadata: { full_name: payload.name },
        });
        auditMeta.new_name = payload.name;
        result = { updated: "name" };
        break;
      }

      case "update_email": {
        if (!payload?.email) throw new Error("email required");
        const normalizedEmail = String(payload.email).trim().toLowerCase();
        if (!normalizedEmail) throw new Error("email required");
        const { error: emailErr } = await adminClient.auth.admin.updateUserById(target_user_id, {
          email: normalizedEmail,
          email_confirm: true,
        });
        if (emailErr) throw new Error(`Email update failed: ${emailErr.message}`);
        auditMeta.new_email = normalizedEmail;
        result = { updated: "email" };
        break;
      }

      case "update_phone": {
        if (!payload?.phone && payload?.phone !== "") throw new Error("phone required");
        await adminClient.from("profiles").update({ phone: payload.phone || null }).eq("user_id", target_user_id);
        auditMeta.new_phone = payload.phone;
        result = { updated: "phone" };
        break;
      }

      case "reset_password": {
        const newPassword = payload?.password || "Fit@2026!";
        const { error: pwErr } = await adminClient.auth.admin.updateUserById(target_user_id, {
          password: newPassword,
        });
        if (pwErr) throw new Error(`Password reset failed: ${pwErr.message}`);
        auditMeta.password_reset = true;
        result = { updated: "password" };
        break;
      }

      case "resend_invite": {
        const { data: profile } = await adminClient.from("profiles").select("full_name").eq("user_id", target_user_id).maybeSingle();
        const { data: userData } = await adminClient.auth.admin.getUserById(target_user_id);
        if (!userData?.user?.email) throw new Error("User email not found");

        try {
          await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: userData.user.email,
            options: { redirectTo: `${req.headers.get("origin") || "https://fijourney.lovable.app"}/` },
          });
        } catch (_) {
          // Magic link may fail, but we notify anyway
        }

        await adminClient.from("notifications").insert({
          user_id: target_user_id,
          title: "Acesso reenviado 🔑",
          message: "Seu acesso foi reenviado pelo profissional. Verifique seu email.",
          type: "info",
          target_route: "/",
        });

        auditMeta.resend = true;
        result = { updated: "invite_resent" };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Audit log
    await adminClient.from("audit_logs").insert({
      user_id: caller.id,
      action: `admin_identity_${action}`,
      resource_type: "user",
      resource_id: target_user_id,
      metadata: auditMeta,
    });

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("admin-update-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
