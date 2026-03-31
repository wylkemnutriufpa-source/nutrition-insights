import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const realAccountId = "38b17a2b-2ac0-4df0-8d12-ec602e3ab704";
    const correctEmail = "thaiane.quelci@hotmail.com";

    const duplicates = [
      "964f6625-25af-4d78-8c81-9d249703a5c7",
      "75e2e97b-80d5-4f4f-8cb4-b7cdb6ca962e",
      "97b3d1bc-911d-4981-89c6-8a3cbd3c8144",
    ];

    const results: any[] = [];

    // Step 1: Remove duplicate patient links and profiles
    for (const dupId of duplicates) {
      const { error: npErr } = await adminClient
        .from("nutritionist_patients")
        .delete()
        .eq("patient_id", dupId);
      results.push({ step: "remove_patient_link", userId: dupId.slice(0,8), error: npErr?.message || null });

      const { error: profErr } = await adminClient
        .from("profiles")
        .delete()
        .eq("user_id", dupId);
      results.push({ step: "remove_profile", userId: dupId.slice(0,8), error: profErr?.message || null });
    }

    // Step 2: Delete duplicate auth accounts
    for (const dupId of duplicates) {
      const { error: delErr } = await adminClient.auth.admin.deleteUser(dupId);
      results.push({ step: "delete_auth_user", userId: dupId.slice(0,8), error: delErr?.message || null });
    }

    // Step 3: Update real account email
    const { error: emailErr } = await adminClient.auth.admin.updateUserById(realAccountId, {
      email: correctEmail,
      email_confirm: true,
    });
    results.push({ step: "update_email", newEmail: correctEmail, error: emailErr?.message || null });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
