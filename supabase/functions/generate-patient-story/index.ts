import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isLLMEnabled, llmBlockedResponse } from "../_shared/llm-gate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // LLM Gate — admin control
    if (!(await isLLMEnabled())) return llmBlockedResponse(corsHeaders);

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { patient_id } = await req.json();
    if (!patient_id) throw new Error("patient_id required");

    // Gather patient data in parallel
    const [profileRes, checkinsRes, statsRes, snapshotsRes, mealsRes, achievementsRes, alertsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, gender, birth_date, avatar_url").eq("user_id", patient_id).maybeSingle(),
      supabase.from("checkins").select("weight, mood, energy_level, created_at").eq("patient_id", patient_id).order("created_at", { ascending: false }).limit(90),
      supabase.from("player_stats").select("*").eq("user_id", patient_id).maybeSingle(),
      supabase.from("clinical_daily_snapshots").select("adherence_score, clinical_risk_score, dropout_risk_score, weight_trend, metabolic_cluster, snapshot_date").eq("patient_id", patient_id).order("snapshot_date", { ascending: false }).limit(30),
      supabase.from("meals").select("id, calories, logged_at").eq("user_id", patient_id).order("logged_at", { ascending: false }).limit(90),
      supabase.from("player_achievements").select("achievement_id, unlocked_at, achievements(name, icon)").eq("user_id", patient_id).order("unlocked_at", { ascending: false }).limit(10),
      supabase.from("clinical_alerts").select("alert_type, severity, title").eq("patient_id", patient_id).eq("is_active", true).limit(5),
    ]);

    const profile = profileRes.data;
    const checkins = checkinsRes.data || [];
    const stats = statsRes.data;
    const snapshots = snapshotsRes.data || [];
    const meals = mealsRes.data || [];
    const achievements = achievementsRes.data || [];
    const alerts = alertsRes.data || [];

    // Calculate metrics
    const weights = checkins.filter(c => c.weight).map(c => ({ weight: c.weight, date: c.created_at }));
    const firstWeight = weights.length > 0 ? weights[weights.length - 1].weight : null;
    const currentWeight = weights.length > 0 ? weights[0].weight : null;
    const weightChange = firstWeight && currentWeight ? currentWeight - firstWeight : 0;
    
    const avgAdherence = snapshots.length > 0
      ? Math.round(snapshots.reduce((s, r) => s + (r.adherence_score || 0), 0) / snapshots.length)
      : 0;

    const latestSnapshot = snapshots[0] || {};
    const streak = stats?.current_streak || 0;
    const totalXp = stats?.total_xp || 0;
    const mealCount = meals.length;

    // Determine phase
    let phase = "initial";
    if (checkins.length >= 60) phase = "consolidation";
    else if (checkins.length >= 30) phase = "acceleration";
    else if (checkins.length >= 14) phase = "adaptation";
    else if (checkins.length >= 1) phase = "start";

    // Build context for AI
    const context = {
      name: profile?.full_name || "Paciente",
      gender: profile?.gender || "unknown",
      totalCheckins: checkins.length,
      currentWeight,
      firstWeight,
      weightChange: weightChange ? weightChange.toFixed(1) : "0",
      avgAdherence,
      streak,
      totalXp,
      mealCount,
      phase,
      metabolicCluster: latestSnapshot.metabolic_cluster || "unknown",
      riskLevel: latestSnapshot.clinical_risk_score >= 30 ? "high" : latestSnapshot.clinical_risk_score >= 10 ? "medium" : "low",
      weightTrend: latestSnapshot.weight_trend || "stable",
      achievementsCount: achievements.length,
      activeAlerts: alerts.length,
      topAchievements: achievements.slice(0, 3).map((a: any) => a.achievements?.name || "Conquista"),
    };

    const prompt = `Você é um storyteller emocional para uma plataforma de nutrição e transformação pessoal chamada FitJourney.

DADOS REAIS DO PACIENTE:
- Nome: ${context.name}
- Gênero: ${context.gender}
- Check-ins realizados: ${context.totalCheckins}
- Peso inicial: ${context.firstWeight || "N/A"} kg
- Peso atual: ${context.currentWeight || "N/A"} kg
- Variação: ${context.weightChange} kg
- Adesão média: ${context.avgAdherence}%
- Streak atual: ${context.streak} dias
- XP total: ${context.totalXp}
- Refeições registradas: ${context.mealCount}
- Fase da jornada: ${context.phase}
- Cluster metabólico: ${context.metabolicCluster}
- Nível de risco: ${context.riskLevel}
- Tendência de peso: ${context.weightTrend}
- Conquistas desbloqueadas: ${context.achievementsCount}
- Alertas ativos: ${context.activeAlerts}

Gere uma narrativa emocional e motivacional em JSON PURO (sem markdown):

{
  "narrative_opening": "frase emocional de abertura inspiradora (max 2 frases, use o nome do paciente)",
  "narrative_diagnosis": "análise clara do momento atual, reconhecendo esforço e apontando oportunidades (max 3 frases)",
  "narrative_closing": "mensagem de esperança e motivação para continuar (max 2 frases)",
  "phase_label": "nome emocional da fase atual (ex: Despertar, Construção, Aceleração, Consolidação, Maestria)",
  "phase_description": "descrição poética da fase atual (1 frase)",
  "insight_title": "título do insight principal detectado",
  "insight_description": "explicação do insight em linguagem acessível (2 frases)",
  "projections": [
    {"period": "1 mês", "description": "projeção realista e motivadora"},
    {"period": "3 meses", "description": "projeção com base na tendência"},
    {"period": "6 meses", "description": "projeção aspiracional mas realista"},
    {"period": "1 ano", "description": "visão de longo prazo"}
  ],
  "motivational_quote": "frase motivacional personalizada para esse paciente",
  "share_caption": "legenda para compartilhamento social (Instagram), inspiradora e com emoji"
}

REGRAS:
- Use linguagem empática e emocional
- Base-se nos dados reais, não invente números
- Se o paciente está no início, celebre a coragem de começar
- Se está avançado, celebre a consistência
- Se tem risco alto, ofereça esperança
- Projeções devem ser realistas baseadas na tendência
- Responda APENAS o JSON`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "";
    const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const narrative = JSON.parse(jsonStr);

    // Save to database
    const { data: story, error: insertError } = await supabase
      .from("patient_journey_stories")
      .insert({
        patient_id,
        generated_by: patient_id,
        story_data: narrative,
        narrative_opening: narrative.narrative_opening,
        narrative_diagnosis: narrative.narrative_diagnosis,
        narrative_closing: narrative.narrative_closing,
        current_phase: phase,
        weight_trend: context.weightTrend,
        risk_level: context.riskLevel,
        projections: narrative.projections || [],
        metrics_snapshot: context,
        status: "generated",
      })
      .select()
      .single();

    if (insertError) console.error("Insert error:", insertError);

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...narrative,
        metrics: context,
        story_id: story?.id,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Story generation error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
