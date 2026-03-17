import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { patient_id, timeframe = "90d" } = await req.json();
    const targetPatient = patient_id || user.id;

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

    // Calculate metrics
    const weights = checkins.filter(c => c.weight).map(c => ({ weight: c.weight, date: c.created_at }));
    const currentWeight = weights[0]?.weight || profile?.weight || null;
    const startWeight = weights.length > 1 ? weights[weights.length - 1].weight : currentWeight;
    const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;
    const avgAdherence = snapshots.length > 0 
      ? snapshots.reduce((sum, s) => sum + (s.adherence_score || 0), 0) / snapshots.length 
      : 50;

    const timeframeDays = parseInt(timeframe) || 90;
    const weeklyRate = weights.length > 1 
      ? weightChange / Math.max(1, weights.length / 7) 
      : -0.3;

    const projectedWeight = currentWeight 
      ? Math.round((currentWeight + (weeklyRate * (timeframeDays / 7))) * 10) / 10 
      : null;

    // Determine rendering profile
    const sex = profile?.sex || profile?.gender || "neutral";
    const renderingProfile = sex === "feminino" || sex === "female" || sex === "F" ? "female" 
      : sex === "masculino" || sex === "male" || sex === "M" ? "male" 
      : "neutral";

    // Basic body estimation
    const height = profile?.height || 170;
    const bmi = currentWeight ? currentWeight / ((height / 100) ** 2) : 25;
    
    const adiposityLevel = bmi > 35 ? "very_high" : bmi > 30 ? "high" : bmi > 25 ? "moderate" : bmi > 22 ? "low" : "very_low";
    const projectedBmi = projectedWeight ? projectedWeight / ((height / 100) ** 2) : bmi;
    const projectedAdiposity = projectedBmi > 35 ? "very_high" : projectedBmi > 30 ? "high" : projectedBmi > 25 ? "moderate" : projectedBmi > 22 ? "low" : "very_low";

    const currentBody = {
      rendering_profile: renderingProfile,
      body_frame_type: "medium",
      adiposity_level: adiposityLevel,
      muscularity_level: avgAdherence > 70 ? "moderate" : "low",
      weight: currentWeight,
      bmi: Math.round(bmi * 10) / 10,
      confidence_score: Math.min(0.9, 0.4 + (checkins.length * 0.02) + (photos.length * 0.05)),
    };

    const projectedBody = {
      rendering_profile: renderingProfile,
      adiposity_level: projectedAdiposity,
      muscularity_level: avgAdherence > 60 ? "moderate_to_high" : "moderate",
      projected_weight: projectedWeight,
      projected_bmi: Math.round(projectedBmi * 10) / 10,
      weight_delta: projectedWeight && currentWeight ? Math.round((projectedWeight - currentWeight) * 10) / 10 : 0,
      confidence_score: Math.min(0.85, 0.3 + (checkins.length * 0.015) + (avgAdherence / 200)),
    };

    // Generate narrative via AI
    let narrative = "";
    if (lovableKey) {
      try {
        const prompt = `Você é um consultor de nutrição clínica. Gere uma narrativa motivacional e educativa em português brasileiro (3-4 frases) sobre a projeção corporal de um paciente.

Dados:
- Peso atual: ${currentWeight}kg
- Peso projetado em ${timeframeDays} dias: ${projectedWeight}kg
- IMC atual: ${currentBody.bmi}
- IMC projetado: ${projectedBody.projected_bmi}
- Nível de adiposidade atual: ${adiposityLevel}
- Adesão média: ${Math.round(avgAdherence)}%
- Taxa semanal: ${Math.round(weeklyRate * 100) / 100}kg/semana
- Perfil: ${renderingProfile}

Regras:
- Não prometa resultados exatos
- Use linguagem motivacional e educativa
- Mencione a fase clínica provável
- Inclua uma recomendação estratégica
- Seja breve e impactante`;

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
      const delta = projectedBody.weight_delta;
      if (delta < -3) {
        narrative = `Mantendo sua consistência atual de ${Math.round(avgAdherence)}% de adesão, a tendência é de redução progressiva nos próximos ${timeframeDays} dias. Seu metabolismo está respondendo bem ao protocolo. Continue focado na regularidade das refeições e hidratação.`;
      } else if (delta < 0) {
        narrative = `A projeção indica uma redução gradual e saudável. Com adesão de ${Math.round(avgAdherence)}%, o progresso é sustentável. Mantenha a consistência e confie no processo.`;
      } else {
        narrative = `Sua trajetória sugere uma fase de estabilização metabólica. Isso é normal e indica que seu corpo está se adaptando. A estratégia ideal agora é manter a consistência e ajustar gradualmente.`;
      }
    }

    // Save snapshot
    await supabase.from("body_projection_snapshots").insert({
      patient_id: targetPatient,
      timeframe,
      current_body_json: currentBody,
      projected_body_json: projectedBody,
      narrative,
      confidence_score: currentBody.confidence_score,
    });

    return new Response(JSON.stringify({
      current_body: currentBody,
      projected_body: projectedBody,
      narrative,
      timeframe,
      photos_count: photos.length,
      data_points: checkins.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Body projection error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
