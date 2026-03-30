import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  async function resolveTenantForUser(sb: any, uid: string): Promise<string | null> {
    const { data } = await sb.from("user_tenants").select("tenant_id").eq("user_id", uid).limit(1).maybeSingle();
    return data?.tenant_id || null;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Invalid session");

    // Rate limit: 10 requests per 15 minutes
    const rl = await checkRateLimit("invite-patient", caller.id, 10, 15);
    if (!rl.allowed) return rateLimitResponse();

    // Verify caller is a professional
    const { data: callerRoles } = await callerClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isPro = callerRoles?.some((r: any) => ["nutritionist", "personal_trainer", "admin"].includes(r.role));
    if (!isPro) throw new Error("Only professionals can invite patients");

    const { name, email, phone, method, password } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!name || !normalizedEmail) throw new Error("Name and email required");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let patientId: string;

    // Try to create user first
    const finalPassword = method === "password" && password
      ? password
      : "Fit@2026!";

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name: name, role: "patient" },
    });

    if (createError) {
      // If user already exists, find them and link
      if (createError.message?.includes("already been registered") || (createError as any).code === "email_exists") {
        console.log(`[invite-patient] User already exists, linking...`);
        
        // Find user by email using admin API
        const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1, page: 1 });
        // listUsers doesn't filter by email, use RPC instead
        const { data: foundId } = await adminClient.rpc("find_patient_by_email", { _email: normalizedEmail });
        
        if (foundId) {
          patientId = foundId;
        } else {
          // User exists in auth but not found via RPC - try getUserByEmail approach
          // Search through admin API
          const { data: { users } } = await adminClient.auth.admin.listUsers();
          const existingUser = users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
          if (!existingUser) throw new Error("Usuário existe mas não foi possível localizar. Tente via importação.");
          patientId = existingUser.id;
        }

        // ALWAYS reset password for existing users to ensure they can login
        const passwordToSet = (method === "password" && password) ? password : finalPassword;
        await adminClient.auth.admin.updateUserById(patientId, { 
          password: passwordToSet,
          email_confirm: true,
        });
        console.log(`[invite-patient] Password reset for existing user ${patientId}`);
      } else {
        throw createError;
      }
    } else {
      patientId = newUser.user.id;
    }

    // Upsert profile
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("user_id", patientId)
      .maybeSingle();

    if (existingProfile) {
      await adminClient.from("profiles").update({
        full_name: name,
        phone: phone || null,
      }).eq("user_id", patientId);
    } else {
      const callerTenant = await resolveTenantForUser(adminClient, caller.id);
      await adminClient.from("profiles").insert({
        user_id: patientId,
        full_name: name,
        phone: phone || null,
        tenant_id: callerTenant,
      });
    }

    // Link to nutritionist
    const callerTenantLink = await resolveTenantForUser(adminClient, caller.id);
    await adminClient.from("nutritionist_patients").upsert({
      nutritionist_id: caller.id,
      patient_id: patientId,
      status: "active",
      journey_status: "awaiting_payment",
      tenant_id: callerTenantLink,
    }, { onConflict: "nutritionist_id,patient_id" });

    // Assign patient role
    await adminClient.from("user_roles").upsert({
      user_id: patientId,
      role: "patient",
    }, { onConflict: "user_id,role" });

    // Ensure patient is in same tenant
    if (callerTenantLink) {
      await adminClient.from("user_tenants").upsert({
        user_id: patientId,
        tenant_id: callerTenantLink,
        role: "patient",
      }, { onConflict: "user_id,tenant_id" }).then(() => {});
    }

    // 3) Create in-app notification for the patient about their invite
    await adminClient.from("notifications").insert({
      user_id: patientId,
      title: "Bem-vindo ao FitJourney! 🎉",
      message: `Seu acesso foi criado por ${name ? "seu nutricionista" : "um profissional"}. Aguarde a confirmação do pagamento para iniciar seu acompanhamento.`,
      type: "info",
      target_route: "/patient-dashboard",
      tenant_id: callerTenantLink,
    });

    // Send magic link if requested
    if (method === "magic_link") {
      try {
        await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
          options: { redirectTo: `${req.headers.get("origin") || "https://fijourney.lovable.app"}/` },
        });
      } catch (e) {
        console.log("[invite-patient] Magic link generation failed, patient can use forgot password:", e);
      }
    }

    return new Response(JSON.stringify({ success: true, patient_id: patientId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("invite-patient error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
