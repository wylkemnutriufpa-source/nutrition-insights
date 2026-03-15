import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v * 10) / 10));
}

// ── Recovery Physiological Index (RPI) ──────────────────────
function calculateRPI(signals: any[]): number {
  if (!signals.length) return 50; // neutral fallback
  const latest = signals[0];
  let score = 50;

  // HRV component (higher = better recovery) — weight 35%
  if (latest.heart_rate_variability != null) {
    const hrvNorm = Math.min(latest.heart_rate_variability / 80, 1) * 100;
    score += (hrvNorm - 50) * 0.35;
  }

  // Sleep component — weight 30%
  if (latest.sleep_duration_minutes != null) {
    const sleepHours = latest.sleep_duration_minutes / 60;
    const sleepNorm = Math.min(sleepHours / 8, 1) * 100;
    score += (sleepNorm - 50) * 0.20;
  }
  if (latest.sleep_quality_score != null) {
    score += (latest.sleep_quality_score - 50) * 0.10;
  }

  // Resting HR (lower = better) — weight 20%
  if (latest.resting_heart_rate != null) {
    const hrNorm = Math.max(0, 100 - (latest.resting_heart_rate - 45) * 1.5);
    score += (hrNorm - 50) * 0.20;
  }

  // Readiness — weight 15%
  if (latest.readiness_score != null) {
    score += (latest.readiness_score - 50) * 0.15;
  }

  return clamp(score);
}

// ── Physiological Stress Index (PSI) ────────────────────────
function calculatePSI(signals: any[]): number {
  if (!signals.length) return 30; // neutral fallback
  const latest = signals[0];
  let stress = 30;

  // Direct stress index — weight 30%
  if (latest.stress_index != null) {
    stress += (latest.stress_index - 30) * 0.30;
  }

  // HRV dropping (compare 7d trend) — weight 25%
  if (signals.length >= 3 && latest.heart_rate_variability != null) {
    const recent3 = signals.slice(0, 3).filter((s: any) => s.heart_rate_variability != null);
    if (recent3.length >= 2) {
      const avgRecent = recent3.reduce((s: number, r: any) => s + r.heart_rate_variability, 0) / recent3.length;
      const older = signals.slice(3).filter((s: any) => s.heart_rate_variability != null);
      if (older.length > 0) {
        const avgOlder = older.reduce((s: number, r: any) => s + r.heart_rate_variability, 0) / older.length;
        if (avgRecent < avgOlder * 0.85) stress += 15; // significant drop
        else if (avgRecent < avgOlder * 0.92) stress += 8;
      }
    }
  }

  // Poor sleep — weight 25%
  if (latest.sleep_duration_minutes != null && latest.sleep_duration_minutes < 360) {
    stress += 15;
  } else if (latest.sleep_duration_minutes != null && latest.sleep_duration_minutes < 420) {
    stress += 8;
  }

  // High training load — weight 20%
  if (latest.training_load_score != null && latest.training_load_score > 80) {
    stress += 12;
  } else if (latest.training_load_score != null && latest.training_load_score > 60) {
    stress += 6;
  }

  return clamp(stress);
}

// ── Training Load Balance (TLB) ─────────────────────────────
function calculateTLB(signals: any[]): string {
  if (signals.length < 7) return "optimal"; // not enough data

  const last7 = signals.slice(0, 7);
  const last28 = signals.slice(0, 28);

  const acuteLoad = last7.reduce((s: number, r: any) => s + (r.training_load_score || 0), 0) / Math.max(last7.length, 1);
  const chronicLoad = last28.reduce((s: number, r: any) => s + (r.training_load_score || 0), 0) / Math.max(last28.length, 1);

  if (chronicLoad === 0) return "optimal";

  const ratio = acuteLoad / chronicLoad;

  if (ratio > 1.5) return "overloaded";
  if (ratio < 0.6) return "undertrained";
  return "optimal";
}

// ── Physiological Risk Level ────────────────────────────────
function classifyPhysioRisk(rpi: number, psi: number, tlb: string): string {
  if (psi > 75 || rpi < 30 || tlb === "overloaded") return "critical";
  if (psi > 55 || rpi < 45) return "high";
  if (psi > 40 || rpi < 60) return "moderate";
  return "low";
}

