import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════
// DETERMINISTIC PREDICTIVE BRIEFING v1.0
// Replaces AI narrative with template-based briefing
// ═══════════════════════════════════════════════════

function generateDeterministicNarrative(
  predictions: any[],
  totalPatients: number,
  portfolio: any,
  milestonesCount: number,
): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const critical = predictions.filter(p => p.severity === "critical");
  const warnings = predictions.filter(p => p.severity === "warning");
  const dropoutRisks = predictions.filter(p => p.type === "dropout_risk");
  const plateaus = predictions.filter(p => p.type === "plateau");
  const adherenceDrops = predictions.filter(p => p.type === "adherence_drop");

  const lines: string[] = [];

  // Header
  lines.push(`## 📊 Briefing Preditivo — ${weekday}, ${dateStr}\n`);

  // Overview
  lines.push(`**Carteira:** ${totalPatients} pacientes ativos`);
  if (portfolio) {
    if (portfolio.portfolio_health_score) lines.push(`**Saúde do portfólio:** ${portfolio.portfolio_health_score}/100`);
    if (portfolio.avg_adherence) lines.push(`**Adesão média:** ${portfolio.avg_adherence.toFixed(0)}%`);
  }
  lines.push("");

  // Critical alerts
  if (critical.length > 0) {
    lines.push(`### 🔴 Ações Críticas (${critical.length})\n`);
    for (const c of critical) {
      lines.push(`- **${c.patient_name}**: ${c.message}`);
      if (c.action) lines.push(`  → _${c.action}_`);
    }
    lines.push("");
  }

  // Warnings
  if (warnings.length > 0) {
    lines.push(`### ⚠️ Atenção (${warnings.length})\n`);
    for (const w of warnings.slice(0, 5)) {
      lines.push(`- **${w.patient_name}**: ${w.message}`);
    }
    if (warnings.length > 5) lines.push(`- _...e mais ${warnings.length - 5} alertas._`);
    lines.push("");
  }

  // Summary by type
  if (dropoutRisks.length > 0 || plateaus.length > 0 || adherenceDrops.length > 0) {
    lines.push("### 📋 Resumo por Categoria\n");
    if (dropoutRisks.length > 0) lines.push(`- 🚪 **Risco de abandono:** ${dropoutRisks.length} paciente(s)`);
    if (plateaus.length > 0) lines.push(`- 📉 **Platôs detectados:** ${plateaus.length} paciente(s)`);
    if (adherenceDrops.length > 0) lines.push(`- 📊 **Queda de adesão:** ${adherenceDrops.length} paciente(s)`);
    lines.push("");
  }

  // Milestones
  if (milestonesCount > 0) {
    lines.push(`### 🎯 Marcos Próximos\n`);
    lines.push(`${milestonesCount} marco(s) nos próximos 7 dias. Verifique o calendário.\n`);
  }

  // Priorities
  if (predictions.length > 0) {
    lines.push("### 🎯 Prioridades do Dia\n");
    const topPriorities = predictions.slice(0, 3);
    for (let i = 0; i < topPriorities.length; i++) {
      lines.push(`${i + 1}. Contatar **${topPriorities[i].patient_name}** — ${topPriorities[i].type === "dropout_risk" ? "risco de abandono" : topPriorities[i].type === "plateau" ? "platô" : "queda de adesão"}`);
    }
    lines.push("");
  }

  // No issues
  if (predictions.length === 0) {
    lines.push("### ✅ Sem Alertas\n");
    lines.push("Nenhum alerta crítico detectado. Sua carteira está estável.");
    lines.push("Aproveite para revisar planos e agendar consultas de acompanhamento.\n");
  }

  lines.push("---");
  lines.push(`_Gerado automaticamente pelo Motor Preditivo IFJ • ${now.toLocaleTimeString("pt-BR")}_`);

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Fetch data
    const [patientsRes, alertsRes, portfolioRes, milestonesRes] = await Promise.all([
      supabase.from("patients").select("id, full_name, goal, current_weight, target_weight, journey_status, created_at")
        .eq("nutritionist_id", user.id).eq("status", "active"),
      supabase.from("clinical_alerts").select("*")
        .eq("nutritionist_id", user.id).eq("is_active", true),
      supabase.from("clinic_portfolio_state").select("*")
        .eq("nutritionist_id", user.id).maybeSingle(),
      supabase.from("calendar_milestones").select("*")
        .gte("milestone_date", new Date().toISOString().split("T")[0])
        .lte("milestone_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0])
        .eq("completed", false),
    ]);

    const patients = patientsRes.data || [];
    const patientIds = patients.map((p: any) => p.id);

    // Fetch snapshots
    const { data: snapshots } = await supabase
      .from("clinical_daily_snapshots")
      .select("*")
      .in("patient_id", patientIds)
      .gte("snapshot_date", new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0])
      .order("snapshot_date", { ascending: false });

    // Compute predictions (same deterministic logic)
    const predictions: any[] = [];

    for (const patient of patients) {
      const patientSnapshots = (snapshots || []).filter((s: any) => s.patient_id === patient.id);
      if (patientSnapshots.length < 2) continue;

      const latest = patientSnapshots[0];
      const weekAgo = patientSnapshots.find((s: any) => {
        const daysDiff = (Date.now() - new Date(s.snapshot_date).getTime()) / 86400000;
        return daysDiff >= 6;
      });

      if (latest?.dropout_risk_score > 50) {
        const trend = weekAgo ? latest.dropout_risk_score - (weekAgo.dropout_risk_score || 0) : 0;
        predictions.push({
          patient_name: patient.full_name,
          patient_id: patient.id,
          type: "dropout_risk",
          severity: latest.dropout_risk_score > 70 ? "critical" : "warning",
          score: latest.dropout_risk_score,
          trend,
          message: `${patient.full_name} tem ${latest.dropout_risk_score}% de risco de abandono${trend > 0 ? ` (↑${trend}% na semana)` : ""}`,
          action: "Agendar contato personalizado e revisar plano",
        });
      }

      if (latest?.weight_trend === "stable" && patient.goal === "weight_loss") {
        const daysStable = patientSnapshots.filter((s: any) => s.weight_trend === "stable").length;
        if (daysStable >= 7) {
          predictions.push({
            patient_name: patient.full_name,
            patient_id: patient.id,
            type: "plateau",
            severity: daysStable > 14 ? "critical" : "warning",
            score: Math.min(daysStable * 5, 100),
            message: `${patient.full_name} está em platô há ${daysStable} dias`,
            action: "Considerar ajuste calórico ou diet break estratégico",
          });
        }
      }

      if (latest?.adherence_score && weekAgo?.adherence_score) {
        const drop = weekAgo.adherence_score - latest.adherence_score;
        if (drop > 15) {
          predictions.push({
            patient_name: patient.full_name,
            patient_id: patient.id,
            type: "adherence_drop",
            severity: drop > 30 ? "critical" : "warning",
            score: drop,
            message: `${patient.full_name} teve queda de ${drop.toFixed(0)}% na adesão`,
            action: "Investigar causa e adaptar complexidade do plano",
          });
        }
      }
    }

    predictions.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return (sev[a.severity as keyof typeof sev] || 2) - (sev[b.severity as keyof typeof sev] || 2);
    });

    // DETERMINISTIC narrative (NO AI)
    const narrative = generateDeterministicNarrative(
      predictions,
      patients.length,
      portfolioRes.data,
      (milestonesRes.data || []).length,
    );

    return new Response(JSON.stringify({
      predictions,
      narrative,
      summary: {
        total_patients: patients.length,
        at_risk: predictions.filter((p: any) => p.type === "dropout_risk").length,
        plateaus: predictions.filter((p: any) => p.type === "plateau").length,
        adherence_drops: predictions.filter((p: any) => p.type === "adherence_drop").length,
        critical_count: predictions.filter((p: any) => p.severity === "critical").length,
        upcoming_milestones: (milestonesRes.data || []).length,
      },
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ifj-predictive-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
