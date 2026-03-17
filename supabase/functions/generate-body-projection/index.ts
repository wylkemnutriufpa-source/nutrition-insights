import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_DAYS = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { patient_id, timeframe = "90d", generation_source = "manual", assessment_id, force_override = false } = await req.json();
    const targetPatient = patient_id || user.id;
    const isRequestingForSelf = targetPatient === user.id;

    // Check user role for override capability
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (userRoles || []).map(r => r.role);
    const isProfessional = roles.includes("nutritionist") || roles.includes("admin");

    // === COOLDOWN CHECK ===
    const { data: lastProjection } = await supabase
      .from("body_projection_snapshots")
      .select("id, created_at, locked_until")
      .eq("patient_id", targetPatient)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastProjection) {
      const lockedUntil = lastProjection.locked_until ? new Date(lastProjection.locked_until) : null;
      const now = new Date();

      if (lockedUntil && now < lockedUntil) {
        // Only professionals can override cooldown
        if (!force_override || !isProfessional) {
          return new Response(JSON.stringify({
            error: "cooldown_active",
            message: "Projeção em período de espera",
            locked_until: lastProjection.locked_until,
            last_generated: lastProjection.created_at,
          }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Gather patient data
    const [profileRes, checkinsRes, snapshotsRes, photosRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", targetPatient).maybeSingle(),
      supabase.from("patient_checkins").select("*").eq("patient_id", targetPatient).order("created_at", { ascending: false }).limit(30),
      supabase.from("clinical_daily_snapshots").select("*").eq("patient_id", targetPatient).order("snapshot_date", { ascending: false }).limit(30),
      supabase.from("body_assessment_photos").select("*").eq("patient_id", targetPatient).order("assessment_date", { ascending: false }).limit(5),
    ]);

    const profile = profileRes.data;
    const checkins = checkinsRes.data || [];
    const snapshots = snapshotsRes.data || [];
    const photos = photosRes.data || [];

    // === DETERMINISTIC ENGINE ===
    const weights = checkins.filter((c: any) => c.weight).map((c: any) => ({ weight: c.weight, date: c.created_at }));
    const currentWeight = weights[0]?.weight || profile?.weight || null;
    const startWeight = weights.length > 1 ? weights[weights.length - 1].weight : currentWeight;
    const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;
    const avgAdherence = snapshots.length > 0
      ? snapshots.reduce((sum: number, s: any) => sum + (s.adherence_score || 0), 0) / snapshots.length
      : 50;

    const timeframeDays = parseInt(timeframe) || 90;
    const weeklyRate = weights.length > 1
      ? weightChange / Math.max(1, weights.length / 7)
      : -0.3;

    const projectedWeight = currentWeight
      ? Math.round((currentWeight + (weeklyRate * (timeframeDays / 7))) * 10) / 10
      : null;

    const sex = profile?.sex || profile?.gender || "neutral";
    const renderingProfile = sex === "feminino" || sex === "female" || sex === "F" ? "female"
      : sex === "masculino" || sex === "male" || sex === "M" ? "male"
      : "neutral";

    const height = profile?.height || 170;
    const bmi = currentWeight ? currentWeight / ((height / 100) ** 2) : 25;
    const adiposityLevel = bmi > 35 ? "very_high" : bmi > 30 ? "high" : bmi > 25 ? "moderate" : bmi > 22 ? "low" : "very_low";
    const projectedBmi = projectedWeight ? projectedWeight / ((height / 100) ** 2) : bmi;
    const projectedAdiposity = projectedBmi > 35 ? "very_high" : projectedBmi > 30 ? "high" : projectedBmi > 25 ? "moderate" : projectedBmi > 22 ? "low" : "very_low";

    // Determine clinical phase
    const clinicalPhase = weeklyRate < -0.5 ? "perda_ativa" 
      : weeklyRate < -0.1 ? "reducao_gradual"
      : weeklyRate < 0.1 ? "estabilizacao"
      : "recomposicao";

    const confidenceScore = Math.min(0.9, 0.4 + (checkins.length * 0.02) + (photos.length * 0.05));

    const currentMetrics = {
      rendering_profile: renderingProfile,
      body_frame_type: "medium",
      adiposity_level: adiposityLevel,
      muscularity_level: avgAdherence > 70 ? "moderate" : "low",
      weight: currentWeight,
      bmi: Math.round(bmi * 10) / 10,
      confidence_score: confidenceScore,
      clinical_phase: clinicalPhase,
    };

    const projectedMetrics = {
      rendering_profile: renderingProfile,
      adiposity_level: projectedAdiposity,
      muscularity_level: avgAdherence > 60 ? "moderate_to_high" : "moderate",
      projected_weight: projectedWeight,
      projected_bmi: Math.round(projectedBmi * 10) / 10,
      weight_delta: projectedWeight && currentWeight ? Math.round((projectedWeight - currentWeight) * 10) / 10 : 0,
      confidence_score: Math.min(0.85, 0.3 + (checkins.length * 0.015) + (avgAdherence / 200)),
      projected_phase: clinicalPhase === "perda_ativa" ? "reducao_gradual" : clinicalPhase === "reducao_gradual" ? "estabilizacao" : clinicalPhase,
      recommended_strategy: clinicalPhase === "perda_ativa" 
        ? "Manter déficit calórico moderado e priorizar proteína" 
        : clinicalPhase === "estabilizacao" 
        ? "Consolidar peso e aumentar calorias gradualmente"
        : "Manter consistência e ajustar conforme evolução",
    };

    // === AI NARRATIVE (optional layer) ===
    let narrative = "";
    if (lovableKey) {
      try {
        const prompt = `Você é um consultor de nutrição clínica. Gere uma narrativa motivacional em português brasileiro (3-4 frases) sobre a projeção corporal.

Dados:
- Peso atual: ${currentWeight}kg → Projetado: ${projectedWeight}kg em ${timeframeDays} dias
- IMC: ${currentMetrics.bmi} → ${projectedMetrics.projected_bmi}
- Adiposidade: ${adiposityLevel} → ${projectedAdiposity}
- Adesão: ${Math.round(avgAdherence)}% | Taxa: ${Math.round(weeklyRate * 100) / 100}kg/sem
- Fase clínica: ${clinicalPhase}

Regras: Não prometa resultados exatos. Linguagem motivacional e educativa. Mencione fase clínica. Inclua recomendação estratégica. Seja breve.`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          narrative = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI narrative error:", e);
      }
    }

    if (!narrative) {
      const delta = projectedMetrics.weight_delta;
      if (delta < -3) {
        narrative = `Mantendo sua consistência atual de ${Math.round(avgAdherence)}% de adesão, a tendência é de redução progressiva nos próximos ${timeframeDays} dias. Seu metabolismo está respondendo bem ao protocolo. Continue focado na regularidade das refeições e hidratação.`;
      } else if (delta < 0) {
        narrative = `A projeção indica uma redução gradual e saudável. Com adesão de ${Math.round(avgAdherence)}%, o progresso é sustentável. Mantenha a consistência e confie no processo.`;
      } else {
        narrative = `Sua trajetória sugere uma fase de estabilização metabólica. Isso é normal e indica que seu corpo está se adaptando. A estratégia ideal agora é manter a consistência e ajustar gradualmente.`;
      }
    }

    // === PERSIST SNAPSHOT ===
    const now = new Date();
    const validUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const lockedUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const { data: savedSnapshot, error: saveError } = await supabase.from("body_projection_snapshots").insert({
      patient_id: targetPatient,
      timeframe,
      current_body_json: currentMetrics,
      projected_body_json: projectedMetrics,
      current_metrics_json: currentMetrics,
      projected_metrics_json: projectedMetrics,
      narrative,
      confidence_score: confidenceScore,
      assessment_id: assessment_id || null,
      generation_source,
      valid_until: validUntil.toISOString(),
      locked_until: lockedUntil.toISOString(),
      created_by: user.id,
    }).select("id, created_at").single();

    if (saveError) console.error("Save error:", saveError);

    return new Response(JSON.stringify({
      snapshot_id: savedSnapshot?.id,
      generated_at: savedSnapshot?.created_at || now.toISOString(),
      valid_until: validUntil.toISOString(),
      locked_until: lockedUntil.toISOString(),
      current_body: currentMetrics,
      projected_body: projectedMetrics,
      narrative,
      timeframe,
      generation_source,
      photos_count: photos.length,
      data_points: checkins.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Body projection error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
