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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: roleCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Get cost configuration
    const { data: configRows } = await supabase
      .from("operational_cost_configuration")
      .select("*")
      .limit(1);
    
    const config = configRows?.[0] || {
      cost_per_ai_call_usd: 0.003,
      cost_per_100mb_storage_usd: 0.025,
      cost_per_1000_notifications_usd: 1.0,
      infrastructure_base_cost_usd: 20.0,
      stripe_fee_percent: 2.9,
    };

    // Get metrics from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: metrics } = await supabase
      .from("operational_cost_metrics")
      .select("*")
      .gte("metric_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("metric_date", { ascending: false });

    // Get current active patients count
    const { count: activePatients } = await supabase
      .from("nutritionist_patients")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get AI usage from last 30 days
    const { data: aiUsage } = await supabase
      .from("ai_usage_tracking")
      .select("feature_key")
      .gte("used_at", thirtyDaysAgo.toISOString());

    const aiCounts = {
      meal_analysis: 0,
      body_projection: 0,
      recipe_generation: 0,
      reports: 0,
    };
    (aiUsage || []).forEach((r: any) => {
      if (r.feature_key?.includes("meal")) aiCounts.meal_analysis++;
      else if (r.feature_key?.includes("body") || r.feature_key?.includes("projection")) aiCounts.body_projection++;
      else if (r.feature_key?.includes("recipe")) aiCounts.recipe_generation++;
      else aiCounts.reports++;
    });

    const totalAiCalls = aiCounts.meal_analysis + aiCounts.body_projection + aiCounts.recipe_generation + aiCounts.reports;
    const currentPatients = activePatients || 0;

    // Calculate per-patient averages (monthly)
    const aiCallsPerPatient = currentPatients > 0 ? totalAiCalls / currentPatients : 0;
    const storagePerPatient = currentPatients > 0 ? 5 : 0; // estimate 5MB per patient
    const notificationsPerPatient = currentPatients > 0 ? 10 : 0; // estimate 10/month

    // Projection function
    function projectCost(patientCount: number) {
      const projectedAiCalls = Math.round(aiCallsPerPatient * patientCount);
      const projectedStorageMb = storagePerPatient * patientCount;
      const projectedNotifications = notificationsPerPatient * patientCount;

      const costAi = projectedAiCalls * Number(config.cost_per_ai_call_usd);
      const costStorage = (projectedStorageMb / 100) * Number(config.cost_per_100mb_storage_usd);
      const costNotifications = (projectedNotifications / 1000) * Number(config.cost_per_1000_notifications_usd);
      const costInfra = Number(config.infrastructure_base_cost_usd);

      const totalCost = costInfra + costAi + costStorage + costNotifications;
      const costPerPatient = patientCount > 0 ? totalCost / patientCount : 0;

      let riskLevel = "low";
      if (totalCost > 500) riskLevel = "high";
      else if (totalCost > 150) riskLevel = "medium";

      return {
        patient_count: patientCount,
        total_cost: Math.round(totalCost * 100) / 100,
        cost_per_patient: Math.round(costPerPatient * 100) / 100,
        risk_level: riskLevel,
        breakdown: {
          infrastructure: Math.round(costInfra * 100) / 100,
          ai: Math.round(costAi * 100) / 100,
          storage: Math.round(costStorage * 100) / 100,
          notifications: Math.round(costNotifications * 100) / 100,
        },
      };
    }

    const currentProjection = projectCost(currentPatients);
    const projections = [
      projectCost(200),
      projectCost(500),
      projectCost(1000),
      projectCost(2000),
    ];

    // Cost distribution for current scenario
    const currentTotal = currentProjection.total_cost || 1;
    const distribution = {
      ai_percent: Math.round((currentProjection.breakdown.ai / currentTotal) * 100),
      infrastructure_percent: Math.round((currentProjection.breakdown.infrastructure / currentTotal) * 100),
      storage_percent: Math.round((currentProjection.breakdown.storage / currentTotal) * 100),
      notifications_percent: Math.round((currentProjection.breakdown.notifications / currentTotal) * 100),
    };

    const result = {
      current: {
        active_patients: currentPatients,
        estimated_monthly_cost: currentProjection.total_cost,
        cost_per_patient: currentProjection.cost_per_patient,
        breakdown: currentProjection.breakdown,
        ai_calls_30d: totalAiCalls,
        ai_calls_breakdown: aiCounts,
      },
      projections,
      distribution,
      config: {
        cost_per_ai_call_usd: Number(config.cost_per_ai_call_usd),
        cost_per_100mb_storage_usd: Number(config.cost_per_100mb_storage_usd),
        cost_per_1000_notifications_usd: Number(config.cost_per_1000_notifications_usd),
        infrastructure_base_cost_usd: Number(config.infrastructure_base_cost_usd),
        stripe_fee_percent: Number(config.stripe_fee_percent),
        monthly_price_per_professional: Number(config.monthly_price_per_professional || 197),
        avg_stripe_fee_percent: Number(config.avg_stripe_fee_percent || 2.9),
        cost_base_per_professional: Number(config.cost_base_per_professional || 2),
      },
      computed_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error computing cost projection:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
