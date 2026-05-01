import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody } from "../_shared/validator.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { ClinicalBrainSchema } from "../_shared/schemas.ts";

/** Resolve tenant_id for a given user */
async function resolveTenant(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.rpc("get_user_tenant", { _user_id: userId });
  return data || null;
}

export async function handler(req: Request, maybeSupabaseClient?: any) {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  const clientKey = authHeader ? "user" : (req.headers.get("x-real-ip") || "anon");

  const { allowed } = await checkRateLimit("compute-clinical-brain", clientKey, 50, 600);
  if (!allowed) return rateLimitResponse();

  // Correctly handle supabase client injection for tests vs runtime
  const supabase = (maybeSupabaseClient && typeof maybeSupabaseClient.from === "function")
    ? maybeSupabaseClient
    : createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

  try {
    const { data: body, response: errorResponse } = await validateBody(req, ClinicalBrainSchema);
    if (errorResponse || !body) return errorResponse || new Response(JSON.stringify({ error: "Missing body" }), { status: 400, headers: corsHeaders });

    const targetPatientId = body.patient_id;
    const pipelineRunId = body.pipeline_run_id;

    // Get active patients
    let query = supabase.from("nutritionist_patients").select("patient_id, nutritionist_id").eq("status", "active");
    if (targetPatientId) query = query.eq("patient_id", targetPatientId);
    const { data: links } = await query.limit(1000);
    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ patients_processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const patientIds = links.map((l: any) => l.patient_id);
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // Batch fetch all data sources
    const [checklistRes, checkinsRes, flagsRes, snapshotsRes, alertsRes, dropoutRes] = await Promise.all([
      supabase.from("checklist_tasks").select("patient_id, completed, date").in("patient_id", patientIds).gte("date", sevenDaysAgo),
      supabase.from("patient_checkins").select("patient_id, weight, mood, energy_level, sleep_quality, water_intake, created_at").in("patient_id", patientIds).order("created_at", { ascending: false }),
      supabase.from("patient_clinical_flags").select("patient_id, flag_key, flag_value").in("patient_id", patientIds).eq("is_active", true),
      supabase.from("clinical_daily_snapshots").select("patient_id, adherence_score, clinical_risk_score, dropout_risk_score").in("patient_id", patientIds).order("snapshot_date", { ascending: false }),
      supabase.from("clinical_alerts").select("patient_id").in("patient_id", patientIds).eq("is_active", true),
      supabase.from("behavioral_recovery_actions").select("patient_id, dropout_risk_score").in("patient_id", patientIds).order("created_at", { ascending: false }),
    ]);

    // Build maps
    const checklistMap = new Map<string, { total: number; completed: number }>();
    (checklistRes.data || []).forEach((t: any) => {
      const entry = checklistMap.get(t.patient_id) || { total: 0, completed: 0 };
      entry.total++;
      if (t.completed) entry.completed++;
      checklistMap.set(t.patient_id, entry);
    });

    const checkinMap = new Map<string, any[]>();
    (checkinsRes.data || []).forEach((c: any) => {
      const arr = checkinMap.get(c.patient_id) || [];
      arr.push(c);
      checkinMap.set(c.patient_id, arr);
    });

    const flagMap = new Map<string, any[]>();
    (flagsRes.data || []).forEach((f: any) => {
      const arr = flagMap.get(f.patient_id) || [];
      arr.push(f);
      flagMap.set(f.patient_id, arr);
    });

    const snapshotMap = new Map<string, any>();
    (snapshotsRes.data || []).forEach((s: any) => {
      if (!snapshotMap.has(s.patient_id)) snapshotMap.set(s.patient_id, s);
    });

    const alertCountMap = new Map<string, number>();
    (alertsRes.data || []).forEach((a: any) => {
      alertCountMap.set(a.patient_id, (alertCountMap.get(a.patient_id) || 0) + 1);
    });

    const dropoutMap = new Map<string, number>();
    (dropoutRes.data || []).forEach((d: any) => {
      if (!dropoutMap.has(d.patient_id)) dropoutMap.set(d.patient_id, d.dropout_risk_score || 0);
    });

    // Compute states
    const states: any[] = [];
    const decisions: any[] = [];

    for (const link of links) {
      const pid = link.patient_id;
      const nid = link.nutritionist_id;

      // ADHERENCE SCORE (checklist completion rate 7d)
      const cl = checklistMap.get(pid);
      const adherenceScore = cl && cl.total > 0 ? Math.round((cl.completed / cl.total) * 100) : 50;

      // METABOLIC SCORE (weight trend + checkins)
      const checkins = checkinMap.get(pid) || [];
      let metabolicScore = 50;
      if (checkins.length >= 2) {
        const latest = checkins[0];
        const oldest = checkins[Math.min(checkins.length - 1, 6)];
        if (latest.weight && oldest.weight) {
          const delta = latest.weight - oldest.weight;
          // Losing weight = good for most, stagnation = moderate
          metabolicScore = delta < -0.5 ? 80 : delta < 0 ? 65 : delta < 0.5 ? 50 : 30;
        }
      }

      // BEHAVIORAL SCORE (mood, sleep, energy from checkins)
      let behavioralScore = 50;
      if (checkins.length > 0) {
        const recentCheckins = checkins.slice(0, 7);
        const moodAvg = recentCheckins.filter((c: any) => c.mood).length > 0
          ? recentCheckins.reduce((s: number, c: any) => s + (c.mood === "great" ? 90 : c.mood === "good" ? 70 : c.mood === "neutral" ? 50 : c.mood === "bad" ? 30 : 50), 0) / recentCheckins.length
          : 50;
        const sleepAvg = recentCheckins.filter((c: any) => c.sleep_quality).length > 0
          ? recentCheckins.reduce((s: number, c: any) => s + (c.sleep_quality || 5) * 10, 0) / recentCheckins.length
          : 50;
        behavioralScore = Math.round((moodAvg + sleepAvg) / 2);
      }

      // ENGAGEMENT SCORE (checkin frequency + checklist activity)
      const recentCheckinCount = checkins.filter((c: any) => new Date(c.created_at) > new Date(sevenDaysAgo)).length;
      const engagementScore = Math.min(100, Math.round((recentCheckinCount / 7) * 60 + (adherenceScore * 0.4)));

      // RISK SCORE
      const dropoutRisk = dropoutMap.get(pid) || 0;
      const alertCount = alertCountMap.get(pid) || 0;
      const flagCount = (flagMap.get(pid) || []).length;
      const riskScore = Math.min(100, Math.round(dropoutRisk * 0.5 + alertCount * 10 + (100 - adherenceScore) * 0.3));

      // COMPOSITE SCORE
      const compositeScore = Math.round(
        adherenceScore * 0.25 + metabolicScore * 0.2 + behavioralScore * 0.15 +
        engagementScore * 0.2 + (100 - riskScore) * 0.2
      );

      // ZONE CLASSIFICATION
      let zone: string;
      if (riskScore >= 70) zone = "clinical_risk";
      else if (riskScore >= 50 || adherenceScore < 30) zone = "potential_abandonment";
      else if (compositeScore >= 80) zone = "high_performance";
      else if (compositeScore >= 60) zone = "accelerated_evolution";
      else zone = "metabolic_adaptation";

      // Resolve tenant from nutritionist
      const tenantId = await resolveTenant(supabase, nid);

      states.push({
        patient_id: pid,
        zone,
        composite_score: compositeScore,
        adherence_score: adherenceScore,
        metabolic_score: metabolicScore,
        behavioral_score: behavioralScore,
        engagement_score: engagementScore,
        risk_score: riskScore,
        updated_at: new Date().toISOString(),
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });

      // DECISION GENERATION
      const existingSnapshot = snapshotMap.get(pid);

      // Resolve tenant for decisions
      const decTenantId = await resolveTenant(supabase, nid);
      const tenantSpread = decTenantId ? { tenant_id: decTenantId } : {};

      if (adherenceScore < 40) {
        decisions.push({
          patient_id: pid, nutritionist_id: nid,
          decision_type: "simplify_plan", title: "Simplificar plano alimentar",
          reason: `Adesão de ${adherenceScore}% nos últimos 7 dias — plano pode estar complexo demais`,
          urgency: adherenceScore < 20 ? "critical" : "high",
          confidence: Math.min(95, 60 + (40 - adherenceScore)),
          expected_impact: "Aumento de adesão em 15-25% com simplificação",
          status: "pending",
          ...tenantSpread,
        });
      }

      if (metabolicScore < 35 && checkins.length >= 3) {
        decisions.push({
          patient_id: pid, nutritionist_id: nid,
          decision_type: "adjust_calories", title: "Ajustar calorias",
          reason: "Tendência de ganho de peso detectada — possível necessidade de ajuste calórico",
          urgency: "high", confidence: 70,
          expected_impact: "Retomada da perda de peso em 2-3 semanas",
          status: "pending",
          ...tenantSpread,
        });
      }

      if (zone === "potential_abandonment") {
        decisions.push({
          patient_id: pid, nutritionist_id: nid,
          decision_type: "engagement_strategy", title: "Estratégia de engajamento",
          reason: `Paciente em zona de abandono potencial (score: ${compositeScore})`,
          urgency: "critical", confidence: 85,
          expected_impact: "Prevenção de abandono com intervenção proativa",
          status: "pending",
          ...tenantSpread,
        });
      }

      const waterCheckins = checkins.filter((c: any) => c.water_intake !== null && c.water_intake < 1500);
      if (waterCheckins.length >= 3) {
        decisions.push({
          patient_id: pid, nutritionist_id: nid,
          decision_type: "hydration_boost", title: "Reforçar hidratação",
          reason: `Consumo médio de água abaixo de 1.5L em ${waterCheckins.length} check-ins recentes`,
          urgency: "medium", confidence: 80,
          expected_impact: "Melhora metabólica e disposição com hidratação adequada",
          status: "pending",
          ...tenantSpread,
        });
      }
    }

    // Upsert states
    const batchSize = 50;
    for (let i = 0; i < states.length; i += batchSize) {
      await supabase.from("patient_clinical_state").upsert(states.slice(i, i + batchSize), { onConflict: "patient_id" });
    }

    // Insert decisions (avoid duplicates)
    for (const dec of decisions) {
      const { data: existing } = await supabase
        .from("clinical_decisions")
        .select("id")
        .eq("patient_id", dec.patient_id)
        .eq("decision_type", dec.decision_type)
        .eq("status", "pending")
        .limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from("clinical_decisions").insert(dec);
      }
    }

    // Update learning profiles
    for (const link of links) {
      const pid = link.patient_id;
      const checkins = checkinMap.get(pid) || [];
      if (checkins.length < 5) continue;

      // Best adherence hours
      const hourCounts: Record<number, number> = {};
      checkins.forEach((c: any) => {
        const h = new Date(c.created_at).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      });
      const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "12";

      // Consistency pattern
      const cl = checklistMap.get(pid);
      const adherence = cl && cl.total > 0 ? Math.round((cl.completed / cl.total) * 100) : 0;
      const consistencyLevel = adherence >= 80 ? "high" : adherence >= 50 ? "moderate" : "low";

      await supabase.from("patient_clinical_learning_profile").upsert({
        patient_id: pid,
        best_adherence_hour: parseInt(bestHour),
        consistency_level: consistencyLevel,
        checkin_frequency: checkins.length,
        preferred_checkin_time: `${bestHour}:00`,
        response_to_notifications: checkins.length > 10 ? "responsive" : "moderate",
        emotional_pattern: checkins.some((c: any) => c.mood === "bad") ? "variable" : "stable",
        updated_at: new Date().toISOString(),
      }, { onConflict: "patient_id" });
    }

    // Update relationship scores + CRM stages
    for (const link of links) {
      const pid = link.patient_id;
      const checkins = checkinMap.get(pid) || [];
      const cl = checklistMap.get(pid);
      const adherence = cl && cl.total > 0 ? (cl.completed / cl.total) * 100 : 0;
      const recentCheckins = checkins.filter((c: any) => new Date(c.created_at) > new Date(sevenDaysAgo)).length;
      const engagementRaw = Math.min(100, recentCheckins * 15 + adherence * 0.4);

      const relationshipScore = Math.round(adherence * 0.4 + engagementRaw * 0.3 + (checkins.length > 0 ? 30 : 0));
      const engagementLevel = relationshipScore >= 80 ? "engaged" : relationshipScore >= 60 ? "stable" : relationshipScore >= 40 ? "attention" : "high_risk";
      const churnRisk = Math.max(0, 100 - relationshipScore);
      const upgradeScore = relationshipScore >= 70 && adherence >= 60 ? Math.min(100, Math.round(relationshipScore * 0.8 + adherence * 0.2)) : Math.round(relationshipScore * 0.3);

      await supabase.from("patient_relationship_scores").upsert({
        patient_id: pid,
        relationship_score: relationshipScore,
        engagement_level: engagementLevel,
        churn_risk_score: churnRisk,
        upgrade_moment_score: upgradeScore,
        updated_at: new Date().toISOString(),
      }, { onConflict: "patient_id" });
    }

    return new Response(JSON.stringify({
      patients_processed: states.length,
      decisions_generated: decisions.length,
      learning_profiles_updated: links.length,
      scores_updated: links.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Clinical brain error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
