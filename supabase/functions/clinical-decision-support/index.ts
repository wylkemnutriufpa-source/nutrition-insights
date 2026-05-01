import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isLLMEnabled } from "../_shared/llm-gate.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://fitjourney.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Vary": "Origin"
};

// ═══════════════════════════════════════════════════
// CLINICAL DECISION SUPPORT v2.0
// Deterministic engine as DEFAULT
// AI copilot as OPTIONAL premium layer (feature flag)
// ═══════════════════════════════════════════════════

// ─── LAYER A: Deterministic Engine (always runs) ───

function computeAlerts(metrics: any, bodyData: any): any[] {
  const alerts: any[] = [];

  if (metrics.daysSinceLastCheckin >= 14) {
    alerts.push({
      type: "abandonment",
      message: `Paciente sem check-in há ${metrics.daysSinceLastCheckin} dias. Risco alto de abandono.`,
      severity: "high",
    });
  } else if (metrics.daysSinceLastCheckin >= 7) {
    alerts.push({
      type: "abandonment",
      message: `Paciente sem check-in há ${metrics.daysSinceLastCheckin} dias. Contato recomendado.`,
      severity: "medium",
    });
  }

  if (metrics.checklistAdherence < 30) {
    alerts.push({
      type: "low_adherence",
      message: `Adesão ao checklist em ${metrics.checklistAdherence}% — abaixo do mínimo aceitável.`,
      severity: "high",
    });
  } else if (metrics.checklistAdherence < 50) {
    alerts.push({
      type: "low_adherence",
      message: `Adesão ao checklist em ${metrics.checklistAdherence}%. Considere simplificar o protocolo.`,
      severity: "medium",
    });
  }

  if (metrics.mealPlanAdherence < 30) {
    alerts.push({
      type: "low_adherence",
      message: `Adesão ao plano alimentar em ${metrics.mealPlanAdherence}%. Verificar se o plano é realista.`,
      severity: "high",
    });
  }

  if (metrics.weightHistory?.length >= 3) {
    const weights = metrics.weightHistory.map((w: any) => w.weight || w);
    const recent = weights.slice(-3);
    const range = Math.max(...recent) - Math.min(...recent);
    if (range < 0.3) {
      alerts.push({
        type: "stagnation",
        message: "Peso estagnado nas últimas avaliações. Considere ajuste calórico ou revisão de estratégia.",
        severity: "medium",
      });
    }
  }

  if (bodyData?.bmi) {
    if (bodyData.bmi > 35) {
      alerts.push({
        type: "stagnation",
        message: `IMC de ${bodyData.bmi} indica obesidade grau II. Monitoramento intensivo recomendado.`,
        severity: "high",
      });
    } else if (bodyData.bmi > 30) {
      alerts.push({
        type: "stagnation",
        message: `IMC de ${bodyData.bmi} indica obesidade grau I. Acompanhamento nutricional focado.`,
        severity: "medium",
      });
    }
  }

  return alerts;
}

function computeSuggestedAdjustments(metrics: any, anamnesis: any): string[] {
  const adjustments: string[] = [];

  if (metrics.checklistAdherence < 50) {
    adjustments.push("Reduzir checklist diário para 3-5 itens prioritários para aumentar adesão.");
  }
  if (metrics.mealPlanAdherence < 50) {
    adjustments.push("Simplificar plano alimentar com refeições mais práticas e rápidas.");
  }
  if (metrics.daysSinceLastCheckin >= 5) {
    adjustments.push("Implementar lembrete semanal automático para check-in.");
  }

  const difficulties = metrics.difficulties || [];
  if (difficulties.includes("hard") || difficulties.includes("very_hard")) {
    adjustments.push("Paciente reporta dificuldade alta — considere protocolos mais graduais.");
  }

  if (anamnesis?.waterIntake && anamnesis.waterIntake < 1.5) {
    adjustments.push("Aumentar meta de hidratação — ingesta atual abaixo de 1.5L/dia.");
  }
  if (anamnesis?.activityLevel === "sedentary") {
    adjustments.push("Incluir meta de caminhada diária (15-30min) no protocolo.");
  }
  if (anamnesis?.kcalTarget && metrics.mealPlanAdherence < 40) {
    adjustments.push(`Reavaliar meta calórica de ${anamnesis.kcalTarget}kcal — pode estar irrealista para o momento.`);
  }

  if (adjustments.length === 0) {
    adjustments.push("Manter o plano atual. Adesão e métricas estão dentro do esperado.");
  }

  return adjustments.slice(0, 6);
}

function computeRecommendedProtocols(
  metrics: any,
  availableProtocols: any[],
  activeProtocolCount: number,
  anamnesis: any
): any[] {
  if (!availableProtocols || availableProtocols.length === 0) return [];

  const recommended: any[] = [];

  for (const protocol of availableProtocols) {
    const titleLower = (protocol.title || "").toLowerCase();
    const categoryLower = (protocol.category || "").toLowerCase();

    if (metrics.checklistAdherence < 40 && (titleLower.includes("iniciante") || titleLower.includes("básico") || categoryLower.includes("beginner"))) {
      recommended.push({ title: protocol.title, reason: "Adesão baixa sugere necessidade de protocolo simplificado." });
    }
    if (metrics.daysSinceLastCheckin >= 7 && (titleLower.includes("reengaj") || titleLower.includes("motivaç"))) {
      recommended.push({ title: protocol.title, reason: "Paciente inativo — protocolo de reengajamento indicado." });
    }
    if (anamnesis?.goal && (
      (anamnesis.goal.includes("emagre") && (titleLower.includes("emagre") || titleLower.includes("perda"))) ||
      (anamnesis.goal.includes("massa") && (titleLower.includes("massa") || titleLower.includes("hipertrofia")))
    )) {
      recommended.push({ title: protocol.title, reason: `Alinhado com o objetivo do paciente: ${anamnesis.goal}.` });
    }
  }

  return recommended.slice(0, 3);
}

