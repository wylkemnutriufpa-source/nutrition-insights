import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WEEKEND_DAYS = [0, 5, 6]; // Sunday, Friday, Saturday
const ADHERENCE_DROP_THRESHOLD = 0.4; // 40% — below this is considered a drop
const CONSECUTIVE_DROP_DAYS = 3;

const WEEKEND_TIPS = [
  {
    title: "🍽️ Estratégias para Restaurantes",
    tip: "Dica: Escolha pratos grelhados ou assados. Peça molhos à parte. Evite couvert e comece pela salada. Você pode aproveitar sem exagerar!",
    icon: "🍽️",
    category: "social",
  },
  {
    title: "🎉 Nutrição em Festas",
    tip: "Dica: Coma uma refeição equilibrada antes de sair. Alterne bebidas com água. Prefira petiscos com proteína. Sua consistência importa mais que a perfeição!",
    icon: "🎉",
    category: "social",
  },
  {
    title: "🏖️ Dia de Praia/Piscina",
    tip: "Dica: Leve snacks saudáveis (frutas, castanhas, sanduíches naturais). Hidrate-se bastante. Evite frituras de quiosque. Seu corpo agradece!",
    icon: "🏖️",
    category: "social",
  },
  {
    title: "🍻 Saída com Amigos",
    tip: "Dica: Não precisa evitar tudo! Escolha 1-2 drinks com menos calorias (vodka com água tônica, vinho seco). Coma antes de sair para evitar excessos.",
    icon: "🍻",
    category: "social",
  },
  {
    title: "💪 Mantendo a Consistência",
    tip: "Dica: Fim de semana não precisa ser perfeito. Mantenha pelo menos 1 refeição planejada por dia. Pequenos hábitos sustentam grandes resultados!",
    icon: "💪",
    category: "motivation",
  },
  {
    title: "🛒 Preparação é Tudo",
    tip: "Dica: Na quinta, prepare marmitas para o fim de semana. Ter comida pronta reduz a chance de pedir delivery. Seu eu futuro vai agradecer!",
    icon: "🛒",
    category: "planning",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    async function resolveTenantForUser(uid: string): Promise<string | null> {
      const { data } = await supabase.from("user_tenants").select("tenant_id").eq("user_id", uid).limit(1).maybeSingle();
      return data?.tenant_id || null;
    }

    const body = await req.json().catch(() => ({}));
    const nutritionistId = body.nutritionist_id;

    // Get active relationships
    let npQuery = supabase
      .from("nutritionist_patients")
      .select("nutritionist_id, patient_id")
      .eq("status", "active");
    if (nutritionistId) npQuery = npQuery.eq("nutritionist_id", nutritionistId);
    const { data: relationships } = await npQuery;

    if (!relationships || relationships.length === 0) {
      return new Response(JSON.stringify({ patterns_detected: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active automation rules for pattern triggers
    const nutriIds = [...new Set(relationships.map((r) => r.nutritionist_id))];
    const { data: rules } = await supabase
      .from("automation_rules")
      .select("*")
      .in("nutritionist_id", nutriIds)
      .in("trigger_type", ["pattern.weekend_drop", "pattern.consecutive_drop"])
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ patterns_detected: 0, message: "No active pattern rules" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patientIds = [...new Set(relationships.map((r) => r.patient_id))];
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    let patternsDetected = 0;

    for (const patientId of patientIds) {
      // Get checklist data for the last 14 days
      const { data: tasks } = await supabase
        .from("checklist_tasks")
        .select("date, completed")
        .eq("patient_id", patientId)
        .gte("date", twoWeeksAgo.toISOString().split("T")[0])
        .lte("date", today.toISOString().split("T")[0]);

      if (!tasks || tasks.length === 0) continue;

      // Group by date and calculate daily adherence
      const dailyAdherence: Record<string, { total: number; completed: number }> = {};
      for (const task of tasks) {
        if (!dailyAdherence[task.date]) {
          dailyAdherence[task.date] = { total: 0, completed: 0 };
        }
        dailyAdherence[task.date].total++;
        if (task.completed) dailyAdherence[task.date].completed++;
      }

      const adherenceByDate = Object.entries(dailyAdherence).map(([date, data]) => ({
        date,
        dayOfWeek: new Date(date + "T12:00:00").getDay(),
        rate: data.total > 0 ? data.completed / data.total : 0,
      }));

      // ── Pattern 1: Weekend Drop ──
      const weekendDays = adherenceByDate.filter((d) => WEEKEND_DAYS.includes(d.dayOfWeek));
      const weekDays = adherenceByDate.filter((d) => !WEEKEND_DAYS.includes(d.dayOfWeek));

      const avgWeekend = weekendDays.length > 0
        ? weekendDays.reduce((s, d) => s + d.rate, 0) / weekendDays.length
        : null;
      const avgWeekday = weekDays.length > 0
        ? weekDays.reduce((s, d) => s + d.rate, 0) / weekDays.length
        : null;

      const weekendDropDetected =
        avgWeekend !== null &&
        avgWeekday !== null &&
        avgWeekend < ADHERENCE_DROP_THRESHOLD &&
        avgWeekday - avgWeekend > 0.25; // significant drop

      // ── Pattern 2: Consecutive Drop ──
      const sortedDates = adherenceByDate.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      let consecutiveLow = 0;
      for (const day of sortedDates) {
        if (day.rate < ADHERENCE_DROP_THRESHOLD) {
          consecutiveLow++;
        } else {
          break;
        }
      }
      const consecutiveDropDetected = consecutiveLow >= CONSECUTIVE_DROP_DAYS;

      // Find the nutritionist for this patient
      const nutri = relationships.find((r) => r.patient_id === patientId);
      if (!nutri) continue;

      // Process matching rules
      for (const rule of rules) {
        if (rule.nutritionist_id !== nutri.nutritionist_id) continue;

        const isWeekendRule = rule.trigger_type === "pattern.weekend_drop" && weekendDropDetected;
        const isConsecutiveRule = rule.trigger_type === "pattern.consecutive_drop" && consecutiveDropDetected;

        if (!isWeekendRule && !isConsecutiveRule) continue;

        const patientTenant = await resolveTenantForUser(nutri.nutritionist_id);

        // Check cooldown
        const { data: recentRuns } = await supabase
          .from("automation_runs")
          .select("executed_at")
          .eq("rule_id", rule.id)
          .eq("patient_id", patientId)
          .order("executed_at", { ascending: false })
          .limit(1);

        if (recentRuns && recentRuns.length > 0) {
          const lastRun = new Date(recentRuns[0].executed_at);
          const cooldownMs = rule.cooldown_hours * 60 * 60 * 1000;
          if (today.getTime() - lastRun.getTime() < cooldownMs) continue;
        }

        // Execute actions
        const actionsExecuted: string[] = [];
        const actions = Array.isArray(rule.actions) ? rule.actions : [];

        for (const action of actions) {
          const actionType = typeof action === "string" ? action : action?.type;

          if (actionType === "notify_user") {
            // Send supportive tips
            const tip = isWeekendRule
              ? WEEKEND_TIPS[Math.floor(Math.random() * WEEKEND_TIPS.length)]
              : {
                  title: "💪 Hora de Retomar!",
                  tip: "Notamos que sua aderência caiu nos últimos dias. Sem julgamento! Que tal começar com uma micro-meta hoje? Complete apenas 1 tarefa do checklist. Cada passo conta!",
                  icon: "💪",
                  category: "motivation",
                };

            // Create notification
            await supabase.from("notifications").insert({
              user_id: patientId,
              title: tip.title,
              message: tip.tip,
              type: "automation",
              tenant_id: patientTenant,
              metadata: {
                rule_id: rule.id,
                pattern: rule.trigger_type,
                adherence_weekend: avgWeekend,
                adherence_weekday: avgWeekday,
              },
            });

            // Also add as a patient tip
            await supabase.from("patient_tips").insert({
              user_id: patientId,
              tip: tip.tip,
              icon: tip.icon,
              category: tip.category,
              is_read: false,
            });

            actionsExecuted.push("notify_user");
          }

          if (actionType === "notify_professional") {
            const patternLabel = isWeekendRule
              ? `Queda de aderência no fim de semana (${Math.round((avgWeekend || 0) * 100)}% vs ${Math.round((avgWeekday || 0) * 100)}% nos dias úteis)`
              : `Queda consecutiva de aderência (${consecutiveLow} dias abaixo de ${ADHERENCE_DROP_THRESHOLD * 100}%)`;

            await supabase.from("notifications").insert({
              user_id: nutri.nutritionist_id,
              title: "🧠 Padrão Comportamental Detectado",
              message: patternLabel,
              type: "automation",
              tenant_id: patientTenant,
              metadata: {
                patient_id: patientId,
                rule_id: rule.id,
                pattern: rule.trigger_type,
              },
              action_url: `/patients/${patientId}`,
            });
            actionsExecuted.push("notify_professional");
          }

          if (actionType === "create_task") {
            // Create supportive checklist tasks
            const todayStr = today.toISOString().split("T")[0];
            const supportTasks = isWeekendRule
              ? [
                  { title: "Preparar refeição saudável para o fim de semana", icon: "🥗", category: "nutrition" },
                  { title: "Manter hidratação (2L de água)", icon: "💧", category: "hydration" },
                  { title: "Registrar pelo menos 1 refeição", icon: "📝", category: "tracking" },
                ]
              : [
                  { title: "Completar 1 tarefa do checklist hoje", icon: "✅", category: "habit" },
                  { title: "Beber 1 copo de água agora", icon: "💧", category: "hydration" },
                ];

            for (const task of supportTasks) {
              await supabase.from("checklist_tasks").insert({
                patient_id: patientId,
                title: task.title,
                icon: task.icon,
                category: task.category,
                date: todayStr,
                completed: false,
                tenant_id: patientTenant,
              });
            }
            actionsExecuted.push("create_task");
          }
        }

        // Log the run
        await supabase.from("automation_runs").insert({
          rule_id: rule.id,
          patient_id: patientId,
          nutritionist_id: nutri.nutritionist_id,
          status: "success",
          tenant_id: patientTenant,
          actions_executed: actionsExecuted,
          trigger_data: {
            pattern: rule.trigger_type,
            avg_weekend: avgWeekend,
            avg_weekday: avgWeekday,
            consecutive_low_days: consecutiveLow,
          },
        });

        patternsDetected++;
      }
    }

    return new Response(
      JSON.stringify({ patterns_detected: patternsDetected }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error detecting patterns:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
