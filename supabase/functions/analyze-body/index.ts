import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════
// DETERMINISTIC BODY ANALYSIS ENGINE v1.0
// Replaces AI gateway calls with clinical formulas
// ═══════════════════════════════════════════════════

interface BodyMetrics {
  body_fat_estimate: number;
  muscle_definition: number;
  body_type: string;
  fat_distribution: { pattern: string; areas: string[] };
  summary: string;
  recommendations: string[];
  progress_highlights: string | null;
}

function classifyBMI(bmi: number): { label: string; risk: string } {
  if (bmi < 18.5) return { label: "Abaixo do peso", risk: "Risco nutricional" };
  if (bmi < 25) return { label: "Peso normal", risk: "Baixo risco" };
  if (bmi < 30) return { label: "Sobrepeso", risk: "Risco moderado" };
  if (bmi < 35) return { label: "Obesidade grau I", risk: "Risco elevado" };
  if (bmi < 40) return { label: "Obesidade grau II", risk: "Risco alto" };
  return { label: "Obesidade grau III", risk: "Risco muito alto" };
}

function estimateBodyFatFromBMI(bmi: number, age: number | null, sex: string | null): number {
  // Deurenberg formula: %BF = 1.20 × BMI + 0.23 × Age − 10.8 × sex(1=M,0=F) − 5.4
  const ageVal = age || 30;
  const sexVal = (sex === "male" || sex === "masculino") ? 1 : 0;
  const bf = 1.20 * bmi + 0.23 * ageVal - 10.8 * sexVal - 5.4;
  return Math.max(5, Math.min(55, Math.round(bf * 10) / 10));
}

function classifyBodyType(bmi: number, bodyFat: number): string {
  if (bmi < 20 && bodyFat < 15) return "ectomorfo";
  if (bmi >= 20 && bmi <= 27 && bodyFat < 20) return "mesomorfo";
  if (bmi > 27 && bodyFat > 25) return "endomorfo";
  if (bmi < 23 && bodyFat < 18) return "ecto-mesomorfo";
  return "endo-mesomorfo";
}

function estimateMuscleDefinition(bodyFat: number): number {
  if (bodyFat <= 8) return 10;
  if (bodyFat <= 12) return 8;
  if (bodyFat <= 16) return 7;
  if (bodyFat <= 20) return 5;
  if (bodyFat <= 25) return 4;
  if (bodyFat <= 30) return 3;
  return 2;
}

function determineFatDistribution(bodyFat: number, sex: string | null): { pattern: string; areas: string[] } {
  const isMale = sex === "male" || sex === "masculino";
  if (bodyFat < 15) return { pattern: "Distribuição uniforme, baixa adiposidade", areas: [] };
  if (isMale) {
    return {
      pattern: "Padrão andróide (central)",
      areas: bodyFat > 25
        ? ["abdômen", "tronco", "flancos", "peito"]
        : ["abdômen", "tronco"],
    };
  }
  return {
    pattern: "Padrão ginóide (periférico)",
    areas: bodyFat > 30
      ? ["quadril", "coxas", "glúteos", "braços"]
      : ["quadril", "coxas"],
  };
}

function generateSummary(bmi: number, bmiClass: { label: string; risk: string }, bodyFat: number, bodyType: string, muscleDef: number): string {
  return `Avaliação Corporal Determinística:
• IMC: ${bmi.toFixed(1)} — ${bmiClass.label} (${bmiClass.risk})
• Gordura corporal estimada: ${bodyFat}%
• Biotipo: ${bodyType}
• Definição muscular: ${muscleDef}/10
${bmiClass.risk !== "Baixo risco" ? `\n⚠️ Classificação de risco: ${bmiClass.risk}. Monitoramento contínuo recomendado.` : "\n✅ Composição corporal dentro dos parâmetros saudáveis."}`;
}

function generateRecommendations(bmi: number, bodyFat: number, bodyType: string): string[] {
  const recs: string[] = [];

  if (bmi > 30) {
    recs.push("Priorizar déficit calórico moderado (300-500 kcal/dia) com acompanhamento semanal.");
    recs.push("Incluir exercício aeróbico de intensidade moderada 3-5x/semana.");
  } else if (bmi > 25) {
    recs.push("Ajuste calórico leve para redução gradual de peso.");
    recs.push("Combinar treino de força com cardio para otimizar composição corporal.");
  } else if (bmi < 18.5) {
    recs.push("Aumentar ingestão calórica com foco em alimentos nutricionalmente densos.");
    recs.push("Priorizar treino de hipertrofia para ganho de massa magra.");
  }

  if (bodyFat > 25) {
    recs.push("Monitorar circunferência abdominal — risco metabólico aumentado.");
  }

  if (bodyType === "ectomorfo") {
    recs.push("Aumentar frequência alimentar (5-6 refeições) com maior aporte proteico.");
  }
  if (bodyType === "endomorfo") {
    recs.push("Controlar carboidratos refinados e priorizar fibras nas refeições principais.");
  }

  if (recs.length === 0) {
    recs.push("Manter rotina atual de alimentação e exercícios.");
    recs.push("Reavaliar composição corporal em 30-60 dias.");
  }

  return recs.slice(0, 5);
}

