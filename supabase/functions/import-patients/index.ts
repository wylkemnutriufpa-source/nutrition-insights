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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated and is a nutritionist or admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map((r: any) => r.role) || [];
    if (!userRoles.includes("nutritionist") && !userRoles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { patients } = await req.json();

    if (!patients || !Array.isArray(patients)) {
      return new Response(JSON.stringify({ error: "Invalid patients data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const patient of patients) {
      try {
        const email = patient.email?.trim();
        const fullName = patient.name?.trim();

        if (!email || !fullName) {
          results.skipped++;
          continue;
        }

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u: any) => u.email === email.toLowerCase()
        );

        let patientUserId: string;

        if (existingUser) {
          patientUserId = existingUser.id;
        } else {
          // Create user with a random password (patient will need to reset)
          const tempPassword = `FJ${Math.random().toString(36).slice(2, 10)}!${Date.now().toString(36)}`;
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: email.toLowerCase(),
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });

          if (createError) {
            results.errors.push(`${email}: ${createError.message}`);
            continue;
          }

          patientUserId = newUser.user.id;
        }

        // Add patient role
        await supabase
          .from("user_roles")
          .upsert({ user_id: patientUserId, role: "patient" }, { onConflict: "user_id,role" });

        // Ensure profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", patientUserId)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from("profiles").insert({
            user_id: patientUserId,
            full_name: fullName,
          });
        }

        // Link to nutritionist (check first to avoid duplicates)
        const nutritionistId = user.id;
        const { data: existingLink } = await supabase
          .from("nutritionist_patients")
          .select("id")
          .eq("nutritionist_id", nutritionistId)
          .eq("patient_id", patientUserId)
          .maybeSingle();

        if (!existingLink) {
          await supabase.from("nutritionist_patients").insert({
            nutritionist_id: nutritionistId,
            patient_id: patientUserId,
            status: "active",
          });
        }

        results.created++;
      } catch (err: any) {
        results.errors.push(`${patient.email || patient.name}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