// ── Trend calculation ───────────────────────────────────────
function calcTrend(values: number[]): string {
  if (values.length < 3) return "stable";
  const recent = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const older = values.slice(3).reduce((a, b) => a + b, 0) / Math.max(values.slice(3).length, 1);
  if (recent > older * 1.08) return "improving";
  if (recent < older * 0.92) return "declining";
  return "stable";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log(`[PHYSIO-ENGINE] v${ENGINE_VERSION} starting`);

    // Get patients with physiological signals in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    
    const { data: recentSignals, error: sigErr } = await supabase
      .from("patient_physiological_signals")
      .select("patient_id")
      .gte("signal_date", sevenDaysAgo);

    if (sigErr) throw sigErr;

    const patientIds = [...new Set((recentSignals || []).map((s: any) => s.patient_id))];
    console.log(`[PHYSIO-ENGINE] Processing ${patientIds.length} patients with signals`);

    if (patientIds.length === 0) {
      return new Response(JSON.stringify({ version: ENGINE_VERSION, patients_processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    const today = new Date().toISOString().split("T")[0];

    for (const patientId of patientIds) {
      try {
        // Load last 28 days of signals
        const twentyEightDaysAgo = new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];
        const { data: signals } = await supabase
          .from("patient_physiological_signals")
          .select("*")
          .eq("patient_id", patientId)
          .gte("signal_date", twentyEightDaysAgo)
          .order("signal_date", { ascending: false })
          .limit(28);

        if (!signals || signals.length === 0) continue;

        // Calculate indices
        const rpi = calculateRPI(signals);
        const psi = calculatePSI(signals);
        const tlb = calculateTLB(signals);
        const riskLevel = classifyPhysioRisk(rpi, psi, tlb);

        // Trends
        const hrValues = signals.filter((s: any) => s.resting_heart_rate != null).map((s: any) => s.resting_heart_rate);
        const hrvValues = signals.filter((s: any) => s.heart_rate_variability != null).map((s: any) => s.heart_rate_variability);
        const sleepValues = signals.filter((s: any) => s.sleep_duration_minutes != null).map((s: any) => s.sleep_duration_minutes);

        const restingHrTrend = calcTrend(hrValues);
        const hrvTrend = calcTrend(hrvValues);
        const sleepTrend = calcTrend(sleepValues);

        // Upsert snapshot
        await supabase.from("patient_physiology_snapshots").upsert({
          patient_id: patientId,
          snapshot_date: today,
          rpi,
          psi,
          training_load_balance: tlb,
          physiological_risk_level: riskLevel,
          has_physiological_data: true,
          resting_hr_trend: restingHrTrend,
          hrv_trend: hrvTrend,
          sleep_trend: sleepTrend,
          metadata: {
            signals_count: signals.length,
            latest_signal_date: signals[0].signal_date,
          },
          engine_version: ENGINE_VERSION,
        }, { onConflict: "patient_id,snapshot_date" });

        // Generate alerts for critical states
        if (riskLevel === "critical" || riskLevel === "high") {
          const alertTypes: { type: string; condition: boolean; desc: string }[] = [
            { type: "high_physiological_stress", condition: psi > 70, desc: `PSI elevado: ${psi.toFixed(1)}` },
            { type: "recovery_deficit", condition: rpi < 35, desc: `RPI baixo: ${rpi.toFixed(1)}` },
            { type: "overload_risk", condition: tlb === "overloaded", desc: "Carga de treino acima do crônico" },
            { type: "sleep_deprivation_pattern", condition: sleepTrend === "declining" && (signals[0]?.sleep_duration_minutes || 480) < 360, desc: "Padrão de privação de sono detectado" },
          ];

          // Find nutritionist for this patient
          const { data: link } = await supabase
            .from("nutritionist_patients")
            .select("nutritionist_id")
            .eq("patient_id", patientId)
            .eq("status", "active")
            .limit(1)
            .single();

          if (link) {
            for (const alert of alertTypes) {
              if (alert.condition) {
                await supabase.from("clinical_alerts").insert({
                  patient_id: patientId,
                  nutritionist_id: link.nutritionist_id,
                  alert_type: alert.type,
                  title: `Alerta Fisiológico: ${alert.type.replace(/_/g, " ")}`,
                  description: alert.desc,
                  severity: riskLevel === "critical" ? "critical" : "high",
                  trigger_source: "physio_engine",
                  metadata: { rpi, psi, tlb, engine_version: ENGINE_VERSION },
                });
              }
            }
          }
        }

        results.push({ patient_id: patientId, rpi, psi, tlb, risk: riskLevel });
      } catch (pErr) {
        console.error(`[PHYSIO-ENGINE] Error for patient ${patientId}:`, pErr);
      }
    }

    console.log(`[PHYSIO-ENGINE] Done. ${results.length} patients processed`);

    return new Response(JSON.stringify({
      version: ENGINE_VERSION,
      patients_processed: results.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[PHYSIO-ENGINE] Fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