function generateProgressComparison(current: BodyMetrics, previous: any): string {
  const lines: string[] = ["Comparação com avaliação anterior:"];

  if (previous.body_fat_estimate) {
    const diff = current.body_fat_estimate - previous.body_fat_estimate;
    lines.push(`• Gordura corporal: ${previous.body_fat_estimate}% → ${current.body_fat_estimate}% (${diff > 0 ? "+" : ""}${diff.toFixed(1)}%)`);
  }
  if (previous.muscle_definition) {
    const diff = current.muscle_definition - previous.muscle_definition;
    lines.push(`• Definição muscular: ${previous.muscle_definition} → ${current.muscle_definition}/10 (${diff > 0 ? "+" : ""}${diff})`);
  }
  if (previous.body_type) {
    lines.push(`• Biotipo: ${previous.body_type} → ${current.body_type}`);
  }

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { analysis_id, previous_analysis } = await req.json();
    if (!analysis_id) throw new Error("analysis_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch analysis record
    const { data: analysisRecord, error: fetchErr } = await supabase
      .from("body_analyses")
      .select("assessor_id, patient_id")
      .eq("id", analysis_id)
      .single();

    if (fetchErr || !analysisRecord) {
      return new Response(JSON.stringify({ error: "Analysis not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (analysisRecord.assessor_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10 requests per 5 minutes
    const rl = await checkRateLimit("analyze-body", user.id, 10, 5);
    if (!rl.allowed) return rateLimitResponse();

    // Fetch patient profile for age/sex
    const { data: profile } = await supabase
      .from("profiles")
      .select("birth_date, sex")
      .eq("user_id", analysisRecord.patient_id)
      .single();

    // Fetch latest physical assessment for weight/height
    const { data: assessment } = await supabase
      .from("physical_assessments")
      .select("weight, height, bmi, body_fat_percentage")
      .eq("patient_id", analysisRecord.patient_id)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const weight = assessment?.weight;
    const height = assessment?.height;

    if (!weight || !height) {
      return new Response(JSON.stringify({
        error: "Dados insuficientes. Cadastre peso e altura na avaliação física antes de analisar."
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const heightM = height > 3 ? height / 100 : height;
    const bmi = weight / (heightM * heightM);
    const bmiClass = classifyBMI(bmi);

    const age = profile?.birth_date
      ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 86400000))
      : null;
    const sex = profile?.sex || null;

    // Use measured body fat if available, otherwise estimate
    const bodyFat = assessment?.body_fat_percentage || estimateBodyFatFromBMI(bmi, age, sex);
    const bodyType = classifyBodyType(bmi, bodyFat);
    const muscleDef = estimateMuscleDefinition(bodyFat);
    const fatDist = determineFatDistribution(bodyFat, sex);
    const summary = generateSummary(bmi, bmiClass, bodyFat, bodyType, muscleDef);
    const recommendations = generateRecommendations(bmi, bodyFat, bodyType);

    const analysis: BodyMetrics = {
      body_fat_estimate: bodyFat,
      muscle_definition: muscleDef,
      body_type: bodyType,
      fat_distribution: fatDist,
      summary,
      recommendations,
      progress_highlights: previous_analysis ? generateProgressComparison(
        { body_fat_estimate: bodyFat, muscle_definition: muscleDef, body_type: bodyType } as BodyMetrics,
        previous_analysis
      ) : null,
    };

    // Update DB
    const { error } = await supabase.from("body_analyses").update({
      body_fat_estimate: analysis.body_fat_estimate,
      muscle_definition: analysis.muscle_definition,
      body_type: analysis.body_type,
      fat_distribution: analysis.fat_distribution,
      ai_analysis: { summary: analysis.summary, recommendations: analysis.recommendations },
      progress_comparison: analysis.progress_highlights ? { highlights: analysis.progress_highlights } : null,
    }).eq("id", analysis_id);

    if (error) throw error;

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-body error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
