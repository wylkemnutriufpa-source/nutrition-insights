import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Internal Rules Engine ───
function computeRiskLevel(adherence: number, daysSinceActivity: number): "high" | "medium" | "low" {
  if (adherence < 30 || daysSinceActivity >= 7) return "high";
  if (adherence < 50 || daysSinceActivity >= 5) return "medium";
  return "low";
}

function computeHealthScore(adherence: number, checkinsCount: number, hasAnamnesis: boolean): number {
  let score = adherence * 0.6;
  score += Math.min(checkinsCount * 2, 20); // max 20 from checkins
  if (hasAnamnesis) score += 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function generateAttentionList(patients: any[]): any[] {
  return patients
    .filter(p => p.riskLevel === "high" || p.adherence < 30)
    .sort((a, b) => a.adherence - b.adherence)
    .slice(0, 10)
    .map(p => ({
      patient_id: p.id,
      patient_name: p.name,
      reason: p.daysSinceActivity >= 7
        ? `Inativo há ${p.daysSinceActivity} dias`
        : `Adesão crítica: ${p.adherence}%`,
      priority: p.adherence < 20 || p.daysSinceActivity >= 10 ? "high" : "medium",
      action_suggested: p.daysSinceActivity >= 7
        ? "Enviar mensagem de reengajamento"
        : "Agendar follow-up e simplificar protocolo",
    }));
}

function generateInsights(patients: any[]): any[] {
  const insights: any[] = [];
  const total = patients.length;
  if (total === 0) return insights;

  const avgAdherence = Math.round(patients.reduce((s, p) => s + p.adherence, 0) / total);
  const highRisk = patients.filter(p => p.riskLevel === "high").length;
  const inactive = patients.filter(p => p.daysSinceActivity >= 5).length;

  if (avgAdherence < 50) {
    insights.push({
      title: "Adesão geral abaixo do esperado",
      description: `A adesão média da base é de ${avgAdherence}%. Considere simplificar protocolos e aumentar o suporte nos primeiros dias.`,
      category: "adherence",
      affected_count: total,
      severity: avgAdherence < 30 ? "critical" : "warning",
    });
  } else if (avgAdherence >= 70) {
    insights.push({
      title: "Adesão geral saudável",
      description: `A adesão média de ${avgAdherence}% indica boa aderência aos protocolos. Mantenha o acompanhamento atual.`,
      category: "adherence",
      affected_count: total,
      severity: "info",
    });
  }

  if (inactive > 0) {
    const pct = Math.round((inactive / total) * 100);
    insights.push({
      title: `${inactive} paciente(s) inativo(s)`,
      description: `${pct}% da base está sem atividade há 5+ dias. Risco de abandono elevado.`,
      category: "risk",
      affected_count: inactive,
      severity: pct > 30 ? "critical" : "warning",
    });
  }

  if (highRisk > 0) {
    insights.push({
      title: `${highRisk} paciente(s) em risco alto`,
      description: `Pacientes com adesão <30% ou inativos por 7+ dias precisam de atenção imediata.`,
      category: "risk",
      affected_count: highRisk,
      severity: "critical",
    });
  }

  // Difficulty patterns
  const difficulties: Record<string, number> = {};
  patients.forEach(p => {
    if (p.topDifficulty) difficulties[p.topDifficulty] = (difficulties[p.topDifficulty] || 0) + 1;
  });
  const topDiff = Object.entries(difficulties).sort((a, b) => b[1] - a[1]);
  if (topDiff.length > 0) {
    insights.push({
      title: `Dificuldade mais comum: "${topDiff[0][0]}"`,
      description: `Reportada por ${topDiff[0][1]} paciente(s). Considere ajustar a abordagem para este grupo.`,
      category: "adherence",
      affected_count: topDiff[0][1],
      severity: "info",
    });
  }

  return insights;
}

function generateTextSummary(aggregatedData: any): string {
  const lines: string[] = [];
  lines.push(`📊 RESUMO EXECUTIVO — Últimos ${aggregatedData.dateRange} dias\n`);
  lines.push(`▸ Total de pacientes analisados: ${aggregatedData.totalPatients}`);
  lines.push(`▸ Adesão média: ${aggregatedData.avgAdherence}%`);
  lines.push(`▸ Score de saúde médio: ${aggregatedData.avgHealthScore}`);
  lines.push(`▸ Pacientes em alto risco: ${aggregatedData.highRiskCount}`);
  lines.push(`▸ Check-ins realizados: ${aggregatedData.totalCheckins}\n`);

  // Analysis
  if (aggregatedData.avgAdherence < 50) {
    lines.push(`⚠️ ATENÇÃO: A adesão média de ${aggregatedData.avgAdherence}% está abaixo do ideal. Recomenda-se revisar a complexidade dos protocolos e intensificar o acompanhamento.\n`);
  } else if (aggregatedData.avgAdherence >= 70) {
    lines.push(`✅ POSITIVO: A adesão média de ${aggregatedData.avgAdherence}% indica que os protocolos estão sendo bem seguidos.\n`);
  }

  if (aggregatedData.highRiskCount > 0) {
    const pct = aggregatedData.totalPatients > 0
      ? Math.round((aggregatedData.highRiskCount / aggregatedData.totalPatients) * 100)
      : 0;
    lines.push(`🔴 ${aggregatedData.highRiskCount} paciente(s) em risco alto (${pct}% da base). Ação prioritária recomendada.\n`);
  }

  // Risk distribution
  const risk = aggregatedData.riskDistribution;
  if (risk) {
    lines.push(`📈 DISTRIBUIÇÃO DE RISCO:`);
    if (risk.low) lines.push(`  • Baixo: ${risk.low} paciente(s)`);
    if (risk.moderate) lines.push(`  • Moderado: ${risk.moderate} paciente(s)`);
    if (risk.high) lines.push(`  • Alto: ${risk.high} paciente(s)`);
    lines.push("");
  }

  // Difficulties
  if (aggregatedData.topDifficulties?.length > 0) {
    lines.push(`🧩 DIFICULDADES MAIS COMUNS:`);
    aggregatedData.topDifficulties.forEach((d: string) => lines.push(`  • ${d}`));
    lines.push("");
  }

  // Recommendations
  lines.push(`💡 RECOMENDAÇÕES:`);
  if (aggregatedData.highRiskCount > 0) {
    lines.push(`  1. Contatar pacientes de alto risco com mensagens personalizadas`);
  }
  if (aggregatedData.avgAdherence < 60) {
    lines.push(`  2. Simplificar checklists — reduzir para 3-5 itens diários`);
  }
  lines.push(`  3. Manter follow-ups semanais para pacientes com adesão < 50%`);
  lines.push(`  4. Celebrar conquistas dos pacientes com adesão alta`);

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { patients, aggregatedData } = body;

    // ── Path 1: Aggregated data summary (text generation from rules) ──
    if (aggregatedData) {
      const summary = generateTextSummary(aggregatedData);
      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Path 2: Patient-level insights (fully deterministic) ──
    if (!patients || patients.length === 0) {
      return new Response(JSON.stringify({
        attention_needed: [],
        insights: [],
        summary: { total_analyzed: 0, high_risk_count: 0, top_concern: "Sem dados" },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich patients with computed fields
    const enriched = patients.map((p: any) => {
      const adherence = p.adherence ?? p.checklistAdherence ?? 50;
      const daysSinceActivity = p.daysSinceLastCheckin ?? p.daysSinceActivity ?? 0;
      const riskLevel = computeRiskLevel(adherence, daysSinceActivity);
      const healthScore = computeHealthScore(adherence, p.totalCheckins ?? 0, !!p.hasAnamnesis);

      return {
        ...p,
        adherence,
        daysSinceActivity,
        riskLevel,
        healthScore,
      };
    });

    const attention_needed = generateAttentionList(enriched);
    const insights = generateInsights(enriched);

    const totalAnalyzed = enriched.length;
    const highRiskCount = enriched.filter((p: any) => p.riskLevel === "high").length;
    const avgAdherence = Math.round(enriched.reduce((s: number, p: any) => s + p.adherence, 0) / totalAnalyzed);

    let topConcern = "Nenhum problema identificado";
    if (highRiskCount > totalAnalyzed * 0.3) topConcern = "Alta taxa de pacientes em risco";
    else if (avgAdherence < 40) topConcern = "Adesão geral crítica";
    else if (enriched.filter((p: any) => p.daysSinceActivity >= 5).length > 0) topConcern = "Pacientes inativos detectados";

    return new Response(JSON.stringify({
      attention_needed,
      insights,
      summary: {
        total_analyzed: totalAnalyzed,
        high_risk_count: highRiskCount,
        avg_adherence_estimate: avgAdherence,
        top_concern: topConcern,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("clinical-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});