import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";
const MIN_SAMPLE_SIZE = 8;

interface ProtocolStats {
  protocol_id: string;
  protocol_name: string;
  total_applications: number;
  avg_adherence: number;
  avg_weight_response_14d: number;
  avg_weight_response_30d: number;
  stagnation_rate: number;
  dropout_rate: number;
  alert_rate: number;
  metabolic_stability: number;
}

interface ClusterStats extends ProtocolStats {
  cluster_type: string;
  sample_size: number;
}

function computeEffectivenessScore(stats: {
  avg_weight_response: number;
  avg_adherence: number;
  stagnation_rate: number;
  dropout_rate: number;
  metabolic_stability: number;
}): number {
  // Normalize weight response to 0-100 scale (0.5 kg/week loss = 100)
  const weightScore = Math.min(100, Math.abs(stats.avg_weight_response) * 200);
  
  const score =
    weightScore * 0.35 +
    stats.avg_adherence * 0.25 +
    (100 - stats.stagnation_rate) * 0.15 +
    (100 - stats.dropout_rate) * 0.15 +
    stats.metabolic_stability * 0.10;

  return Math.max(0, Math.min(100, score));
}

function classifyTier(score: number): string {
  if (score >= 85) return "elite";
  if (score >= 70) return "alta_performance";
  if (score >= 50) return "performance_estavel";
  if (score >= 30) return "risco_terapeutico";
  return "protocolo_fraco";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Load all protocols
    const { data: protocols } = await supabase
      .from("nutrition_protocols")
      .select("id, protocol_name, protocol_slug");

    if (!protocols?.length) {
      return new Response(JSON.stringify({ message: "No protocols found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load active meal plans with protocol associations
    const { data: mealPlans } = await supabase
      .from("meal_plans")
      .select("id, patient_id, template_slug, therapeutic_efficacy_score, therapeutic_effectiveness_status, created_at")
      .not("template_slug", "is", null);

    // 3. Load patient clinical snapshots (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: snapshots } = await supabase
      .from("patient_clinical_snapshots")
      .select("patient_id, weight_velocity, adherence_score, trend_status, engagement_stability_index, snapshot_date")
      .gte("snapshot_date", thirtyDaysAgo.toISOString());

    // 4. Load metabolic clusters
    const { data: clusters } = await supabase
      .from("patient_metabolic_clusters")
      .select("patient_id, cluster_type");

    // 5. Load checkins for stagnation detection
    const { data: checkins } = await supabase
      .from("patient_checkins")
      .select("patient_id, weight, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // 6. Load engagement signals for dropout
    const { data: signals } = await supabase
      .from("engagement_signals")
      .select("patient_id, signal_type, severity")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Build lookup maps
    const clusterMap = new Map<string, string>();
    (clusters || []).forEach((c: any) => clusterMap.set(c.patient_id, c.cluster_type));

    const snapshotMap = new Map<string, any[]>();
    (snapshots || []).forEach((s: any) => {
      const list = snapshotMap.get(s.patient_id) || [];
      list.push(s);
      snapshotMap.set(s.patient_id, list);
    });

    const signalMap = new Map<string, any[]>();
    (signals || []).forEach((s: any) => {
      const list = signalMap.get(s.patient_id) || [];
      list.push(s);
      signalMap.set(s.patient_id, list);
    });

    // Map protocol_slug to protocol_id
    const slugToProtocol = new Map<string, { id: string; name: string }>();
    protocols.forEach((p: any) => slugToProtocol.set(p.protocol_slug, { id: p.id, name: p.protocol_name }));

    // 7. Aggregate by protocol
    const protocolAgg = new Map<string, { patients: Set<string>; adherences: number[]; weightVelocities14: number[]; weightVelocities30: number[]; stagnated: number; dropped: number; alerts: number; stabilities: number[] }>();
    const clusterProtocolAgg = new Map<string, typeof protocolAgg extends Map<string, infer V> ? V : never>();

    (mealPlans || []).forEach((mp: any) => {
      const proto = slugToProtocol.get(mp.template_slug);
      if (!proto) return;

      const patientSnapshots = snapshotMap.get(mp.patient_id) || [];
      const patientSignals = signalMap.get(mp.patient_id) || [];
      const cluster = clusterMap.get(mp.patient_id) || "unknown";

      if (!protocolAgg.has(proto.id)) {
        protocolAgg.set(proto.id, { patients: new Set(), adherences: [], weightVelocities14: [], weightVelocities30: [], stagnated: 0, dropped: 0, alerts: 0, stabilities: [] });
      }
      const agg = protocolAgg.get(proto.id)!;
      
      if (agg.patients.has(mp.patient_id)) return; // deduplicate
      agg.patients.add(mp.patient_id);

      // Adherence from snapshots
      const avgAdherence = patientSnapshots.length > 0
        ? patientSnapshots.reduce((s: number, snap: any) => s + (snap.adherence_score || 0), 0) / patientSnapshots.length
        : 50;
      agg.adherences.push(avgAdherence);

      // Weight velocity
      const velocities = patientSnapshots.filter((s: any) => s.weight_velocity != null).map((s: any) => s.weight_velocity);
      if (velocities.length > 0) {
        const avgVel = velocities.reduce((a: number, b: number) => a + b, 0) / velocities.length;
        agg.weightVelocities14.push(avgVel);
        agg.weightVelocities30.push(avgVel);
      }

      // Stagnation
      const stagnated = patientSnapshots.some((s: any) => s.trend_status === "stagnated" || s.trend_status === "plateau");
      if (stagnated) agg.stagnated++;

      // Dropout signals
      const hasDropout = patientSignals.some((s: any) => s.signal_type === "dropout_risk" || s.severity === "critical");
      if (hasDropout) agg.dropped++;

      // Alerts
      const alertCount = patientSignals.filter((s: any) => s.severity === "high" || s.severity === "critical").length;
      if (alertCount > 0) agg.alerts++;

      // Stability
      const stability = patientSnapshots.length > 0
        ? patientSnapshots.reduce((s: number, snap: any) => s + (snap.engagement_stability_index || 50), 0) / patientSnapshots.length
        : 50;
      agg.stabilities.push(stability);

      // Cluster aggregation
      const clusterKey = `${proto.id}::${cluster}`;
      if (!clusterProtocolAgg.has(clusterKey)) {
        clusterProtocolAgg.set(clusterKey, { patients: new Set(), adherences: [], weightVelocities14: [], weightVelocities30: [], stagnated: 0, dropped: 0, alerts: 0, stabilities: [] });
      }
      const cAgg = clusterProtocolAgg.get(clusterKey)!;
      cAgg.patients.add(mp.patient_id);
      cAgg.adherences.push(avgAdherence);
      if (velocities.length > 0) {
        const avgVel = velocities.reduce((a: number, b: number) => a + b, 0) / velocities.length;
        cAgg.weightVelocities14.push(avgVel);
        cAgg.weightVelocities30.push(avgVel);
      }
      if (stagnated) cAgg.stagnated++;
      if (hasDropout) cAgg.dropped++;
      if (alertCount > 0) cAgg.alerts++;
      cAgg.stabilities.push(stability);
    });

    // 8. Compute protocol scores and update protocol_clinical_performance
    const protocolResults: ProtocolStats[] = [];
    
    for (const [protoId, agg] of protocolAgg.entries()) {
      const proto = protocols.find((p: any) => p.id === protoId);
      const total = agg.patients.size;
      
      const avgAdherence = agg.adherences.length > 0
        ? agg.adherences.reduce((a, b) => a + b, 0) / agg.adherences.length : 0;
      const avgWV14 = agg.weightVelocities14.length > 0
        ? agg.weightVelocities14.reduce((a, b) => a + b, 0) / agg.weightVelocities14.length : 0;
      const avgWV30 = agg.weightVelocities30.length > 0
        ? agg.weightVelocities30.reduce((a, b) => a + b, 0) / agg.weightVelocities30.length : 0;
      const stagnationRate = total > 0 ? (agg.stagnated / total) * 100 : 0;
      const dropoutRate = total > 0 ? (agg.dropped / total) * 100 : 0;
      const alertRate = total > 0 ? (agg.alerts / total) * 100 : 0;
      const metabolicStability = agg.stabilities.length > 0
        ? agg.stabilities.reduce((a, b) => a + b, 0) / agg.stabilities.length : 50;

      const score = total >= MIN_SAMPLE_SIZE
        ? computeEffectivenessScore({ avg_weight_response: avgWV30, avg_adherence: avgAdherence, stagnation_rate: stagnationRate, dropout_rate: dropoutRate, metabolic_stability: metabolicStability })
        : 0;

      const tier = total >= MIN_SAMPLE_SIZE ? classifyTier(score) : "amostra_insuficiente";

      // Upsert protocol_clinical_performance
      await supabase.from("protocol_clinical_performance").upsert({
        protocol_id: protoId,
        total_applications: total,
        avg_adherence: Math.round(avgAdherence * 10) / 10,
        avg_weight_response: Math.round(avgWV30 * 1000) / 1000,
        avg_weight_response_14d: Math.round(avgWV14 * 1000) / 1000,
        avg_weight_response_30d: Math.round(avgWV30 * 1000) / 1000,
        stagnation_rate: Math.round(stagnationRate * 10) / 10,
        dropout_rate: Math.round(dropoutRate * 10) / 10,
        alert_rate: Math.round(alertRate * 10) / 10,
        metabolic_stability: Math.round(metabolicStability * 10) / 10,
        metabolic_success_score: Math.round(score * 10) / 10,
        effectiveness_tier: tier,
        engine_version: ENGINE_VERSION,
        last_updated: new Date().toISOString(),
      }, { onConflict: "protocol_id" });

      protocolResults.push({
        protocol_id: protoId,
        protocol_name: proto?.protocol_name || "",
        total_applications: total,
        avg_adherence: avgAdherence,
        avg_weight_response_14d: avgWV14,
        avg_weight_response_30d: avgWV30,
        stagnation_rate: stagnationRate,
        dropout_rate: dropoutRate,
        alert_rate: alertRate,
        metabolic_stability: metabolicStability,
      });
    }

    // 9. Compute cluster × protocol matrix
    for (const [key, agg] of clusterProtocolAgg.entries()) {
      const [protoId, cluster] = key.split("::");
      const total = agg.patients.size;
      if (total < 3) continue; // need at least 3 for cluster stats

      const avgAdherence = agg.adherences.reduce((a, b) => a + b, 0) / agg.adherences.length;
      const avgWV = agg.weightVelocities30.length > 0
        ? agg.weightVelocities30.reduce((a, b) => a + b, 0) / agg.weightVelocities30.length : 0;
      const stagnationRate = (agg.stagnated / total) * 100;
      const dropoutRate = (agg.dropped / total) * 100;
      const metabolicStability = agg.stabilities.reduce((a, b) => a + b, 0) / agg.stabilities.length;

      const score = computeEffectivenessScore({
        avg_weight_response: avgWV,
        avg_adherence: avgAdherence,
        stagnation_rate: stagnationRate,
        dropout_rate: dropoutRate,
        metabolic_stability: metabolicStability,
      });

      await supabase.from("cluster_protocol_matrix").upsert({
        protocol_id: protoId,
        cluster_type: cluster,
        sample_size: total,
        avg_adherence: Math.round(avgAdherence * 10) / 10,
        avg_weight_response: Math.round(avgWV * 1000) / 1000,
        stagnation_rate: Math.round(stagnationRate * 10) / 10,
        dropout_rate: Math.round(dropoutRate * 10) / 10,
        success_score: Math.round(score * 10) / 10,
        effectiveness_tier: classifyTier(score),
        last_updated: new Date().toISOString(),
      }, { onConflict: "protocol_id,cluster_type" });
    }

    // 10. Compute clinic evolution metrics (per nutritionist)
    const { data: nutritionists } = await supabase
      .from("nutritionist_patients")
      .select("nutritionist_id")
      .eq("status", "active");

    const nutIds = [...new Set((nutritionists || []).map((n: any) => n.nutritionist_id))];

    for (const nutId of nutIds) {
      const { data: nutPatients } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", nutId)
        .eq("status", "active");

      const patIds = (nutPatients || []).map((p: any) => p.patient_id);
      if (patIds.length === 0) continue;

      // Get snapshots for these patients
      const nutSnapshots = patIds.flatMap(pid => snapshotMap.get(pid) || []);
      const avgVelocity = nutSnapshots.length > 0
        ? nutSnapshots.filter(s => s.weight_velocity != null).reduce((a: number, s: any) => a + Math.abs(s.weight_velocity || 0), 0) / Math.max(1, nutSnapshots.filter(s => s.weight_velocity != null).length)
        : 0;

      const atRisk = patIds.filter(pid => {
        const sigs = signalMap.get(pid) || [];
        return sigs.some(s => s.severity === "critical" || s.severity === "high");
      }).length;

      const { data: perfData } = await supabase
        .from("protocol_clinical_performance")
        .select("metabolic_success_score, metabolic_stability, protocol_id")
        .gt("total_applications", 0);

      const scores = (perfData || []).map((p: any) => p.metabolic_success_score || 0);
      const avgEfficacy = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
      const stabilities = (perfData || []).map((p: any) => p.metabolic_stability || 50);
      const avgStability = stabilities.length > 0 ? stabilities.reduce((a: number, b: number) => a + b, 0) / stabilities.length : 50;

      const sorted = (perfData || []).sort((a: any, b: any) => (b.metabolic_success_score || 0) - (a.metabolic_success_score || 0));
      const topProto = sorted[0];
      const worstProto = sorted[sorted.length - 1];

      const topName = topProto ? protocols.find((p: any) => p.id === topProto.protocol_id)?.protocol_name : null;
      const worstName = worstProto ? protocols.find((p: any) => p.id === worstProto.protocol_id)?.protocol_name : null;

      await supabase.from("clinic_clinical_evolution_metrics").upsert({
        nutritionist_id: nutId,
        avg_transformation_velocity: Math.round(avgVelocity * 1000) / 1000,
        base_at_risk_percent: patIds.length > 0 ? Math.round((atRisk / patIds.length) * 1000) / 10 : 0,
        avg_protocol_efficacy: Math.round(avgEfficacy * 10) / 10,
        avg_metabolic_stability: Math.round(avgStability * 10) / 10,
        total_patients_analyzed: patIds.length,
        total_protocols_analyzed: (perfData || []).length,
        top_protocol_id: topProto?.protocol_id || null,
        top_protocol_name: topName || null,
        worst_protocol_id: worstProto?.protocol_id || null,
        worst_protocol_name: worstName || null,
        engine_version: ENGINE_VERSION,
        computed_at: new Date().toISOString(),
      }, { onConflict: "nutritionist_id" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        engine_version: ENGINE_VERSION,
        protocols_analyzed: protocolResults.length,
        cluster_entries: clusterProtocolAgg.size,
        nutritionists_analyzed: nutIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
