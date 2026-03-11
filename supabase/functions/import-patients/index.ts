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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[import-patients] mode:", body.mode, "patients count:", body.patients?.length);

    // --- CHECK MODE: return which emails already exist ---
    if (body.mode === "check") {
      const emails: string[] = (body.emails || []).map((e: string) => e.trim().toLowerCase());
      
      // Query existing users by email using RPC or direct query
      const { data: existingUsers } = await supabase
        .rpc("find_existing_patient_emails", { _emails: emails, _nutritionist_id: user.id });
      
      return new Response(JSON.stringify({ 
        existing: existingUsers || [] 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- IMPORT MODE ---
    const { patients } = body;

    if (!patients || !Array.isArray(patients)) {
      return new Response(JSON.stringify({ error: "Invalid patients data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const patient of patients) {
      try {
        const email = patient.email?.trim()?.toLowerCase();
        const fullName = patient.name?.trim();

        if (!email || !fullName) {
          results.skipped++;
          continue;
        }

        // Use the create_patient_account RPC which handles deduplication
        // and sets all token fields to '' to avoid NULL scan errors
        const { data: patientUserId, error: rpcError } = await supabase
          .rpc("create_patient_account", {
            _email: email,
            _full_name: fullName,
            _password: "123456",
          });

        if (rpcError) {
          // If RPC fails, try direct approach
          console.log(`RPC failed for ${email}: ${rpcError.message}, trying direct approach`);
          
          // Check if user exists by querying auth.users via service role
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("full_name", fullName)
            .limit(1);

          // Look up by email using the existing function
          const { data: foundId } = await supabase.rpc("find_patient_by_email", { _email: email });

          let patientId = foundId;

          if (!patientId) {
            // Create via admin API
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
              email,
              password: "123456",
              email_confirm: true,
              user_metadata: { full_name: fullName },
            });

            if (createError) {
              results.errors.push(`${email}: ${createError.message}`);
              continue;
            }

            patientId = newUser.user.id;

            // Fix NULL token fields immediately
            await supabase.rpc("fix_user_null_tokens", { _user_id: patientId });
          }

          // Ensure role
          await supabase
            .from("user_roles")
            .upsert({ user_id: patientId, role: "patient" }, { onConflict: "user_id,role" });

          // Ensure profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", patientId)
            .maybeSingle();

          if (!profile) {
            await supabase.from("profiles").insert({ user_id: patientId, full_name: fullName });
          }

          // Link to nutritionist
          await supabase
            .from("nutritionist_patients")
            .upsert(
              { nutritionist_id: user.id, patient_id: patientId, status: "active" },
              { onConflict: "nutritionist_id,patient_id" }
            );

          results.created++;
          continue;
        }

        // RPC succeeded — link to nutritionist
        if (patientUserId) {
          await supabase
            .from("nutritionist_patients")
            .upsert(
              { nutritionist_id: user.id, patient_id: patientUserId, status: "active" },
              { onConflict: "nutritionist_id,patient_id" }
            );

          // Ensure profile name is set
          await supabase
            .from("profiles")
            .update({ full_name: fullName })
            .eq("user_id", patientUserId)
            .is("full_name", null);
        }

        results.created++;
      } catch (err: any) {
        results.errors.push(`${patient.email || patient.name}: ${err.message}`);
      }
    }

    // Fix any remaining NULL tokens for all users
    await supabase.rpc("fix_all_null_tokens");

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