function generateClinicalAnalysis(name: string, metrics: any, anamnesis: any, bodyData: any, activeProtocolCount: number): string {
  const lines: string[] = [];

  lines.push(`Análise clínica para ${name}:\n`);
  lines.push(`Adesão ao checklist: ${metrics.checklistAdherence}% | Plano alimentar: ${metrics.mealPlanAdherence}%`);

  if (metrics.totalCheckins > 0) {
    lines.push(`Realizou ${metrics.totalCheckins} check-in(s). Último há ${metrics.daysSinceLastCheckin} dia(s).`);
  } else {
    lines.push("Nenhum check-in registrado até o momento.");
  }

  if (metrics.weightHistory?.length > 0) {
    const weights = metrics.weightHistory.map((w: any) => w.weight || w);
    const first = weights[0];
    const last = weights[weights.length - 1];
    const diff = last - first;
    lines.push(`\nHistórico de peso: ${first}kg → ${last}kg (${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg).`);
  }

  if (bodyData) {
    const parts = [];
    if (bodyData.bmi) parts.push(`IMC: ${bodyData.bmi}`);
    if (bodyData.bodyFat) parts.push(`%GC: ${bodyData.bodyFat}%`);
    if (bodyData.leanMass) parts.push(`Massa magra: ${bodyData.leanMass}kg`);
    if (parts.length > 0) lines.push(parts.join(" | "));
  }

  if (metrics.difficulties?.length > 0) {
    lines.push(`\nDificuldades relatadas: ${metrics.difficulties.join(", ")}.`);
  }

  lines.push(`\nProtocolos ativos: ${activeProtocolCount}.`);

  const overallAdherence = (metrics.checklistAdherence + metrics.mealPlanAdherence) / 2;
  if (overallAdherence >= 70) {
    lines.push("\n✅ Paciente com boa adesão. Manter acompanhamento regular e progressão gradual.");
  } else if (overallAdherence >= 40) {
    lines.push("\n⚠️ Adesão moderada. Identificar barreiras específicas e ajustar o plano conforme necessário.");
  } else {
    lines.push("\n🔴 Adesão crítica. Recomenda-se contato imediato, simplificação do protocolo e suporte motivacional.");
  }

  return lines.join("\n");
}

// ─── LAYER B: Optional AI Copilot (PREMIUM ONLY) ───
// Only runs when useCopilot=true AND feature flag is enabled

async function generateAICopilotAnalysis(patientData: any, engineResult: any): Promise<string | null> {
  // LLM Gate — admin control
  if (!(await isLLMEnabled())) return null;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  try {
    const prompt = `Baseado nos dados clínicos já processados abaixo, elabore um resumo humanizado e profissional em português brasileiro (3-4 parágrafos). NÃO recalcule métricas — apenas expanda o contexto clínico de forma empática e acionável.

DADOS DO PACIENTE: ${patientData.name}
ALERTAS DETECTADOS: ${JSON.stringify(engineResult.alerts)}
AJUSTES SUGERIDOS: ${JSON.stringify(engineResult.suggestedAdjustments)}
ADESÃO CHECKLIST: ${patientData.metrics.checklistAdherence}%
ADESÃO PLANO ALIMENTAR: ${patientData.metrics.mealPlanAdherence}%
DIAS SEM CHECK-IN: ${patientData.metrics.daysSinceLastCheckin}

Forneça um resumo narrativo complementar, sem repetir os dados brutos.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um copiloto clínico de nutrição. Forneça análises humanizadas e empáticas. Responda em português brasileiro." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ─── Auth validation ───
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

    // ─── Rate limiting ───
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const clientKey = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || user.id;
    const { data: allowed } = await sb.rpc("check_rate_limit", {
      _function_name: "clinical-decision-support",
      _client_key: clientKey,
      _max_requests: 20,
      _window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    const { patientData, useCopilot } = await req.json();

    // ─── Engine Layer (ALWAYS runs — zero cost) ───
    const alerts = computeAlerts(patientData.metrics, patientData.bodyData);
    const suggestedAdjustments = computeSuggestedAdjustments(patientData.metrics, patientData.anamnesis);
    const recommendedProtocols = computeRecommendedProtocols(
      patientData.metrics,
      patientData.availableProtocols || [],
      patientData.activeProtocolCount || 0,
      patientData.anamnesis
    );
    const clinicalAnalysis = generateClinicalAnalysis(
      patientData.name,
      patientData.metrics,
      patientData.anamnesis,
      patientData.bodyData,
      patientData.activeProtocolCount || 0
    );

    const engineResult: any = {
      clinicalAnalysis,
      suggestedAdjustments,
      recommendedProtocols,
      alerts,
      copilot_used: false,
    };

    // ─── Copilot Layer (ONLY if explicitly requested — costs AI credits) ───
    if (useCopilot === true) {
      const copilotText = await generateAICopilotAnalysis(patientData, engineResult);
      if (copilotText) {
        engineResult.clinicalAnalysis += "\n\n── Análise Expandida (Copiloto IA) ──\n" + copilotText;
        engineResult.copilot_used = true;
      }
    }

    return new Response(JSON.stringify(engineResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Clinical decision support error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
