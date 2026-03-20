import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PRIORITY_TASKS = 5;

/** Map lifecycle state → clinical phase label */
function resolvePhase(lifecycleState: string | null): string {
  switch (lifecycleState) {
    case "onboarding_started":
    case "onboarding_ready_for_plan":
      return "onboarding";
    case "plan_pending_production":
    case "plan_delivered":
      return "adaptacao_inicial";
    case "active_followup":
      return "aderencia";
    case "clinical_attention":
      return "ajuste_terapeutico";
    case "maintenance_mode":
      return "manutencao";
    case "retention_risk":
      return "recuperacao";
    default:
      return "aderencia";
  }
}

/** Normalize objective from anamnesis goal text */
function normalizeObjective(goal: string | null): string {
  if (!goal) return "geral";
  const g = goal.toLowerCase();
  if (g.includes("emagrec") || g.includes("perda") || g.includes("peso") || g === "lose_weight" || g === "weight_loss") return "emagrecimento";
  if (g.includes("hipertrofia") || g.includes("massa") || g.includes("muscul") || g === "gain_muscle" || g === "muscle_gain") return "hipertrofia";
  if (g.includes("recompos") || g === "body_recomposition") return "recomposicao";
  if (g.includes("digest") || g.includes("gastri") || g.includes("intestin")) return "clinico_digestivo";
  if (g.includes("metabol") || g.includes("insulin") || g.includes("diabetes")) return "clinico_metabolico";
  if (g.includes("mantene") || g.includes("manut") || g === "maintain" || g === "maintenance") return "manutencao";
  if (g.includes("health") || g === "health" || g === "saude") return "emagrecimento";
  if (g.includes("self_esteem") || g.includes("autoestima")) return "emagrecimento";
  return "geral";
}

/** Normalize strategy from anamnesis answers */
function normalizeStrategy(answers: Record<string, any> | null): string {
  if (!answers) return "geral";
  const diet = (answers.preferred_diet || answers.dietary_preference || "").toLowerCase();
  if (diet.includes("low carb") || diet.includes("low_carb")) return "low_carb";
  if (diet.includes("ceto") || diet.includes("keto")) return "cetogenica";
  if (diet.includes("proteina") || diet.includes("protein")) return "alta_proteina";
  if (diet.includes("anti") && diet.includes("inflam")) return "anti_inflamatoria";
  if (diet.includes("vegan") || diet.includes("vegetarian")) return "plant_based";
  if (diet.includes("mediter")) return "mediterranea";
  return "reeducacao_alimentar";
}

