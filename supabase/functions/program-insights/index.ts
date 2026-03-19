import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Deterministic Rules Engine ───

function computeOverallStatus(
  weightTrend: number,
  avgAdherence: number,
  recentAdherenceDelta: number
): { status: "on_track" | "attention" | "at_risk"; label: string } {
  // Weight trend: negative = losing (good for weight loss goals)
  // avgAdherence: 0-100
  // recentAdherenceDelta: change in last 2 weeks

  if (avgAdherence >= 70 && recentAdherenceDelta >= -5) {
    return { status: "on_track", label: "No caminho certo" };
  }
  if (avgAdherence < 40 || recentAdherenceDelta < -20) {
    return { status: "at_risk", label: "Risco de estagnação" };
  }
  return { status: "attention", label: "Precisa de atenção" };
}

function generateDeterministicInsights(data: any): string[] {
  const insights: string[] = [];
  const { weight_history, adherence_history, habits_data } = data;

  // Weight trend
  if (weight_history && weight_history.length >= 2) {
    const first = weight_history[0]?.weight || weight_history[0];
    const last = weight_history[weight_history.length - 1]?.weight || weight_history[weight_history.length - 1];
    const diff = last - first;
    if (diff < -1) {
      insights.push(`Perda de ${Math.abs(diff).toFixed(1)}kg registrada no período — progresso consistente.`);
    } else if (diff > 1) {
      insights.push(`Ganho de ${diff.toFixed(1)}kg no período. Verificar dieta e retenção hídrica.`);
    } else {
      insights.push("Peso estável no período. Avaliar se está alinhado com o objetivo.");
    }
  }

  // Adherence trend
  if (adherence_history && adherence_history.length >= 2) {
    const recent = adherence_history.slice(-3);
    const avg = recent.reduce((s: number, v: number) => s + v, 0) / recent.length;
    if (avg >= 80) {
      insights.push(`Adesão excelente (${Math.round(avg)}%) nas últimas semanas.`);
    } else if (avg < 50) {
      insights.push(`Adesão baixa (${Math.round(avg)}%) — considerar simplificar o plano.`);
    }
  }

  // Habits
  if (habits_data) {
    const completed = habits_data.completed || 0;
    const total = habits_data.total || 0;
    if (total > 0) {
      const rate = Math.round((completed / total) * 100);
      insights.push(`Taxa de conclusão de hábitos: ${rate}% (${completed}/${total}).`);
    }
  }

  if (insights.length === 0) {
    insights.push("Dados insuficientes para gerar insights detalhados. Continue registrando progresso.");
  }

  return insights;
}

function generateRecommendations(data: any): string[] {
  const recs: string[] = [];
  const { adherence_history, weight_history, current_phase } = data;

  const avgAdherence = adherence_history?.length > 0
    ? adherence_history.reduce((s: number, v: number) => s + v, 0) / adherence_history.length
    : 50;

  if (avgAdherence < 50) {
    recs.push("Simplificar o checklist diário para no máximo 3 itens prioritários.");
    recs.push("Agendar check-in motivacional com a nutricionista.");
  } else if (avgAdherence < 70) {
    recs.push("Identificar os dias de menor adesão e ajustar a rotina.");
  }

  if (weight_history?.length >= 3) {
    const last3 = weight_history.slice(-3).map((w: any) => w.weight || w);
    const isStagnant = Math.abs(last3[0] - last3[2]) < 0.3;
    if (isStagnant) {
      recs.push("Peso estagnado — considerar ajuste calórico ou nova estratégia de exercício.");
    }
  }

  if (current_phase) {
    recs.push(`Revisar os objetivos específicos da fase ${current_phase} e ajustar metas semanais.`);
  }

  if (recs.length === 0) {
    recs.push("Manter o plano atual e continuar registrando progresso.");
  }

  return recs;
}

function generatePhaseAdvice(phase: number | string | undefined): string {
  if (!phase) return "Continue seguindo o plano alimentar com consistência.";
  const p = typeof phase === "string" ? parseInt(phase) : phase;
  switch (p) {
    case 1: return "Fase inicial: foco em criar hábitos consistentes. Não se preocupe com perfeição.";
    case 2: return "Fase de intensificação: hora de refinar a dieta e aumentar a atividade gradualmente.";
    case 3: return "Fase avançada: manutenção dos resultados e ajustes finos. Parabéns pelo progresso!";
    default: return "Mantenha o foco nos seus objetivos e celebre cada pequena vitória.";
  }
}

function generateMotivation(avgAdherence: number): string {
  if (avgAdherence >= 80) return "Incrível! Sua dedicação está gerando resultados reais. Continue assim! 🌟";
  if (avgAdherence >= 60) return "Bom progresso! Cada dia de esforço conta. Você está no caminho certo! 💪";
  if (avgAdherence >= 40) return "Não desista! Pequenos passos consistentes levam a grandes transformações. 🚀";
  return "Cada novo dia é uma chance de recomeçar. Comece com uma pequena meta hoje! 🌱";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const data = await req.json();
    const { adherence_history, weight_history, waist_history, habits_data, current_phase } = data;

    const avgAdherence = adherence_history?.length > 0
      ? adherence_history.reduce((s: number, v: number) => s + v, 0) / adherence_history.length
      : 50;

    const recentDelta = adherence_history?.length >= 4
      ? adherence_history[adherence_history.length - 1] - adherence_history[adherence_history.length - 4]
      : 0;

    const weightTrend = weight_history?.length >= 2
      ? (weight_history[weight_history.length - 1]?.weight || weight_history[weight_history.length - 1]) -
        (weight_history[0]?.weight || weight_history[0])
      : 0;

    const { status, label } = computeOverallStatus(weightTrend, avgAdherence, recentDelta);
    const insights = generateDeterministicInsights(data);
    const recommendations = generateRecommendations(data);
    const phase_advice = generatePhaseAdvice(current_phase);
    const motivation_message = generateMotivation(avgAdherence);

    const result = {
      overall_status: status,
      status_label: label,
      insights,
      recommendations,
      phase_advice,
      motivation_message,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("program-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
