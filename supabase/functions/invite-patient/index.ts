import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // Verify caller is a professional
    const { data: callerRoles } = await callerClient.from("user_roles").select("role").eq("user_id", caller.id);
    const isPro = callerRoles?.some((r: any) => ["nutritionist", "personal_trainer", "admin"].includes(r.role));
    if (!isPro) throw new Error("Only professionals can invite patients");

    const { name, email, phone, method, password } = await req.json();
    if (!name || !email) throw new Error("Name and email required");

    // Use admin client to create user without affecting caller's session
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === email);

    let patientId: string;

    if (existing) {
      patientId = existing.id;
    } else {
      const finalPassword = method === "password" && password
        ? password
        : `FJ_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true,
        user_metadata: { full_name: name, role: "patient" },
      });

      if (createError) throw createError;
      patientId = newUser.user.id;
    }

    // Upsert profile
    await adminClient.from("profiles").upsert({
      user_id: patientId,
      full_name: name,
      phone: phone || null,
      journey_status: "invited",
    }, { onConflict: "user_id" });

    // Link to nutritionist
    await adminClient.from("nutritionist_patients").upsert({
      nutritionist_id: caller.id,
      patient_id: patientId,
      status: "active",
    }, { onConflict: "nutritionist_id,patient_id" });

    // Assign patient role
    await adminClient.from("user_roles").upsert({
      user_id: patientId,
      role: "patient",
    }, { onConflict: "user_id,role" });

    // Send magic link if requested
    if (method === "magic_link") {
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${req.headers.get("origin") || "https://fijourney.lovable.app"}/` },
      });
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