/** Score how well a rule matches the patient context (0-100) */
function scoreRuleRelevance(
  rule: any,
  objective: string,
  strategy: string,
  phase: string,
  flagConfidence: number
): { score: number; reason: string } {
  let score = rule.priority * 10; // base from priority (0-100)
  const reasons: string[] = [];

  // Objective match bonus
  if (rule.objective_context) {
    const contexts = rule.objective_context.split(",").map((s: string) => s.trim().toLowerCase());
    if (contexts.includes(objective) || contexts.includes("all")) {
      score += 25;
      reasons.push(`objetivo:${objective}`);
    } else {
      score -= 15; // penalty for mismatch
      reasons.push(`objetivo fora de contexto`);
    }
  } else {
    reasons.push("regra universal");
  }

  // Strategy match bonus
  if (rule.strategy_context) {
    const strategies = rule.strategy_context.split(",").map((s: string) => s.trim().toLowerCase());
    if (strategies.includes(strategy) || strategies.includes("all")) {
      score += 15;
      reasons.push(`estratégia:${strategy}`);
    } else {
      score -= 10;
    }
  }

  // Phase-based adjustments
  if (phase === "onboarding") {
    // Favor simple, foundational tasks
    if (rule.severity_level === "info" || rule.severity_level === "low") score += 10;
    if (rule.severity_level === "high" || rule.severity_level === "critical") score -= 10;
    reasons.push("fase:onboarding");
  } else if (phase === "ajuste_terapeutico") {
    // Favor clinical tasks
    if (rule.severity_level === "high" || rule.severity_level === "critical") score += 15;
    reasons.push("fase:ajuste");
  } else if (phase === "manutencao") {
    // Favor consistency tasks
    if (rule.severity_level === "info") score += 10;
    reasons.push("fase:manutenção");
  }

  // Flag confidence bonus
  score += Math.round(flagConfidence * 10);

  return { score: Math.max(0, Math.min(100, score)), reason: reasons.join(" | ") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { patient_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get active clinical flags
    const { data: flags } = await supabase
      .from("patient_clinical_flags")
      .select("flag_key, confidence")
      .eq("patient_id", patient_id)
      .eq("is_active", true);

    if (!flags || flags.length === 0) {
      return new Response(JSON.stringify({
        tasks_generated: 0, messages_generated: 0, detail: "No active clinical flags",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const flagKeys = flags.map((f: any) => f.flag_key);
    const flagConfMap = new Map(flags.map((f: any) => [f.flag_key, f.confidence || 0.5]));

    // 2. Get patient context: objective, strategy, lifecycle phase
    const [anamnesisRes, insightsRes, lifecycleRes] = await Promise.all([
      supabase.from("patient_anamnesis")
        .select("answers")
        .eq("user_id", patient_id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("anamnesis_ai_insights")
        .select("primary_goal")
        .eq("user_id", patient_id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.rpc("resolve_patient_lifecycle_state", { _patient_id: patient_id }),
    ]);

    const answers = anamnesisRes.data?.[0]?.answers as Record<string, any> | null;
    const goalText = (insightsRes.data?.[0] as any)?.primary_goal || answers?.goal || null;
    const lifecycleState = (lifecycleRes.data as any)?.lifecycle_state || null;

    const objective = normalizeObjective(goalText);
    const strategy = normalizeStrategy(answers);
    const phase = resolvePhase(lifecycleState);

    // 3. Get behavior rules that match these flags
    const { data: rules } = await supabase
      .from("clinical_behavior_rules")
      .select("*")
      .in("trigger_flag", flagKeys)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({
        tasks_generated: 0, messages_generated: 0, detail: "No matching behavior rules",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Score and rank rules by relevance
    const scoredRules = rules.map((rule: any) => {
      const flagConf = flagConfMap.get(rule.trigger_flag) || 0.5;
      const { score, reason } = scoreRuleRelevance(rule, objective, strategy, phase, flagConf);
      return { ...rule, relevance_score: score, priority_reason: reason };
    }).sort((a: any, b: any) => b.relevance_score - a.relevance_score);

    // 5. Get templates and existing records
    const checklistCodes = scoredRules.map((r: any) => r.checklist_template_code).filter(Boolean);
    const messageCodes = scoredRules.map((r: any) => r.message_template_code).filter(Boolean);

    const [checklistRes, messageRes, existingTasksRes, existingMsgsRes] = await Promise.all([
      checklistCodes.length > 0
        ? supabase.from("clinical_checklist_templates").select("*").in("template_code", checklistCodes).eq("is_active", true)
        : { data: [] },
      messageCodes.length > 0
        ? supabase.from("clinical_message_templates").select("*").in("message_code", messageCodes).eq("is_active", true)
        : { data: [] },
      supabase.from("patient_behavioral_tasks").select("template_code, source_flag").eq("patient_id", patient_id).in("status", ["pending", "completed"]),
      supabase.from("patient_clinical_messages").select("message_code, source_flag").eq("patient_id", patient_id).eq("status", "active"),
    ]);

    const checklistMap = new Map((checklistRes.data || []).map((t: any) => [t.template_code, t]));
    const messageMap = new Map((messageRes.data || []).map((m: any) => [m.message_code, m]));
    const existingTaskKeys = new Set((existingTasksRes.data || []).map((t: any) => `${t.template_code}:${t.source_flag}`));
    const existingMsgKeys = new Set((existingMsgsRes.data || []).map((m: any) => `${m.message_code}:${m.source_flag}`));

    // 6. Generate tasks (limited to MAX_PRIORITY_TASKS)
    const tasksToInsert: any[] = [];
    const msgsToInsert: any[] = [];

    for (const rule of scoredRules) {
      // Generate task from checklist template (respect limit)
      if (rule.checklist_template_code && tasksToInsert.length < MAX_PRIORITY_TASKS) {
        const tmpl = checklistMap.get(rule.checklist_template_code);
        const key = `${rule.checklist_template_code}:${rule.trigger_flag}`;
        if (tmpl && !existingTaskKeys.has(key)) {
          // Skip low-relevance tasks (below threshold)
          if (rule.relevance_score < 20) continue;
          tasksToInsert.push({
            patient_id,
            source_flag: rule.trigger_flag,
            template_code: rule.checklist_template_code,
            title: tmpl.title,
            description: tmpl.description,
            frequency: rule.frequency || tmpl.frequency || "daily",
            priority: rule.relevance_score, // use computed score as priority
            status: "pending",
            due_date: new Date().toISOString().split("T")[0],
            generated_by: "rule_engine",
            objective_context: objective,
            strategy_context: strategy,
            phase_context: phase,
            priority_reason: rule.priority_reason,
          });
          existingTaskKeys.add(key);
        }
      }

      // Generate message from message template (no hard limit, but skip low relevance)
      if (rule.message_template_code) {
        const tmpl = messageMap.get(rule.message_template_code);
        const key = `${rule.message_template_code}:${rule.trigger_flag}`;
        if (tmpl && !existingMsgKeys.has(key) && rule.relevance_score >= 15) {
          msgsToInsert.push({
            patient_id,
            source_flag: rule.trigger_flag,
            message_code: rule.message_template_code,
            channel: tmpl.channel || "dashboard_highlight",
            title: tmpl.title,
            body: tmpl.body,
            priority: rule.relevance_score,
            status: "active",
            generated_by: "rule_engine",
            objective_context: objective,
            strategy_context: strategy,
            phase_context: phase,
            priority_reason: rule.priority_reason,
          });
          existingMsgKeys.add(key);
        }
      }
    }

    // 7. Archive stale tasks/messages for inactive flags
    const { data: staleTasks } = await supabase
      .from("patient_behavioral_tasks")
      .select("id, source_flag")
      .eq("patient_id", patient_id)
      .eq("status", "pending")
      .eq("generated_by", "rule_engine");

    const staleTaskIds = (staleTasks || [])
      .filter((t: any) => t.source_flag && !flagKeys.includes(t.source_flag))
      .map((t: any) => t.id);

    if (staleTaskIds.length > 0) {
      await supabase.from("patient_behavioral_tasks")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .in("id", staleTaskIds);
    }

    const { data: staleMsgs } = await supabase
      .from("patient_clinical_messages")
      .select("id, source_flag")
      .eq("patient_id", patient_id)
      .eq("status", "active")
      .eq("generated_by", "rule_engine");

    const staleMsgIds = (staleMsgs || [])
      .filter((m: any) => m.source_flag && !flagKeys.includes(m.source_flag))
      .map((m: any) => m.id);

    if (staleMsgIds.length > 0) {
      await supabase.from("patient_clinical_messages")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .in("id", staleMsgIds);
    }

    // 8. Insert
    if (tasksToInsert.length > 0) {
      await supabase.from("patient_behavioral_tasks").insert(tasksToInsert);
    }
    if (msgsToInsert.length > 0) {
      await supabase.from("patient_clinical_messages").insert(msgsToInsert);
    }

    return new Response(JSON.stringify({
      tasks_generated: tasksToInsert.length,
      messages_generated: msgsToInsert.length,
      tasks_archived: staleTaskIds.length,
      messages_archived: staleMsgIds.length,
      flags_evaluated: flagKeys.length,
      rules_matched: rules.length,
      context: { objective, strategy, phase },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Generate behavioral tasks error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
