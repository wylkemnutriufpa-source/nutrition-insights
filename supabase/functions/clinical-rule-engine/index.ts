import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Signal {
  signal_key: string;
  severity: string;
  value: number | null;
  context: Record<string, unknown>;
}

interface RuleMatch {
  rule_key: string;
  rule_name: string;
  category: string;
  priority: number;
  score: number;
  target_audience: string;
  matched_signals: string[];
  recommendations: Array<{
    title: string;
    body: string;
    icon: string;
    priority: string;
    action_type: string | null;
    action_route: string | null;
  }>;
}

interface TipMatch {
  tip_key: string;
  content: string;
  icon: string;
  category: string;
  severity: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { patient_id, patient_name, audience } = await req.json();

    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get active signals for this patient
    const { data: activeSignals } = await supabase
      .from("patient_signals")
      .select("signal_key, severity, value, context")
      .eq("patient_id", patient_id)
      .eq("is_active", true);

    const signals: Signal[] = (activeSignals || []) as Signal[];
    const signalMap = new Map<string, Signal>();
    for (const s of signals) {
      signalMap.set(s.signal_key, s);
    }

    // 2. Get all active rules with conditions and recommendations
    const [rulesRes, conditionsRes, ruleRecsRes, recsRes, tipsRes] =
      await Promise.all([
        supabase
          .from("clinical_rules")
          .select("*")
          .eq("is_active", true)
          .order("priority", { ascending: false }),
        supabase.from("clinical_rule_conditions").select("*"),
        supabase
          .from("clinical_rule_recommendations")
          .select("*")
          .order("display_order"),
        supabase
          .from("recommendation_library")
          .select("*")
          .eq("is_active", true),
        supabase
          .from("tip_library")
          .select("*")
          .eq("is_active", true),
      ]);

    const rules = rulesRes.data || [];
    const conditions = conditionsRes.data || [];
    const ruleRecs = ruleRecsRes.data || [];
    const recs = recsRes.data || [];
    const tips = tipsRes.data || [];

    // Index conditions by rule_id
    const conditionsByRule = new Map<string, typeof conditions>();
    for (const c of conditions) {
      const arr = conditionsByRule.get(c.rule_id) || [];
      arr.push(c);
      conditionsByRule.set(c.rule_id, arr);
    }

    // Index recs by id
    const recsById = new Map(recs.map((r) => [r.id, r]));

    // Index rule-recs by rule_id
    const recsByRule = new Map<string, typeof ruleRecs>();
    for (const rr of ruleRecs) {
      const arr = recsByRule.get(rr.rule_id) || [];
      arr.push(rr);
      recsByRule.set(rr.rule_id, arr);
    }

    // 3. Evaluate rules
    const matchedRules: RuleMatch[] = [];

    for (const rule of rules) {
      // Filter by audience if specified
      if (audience && rule.target_audience !== audience) continue;

      const ruleConds = conditionsByRule.get(rule.id) || [];
      if (ruleConds.length === 0) continue;

      let totalWeight = 0;
      let matchedWeight = 0;
      const matchedSignals: string[] = [];
      let requiredMet = true;

      for (const cond of ruleConds) {
        totalWeight += cond.weight;
        const signal = signalMap.get(cond.signal_key);

        let conditionMet = false;
        if (cond.operator === "exists") {
          conditionMet = !!signal;
        } else if (cond.operator === "gte" && signal?.value != null) {
          conditionMet = signal.value >= (cond.threshold || 0);
        } else if (cond.operator === "lte" && signal?.value != null) {
          conditionMet = signal.value <= (cond.threshold || 0);
        } else if (cond.operator === "eq" && signal?.value != null) {
          conditionMet = signal.value === cond.threshold;
        }

        if (conditionMet) {
          matchedWeight += cond.weight;
          matchedSignals.push(cond.signal_key);
        } else if (cond.is_required) {
          requiredMet = false;
        }
      }

      if (!requiredMet) continue;

      const score = totalWeight > 0 ? matchedWeight / totalWeight : 0;
      if (score < rule.min_score) continue;

      // Build recommendations
      const ruleRecMappings = recsByRule.get(rule.id) || [];
      const recommendations = ruleRecMappings
        .map((rr) => {
          const rec = recsById.get(rr.recommendation_id);
          if (!rec) return null;
          return {
            title: rec.title,
            body: renderTemplate(rec.body_template, {
              patient_name: patient_name || "Paciente",
              ...buildTemplateVars(matchedSignals, signals),
            }),
            icon: rec.icon,
            priority: rec.priority,
            action_type: rec.action_type,
            action_route: rec.action_route,
          };
        })
        .filter(Boolean);

      matchedRules.push({
        rule_key: rule.rule_key,
        rule_name: rule.name,
        category: rule.category,
        priority: rule.priority,
        score: Math.round(score * 100) / 100,
        target_audience: rule.target_audience,
        matched_signals: matchedSignals,
        recommendations: recommendations as RuleMatch["recommendations"],
      });
    }

    // Sort by priority desc
    matchedRules.sort((a, b) => b.priority - a.priority);

    // 4. Match tips based on active signals
    const matchedTips: TipMatch[] = [];
    for (const tip of tips) {
      if (tip.signal_key && signalMap.has(tip.signal_key)) {
        matchedTips.push({
          tip_key: tip.tip_key,
          content: renderTemplate(tip.content, {
            patient_name: patient_name || "Paciente",
            ...buildTemplateVars(
              [tip.signal_key],
              signals
            ),
          }),
          icon: tip.icon,
          category: tip.category,
          severity: tip.severity,
        });
      }
    }

    return new Response(
      JSON.stringify({
        patient_id,
        total_signals: signals.length,
        matched_rules: matchedRules.length,
        matched_tips: matchedTips.length,
        rules: matchedRules,
        tips: matchedTips,
        signals_summary: signals.map((s) => ({
          key: s.signal_key,
          severity: s.severity,
          value: s.value,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rule engine error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Simple template renderer: replaces {{variable}} with values
 */
function renderTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return vars[key] != null ? String(vars[key]) : `{{${key}}}`;
  });
}

/**
 * Build template variables from matched signals
 */
function buildTemplateVars(
  matchedKeys: string[],
  allSignals: Signal[]
): Record<string, string | number> {
  const vars: Record<string, string | number> = {};

  for (const key of matchedKeys) {
    const signal = allSignals.find((s) => s.signal_key === key);
    if (!signal) continue;

    const ctx = signal.context || {};

    switch (key) {
      case "inactive_7d":
      case "inactive_14d":
        vars.days_inactive = signal.value || 0;
        break;
      case "low_checklist_adherence":
        vars.adherence_pct = signal.value || 0;
        break;
      case "low_meal_adherence":
        vars.adherence_pct = signal.value || 0;
        break;
      case "high_streak":
        vars.streak_days = signal.value || 0;
        break;
      case "weight_stagnation":
        vars.weeks_stagnated = (ctx.weeks as number) || signal.value || 0;
        break;
      case "no_meal_logged_3d":
      case "no_meal_logged_7d":
        vars.days_without = signal.value || 0;
        break;
      case "perfect_day":
        vars.completed_pct = 100;
        break;
    }
  }

  return vars;
}
