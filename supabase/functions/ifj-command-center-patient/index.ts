import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * IFJ Command Center — Patient
 * 100% Deterministic
 * 
 * VALIDATED TABLES:
 * - profiles (user_id, full_name, goal, current_weight, target_weight)
 * - meal_plans (patient_id, title, plan_status, total_meta_calorias, is_active)
 * - meal_plan_items (meal_plan_id, title, tipo_refeicao, meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras)
 * - checklist_tasks (patient_id, date, title, completed, category)
 * - fit_intelligence_hydration (patient_id, date, consumed_cups, target_cups)
 * - patient_appointments (patient_id, appointment_date, appointment_time, appointment_type, status)
 * - patient_checkins (patient_id, weight, mood, energy_level, created_at)
 * - patient_anamnesis (user_id, allergies, dietary_restrictions, food_preferences, health_conditions)
 * - patient_professional_links (patient_id, professional_id, professional_type, status)
 * - user_achievements (user_id, achievement_id, earned_at)
 * - achievements (id, name, description, xp_reward)
 */

type Intent =
  | "greeting" | "help" | "diet_today" | "checklist_today" | "hydration"
  | "next_appointment" | "progress" | "my_plan" | "my_team" | "achievements"
  | "weight_history" | "navigate" | "can_i_eat" | "unknown";

interface SessionContext {
  lastModule?: string;
  lastRoute?: string;
}

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const SYNONYMS: Record<string, string[]> = {
  dieta: ["dieta", "cardapio", "plano alimentar", "refeicao", "comer hoje", "alimentac", "comida", "alimento"],
  checklist: ["checklist", "tarefa", "fazer hoje", "pendente", "to do", "lista", "atividade"],
  agua: ["agua", "hidrata", "beber", "copo", "litro"],
  consulta: ["consulta", "proximo", "proxima", "agenda", "marcad", "horario", "atendimento"],
  progresso: ["progresso", "evoluc", "resultado", "avanco", "melhora"],
  peso: ["peso", "balanc", "quilos", "kg", "emagre", "engord"],
  time: ["time", "equipe", "nutricionista", "personal", "profissional", "medico"],
  conquista: ["conquista", "medalha", "xp", "nivel", "badge", "trofeu", "premios"],
  plano: ["plano", "meta", "objetivo"],
};

function match(text: string, group: string): boolean {
  return (SYNONYMS[group] || []).some(s => text.includes(s));
}

function detectIntent(cmd: string, ctx: SessionContext): { intent: Intent; food?: string; route?: string } {
  const n = normalize(cmd);

  if (/^(oi|ola|hey|bom dia|boa tarde|boa noite|e ai|eai|salve|opa|fala)/.test(n)) return { intent: "greeting" };
  if (/^(ajuda|help|comandos|o que voce|oq vc|menu|opcoes)/.test(n)) return { intent: "help" };

  // Navigation
  const navMap: Record<string, string> = {
    "checklist": "/checklist", "tarefa": "/checklist",
    "dieta": "/my-diet", "refeicao": "/my-meals", "cardapio": "/my-diet",
    "progresso": "/my-progress", "evolucao": "/my-progress",
    "time": "/my-team", "equipe": "/my-team",
    "conquista": "/achievements", "medalha": "/achievements",
    "consulta": "/appointments", "agenda": "/appointments",
  };
  for (const [key, route] of Object.entries(navMap)) {
    if (n.includes(key) && (n.includes("abr") || n.includes("ir ") || n.includes("mostr") || n.includes("vai") || n.includes("leva") || n.includes("acess"))) {
      return { intent: "navigate", route };
    }
  }

  // Can I eat...
  const eatPatterns = [
    /(?:posso comer|posso tomar|pode comer|pode tomar|faz mal|devo comer|devo evitar|tenho alergia a)\s+(.+)/,
    /(.+)\s+(?:faz mal|engorda|pode|posso)/,
  ];
  for (const pattern of eatPatterns) {
    const m = n.match(pattern);
    if (m) return { intent: "can_i_eat", food: m[1].trim() };
  }

  if (match(n, "dieta")) return { intent: "diet_today" };
  if (match(n, "checklist")) return { intent: "checklist_today" };
  if (match(n, "agua")) return { intent: "hydration" };
  if (match(n, "consulta")) return { intent: "next_appointment" };
  if (match(n, "peso") || match(n, "progresso")) return { intent: "progress" };
  if (match(n, "plano")) return { intent: "my_plan" };
  if (match(n, "time")) return { intent: "my_team" };
  if (match(n, "conquista")) return { intent: "achievements" };

  return { intent: "unknown" };
}

function formatResponse(title: string, emoji: string, body: string, footer?: string): string {
  let resp = `## ${emoji} ${title}\n\n${body}`;
  if (footer) resp += `\n\n---\n> ${footer}`;
  return resp;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { command, sessionContext } = await req.json();
    const ctx: SessionContext = sessionContext || {};

    const { data: userRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id);
    const actualRoles = (userRoles || []).map((r: any) => r.role);
    if (!actualRoles.includes("patient") && !actualRoles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Permissão negada." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id, action: "ifj_command_center_query",
      resource_type: "ifj_command_center", resource_id: "patient",
      metadata: { command: command?.substring(0, 300), role: "patient" },
    });

    const { data: profile } = await supabase.from("profiles").select("full_name, goal, current_weight, target_weight").eq("user_id", user.id).single();
    const p = profile as any;
    const userName = p?.full_name?.split(" ")[0] || "Paciente";
    const today = new Date().toISOString().split("T")[0];

    const { intent, food, route } = detectIntent(command, ctx);
    let responseText = "";
    let actions: any[] = [];
    const newContext: SessionContext = { ...ctx };

    if (intent === "greeting") {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      const { data: tasks } = await supabase.from("checklist_tasks")
        .select("completed").eq("patient_id", user.id).eq("date", today);
      const done = (tasks || []).filter((t: any) => t.completed).length;
      const total = (tasks || []).length;

      responseText = formatResponse("Bem-vindo", "😊",
        `${period}, ${userName}!\n\nHoje: **${done}/${total}** tarefas concluídas.\n\nMe pergunte sobre dieta, checklist, consultas ou progresso!`,
        "Dados 100% reais do seu acompanhamento"
      );
    }

    else if (intent === "help") {
      responseText = formatResponse("O Que Posso Fazer", "💡",
        `| Comando | O que faz |\n|---------|----------|\n| "Minha dieta" | Plano alimentar ativo |\n| "Tarefas de hoje" | Checklist do dia |\n| "Próxima consulta" | Agenda |\n| "Meu progresso" | Evolução de peso |\n| "Posso comer [alimento]?" | Verifica restrições |\n| "Hidratação" | Copos de água |\n| "Meu time" | Profissionais |\n| "Conquistas" | Medalhas e XP |`
      );
    }

    else if (intent === "navigate" && route) {
      responseText = `Abrindo...`;
      actions = [{ label: "Ir para a tela", route, type: "navigate" }];
      newContext.lastRoute = route;
    }

    else if (intent === "diet_today") {
      const { data: plans } = await supabase.from("meal_plans")
        .select("id, title, total_meta_calorias, plan_status, is_active")
        .eq("patient_id", user.id).or("plan_status.eq.published,plan_status.eq.active,is_active.eq.true")
        .limit(1);

      const plan = (plans as any)?.[0];
      if (!plan) {
        responseText = formatResponse("Plano Alimentar", "🍽️", "Você ainda não tem um plano alimentar ativo. Converse com seu nutricionista!");
      } else {
        const { data: items } = await supabase.from("meal_plan_items")
          .select("title, tipo_refeicao, meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, day_of_week")
          .eq("meal_plan_id", plan.id).order("tipo_refeicao");

        responseText = formatResponse(`${plan.title} (${plan.total_meta_calorias || "?"} kcal)`, "🍽️",
          ((items as any[]) || []).map((m: any) =>
            `### ${m.title} (${m.tipo_refeicao})\n- ${m.meta_calorias || "?"}kcal | P: ${m.meta_proteinas || "?"}g | C: ${m.meta_carboidratos || "?"}g | G: ${m.meta_gorduras || "?"}g`
          ).join("\n\n") || "Sem refeições cadastradas"
        );
      }
      actions = [{ label: "Ver Dieta", route: "/my-diet", type: "navigate" }];
      newContext.lastModule = "diet";
    }

    else if (intent === "checklist_today") {
      const { data: tasks } = await supabase.from("checklist_tasks")
        .select("title, completed, category").eq("patient_id", user.id).eq("date", today);

      const done = (tasks || []).filter((t: any) => t.completed).length;
      const total = (tasks || []).length;

      if (total === 0) {
        responseText = formatResponse("Checklist", "✅", "Nenhuma tarefa para hoje. Aproveite! 🎉");
      } else {
        responseText = formatResponse(`Checklist — ${done}/${total}`, "✅",
          (tasks || []).map((t: any) => `- ${t.completed ? "✅" : "⬜"} ${t.title} (${t.category})`).join("\n") +
          (done === total ? "\n\n🎉 **Parabéns!** Todas concluídas!" : "")
        );
      }
      actions = [{ label: "Abrir Checklist", route: "/checklist", type: "navigate" }];
    }

    else if (intent === "hydration") {
      const { data: hydration } = await supabase.from("fit_intelligence_hydration")
        .select("consumed_cups, target_cups").eq("patient_id", user.id).eq("date", today).maybeSingle();

      if (!hydration) {
        responseText = formatResponse("Hidratação", "💧", "Sem registro de hoje. Lembre-se de beber água! 💧");
      } else {
        const h = hydration as any;
        const pct = h.target_cups > 0 ? Math.round((h.consumed_cups / h.target_cups) * 100) : 0;
        responseText = formatResponse(`Hidratação — ${h.consumed_cups}/${h.target_cups} copos (${pct}%)`, "💧",
          `${"💧".repeat(Math.min(h.consumed_cups, 15))}${"⬜".repeat(Math.max(0, Math.min(h.target_cups - h.consumed_cups, 15)))}\n\n${pct >= 100 ? "🎉 Meta atingida!" : `Faltam **${h.target_cups - h.consumed_cups}** copos.`}`
        );
      }
    }

    else if (intent === "next_appointment") {
      const { data: appts } = await supabase.from("patient_appointments")
        .select("appointment_date, appointment_time, appointment_type, status")
        .eq("patient_id", user.id).gte("appointment_date", today).order("appointment_date").limit(3);

      if (!appts || appts.length === 0) {
        responseText = formatResponse("Consultas", "📅", "Nenhuma consulta agendada. Entre em contato com seu nutricionista!");
      } else {
        responseText = formatResponse("Próximas Consultas", "📅",
          appts.map((a: any) => `- **${a.appointment_date}** às ${a.appointment_time || "?"} — ${a.appointment_type || "Consulta"} (${a.status})`).join("\n")
        );
      }
      actions = [{ label: "Ver Agenda", route: "/appointments", type: "navigate" }];
    }

    else if (intent === "progress") {
      const { data: checkins } = await supabase.from("patient_checkins")
        .select("weight, mood, energy_level, created_at").eq("patient_id", user.id)
        .order("created_at", { ascending: false }).limit(10);

      if (!checkins || checkins.length === 0) {
        responseText = formatResponse("Progresso", "📈", "Sem check-ins ainda. Faça seu primeiro para acompanhar sua evolução!");
      } else {
        const latest = checkins[0] as any;
        const first = checkins[checkins.length - 1] as any;
        const diff = latest.weight && first.weight ? (latest.weight - first.weight).toFixed(1) : "?";
        const toGoal = p?.target_weight && latest.weight ? (latest.weight - p.target_weight).toFixed(1) : "?";

        responseText = formatResponse("Seu Progresso", "📈",
          `| Indicador | Valor |\n|-----------|-------|\n| Peso atual | **${latest.weight || "?"}** kg |\n| Meta | ${p?.target_weight || "?"} kg |\n| Variação | ${diff} kg |\n| Falta para meta | ${toGoal} kg |\n| Humor | ${latest.mood || "?"} |\n| Energia | ${latest.energy_level || "?"} |\n\n### Histórico\n` +
          checkins.map((c: any) => `- ${c.created_at?.split("T")[0]} → ${c.weight || "?"}kg`).join("\n")
        );
      }
      actions = [{ label: "Ver Check-in", route: "/checkin", type: "navigate" }];
    }

    else if (intent === "can_i_eat" && food) {
      const { data: anamnesis } = await supabase.from("patient_anamnesis")
        .select("allergies, dietary_restrictions, food_preferences, health_conditions")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);

      const a = (anamnesis as any)?.[0];
      const restrictions = [...(a?.allergies || []), ...(a?.dietary_restrictions || [])].map((r: string) => normalize(r));
      const normalizedFood = normalize(food);
      const isRestricted = restrictions.some(r => normalizedFood.includes(r) || r.includes(normalizedFood));

      if (!a) {
        responseText = formatResponse("Sem Anamnese", "❓",
          "Não encontrei sua anamnese. Converse com seu nutricionista para completá-la."
        );
      } else if (isRestricted) {
        responseText = formatResponse(`Atenção com "${food}"`, "⚠️",
          `**"${food}"** pode estar entre suas restrições.\n\n**Restrições:** ${restrictions.join(", ") || "Nenhuma"}\n\n> Consulte seu nutricionista antes de consumir.`
        );
      } else {
        responseText = formatResponse(`"${food}" — OK`, "✅",
          `Não encontrei restrições para **"${food}"**.\n\n**Suas restrições:** ${restrictions.join(", ") || "Nenhuma"}\n\n> Verifique porções no seu plano.`
        );
      }
    }

    else if (intent === "my_team") {
      const { data: links } = await supabase.from("patient_professional_links")
        .select("professional_id, professional_type, status").eq("patient_id", user.id).eq("status", "active");

      if (!links || links.length === 0) {
        responseText = formatResponse("Meu Time", "👥", "Nenhum profissional vinculado.");
      } else {
        const profIds = links.map((l: any) => l.professional_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", profIds);
        responseText = formatResponse("Meu Time", "👥",
          links.map((l: any) => {
            const prof = (profs || []).find((x: any) => x.user_id === l.professional_id);
            const type = l.professional_type === "nutritionist" ? "🥗 Nutricionista" : "💪 Personal";
            return `- ${type}: **${prof?.full_name || "?"}**`;
          }).join("\n")
        );
      }
      actions = [{ label: "Ver Time", route: "/my-team", type: "navigate" }];
    }

    else if (intent === "achievements") {
      const { data: userAch } = await supabase.from("user_achievements")
        .select("achievement_id, earned_at").eq("user_id", user.id).limit(20);

      if (!userAch || userAch.length === 0) {
        responseText = formatResponse("Conquistas", "🏆", "Nenhuma conquista ainda. Continue seguindo seu plano!");
      } else {
        const achIds = userAch.map((a: any) => a.achievement_id);
        const { data: achs } = await supabase.from("achievements")
          .select("id, name, description, xp_reward").in("id", achIds);
        const totalXP = (achs || []).reduce((s: number, a: any) => s + (a.xp_reward || 0), 0);
        responseText = formatResponse(`Conquistas (${userAch.length}) — ${totalXP} XP`, "🏆",
          (achs || []).map((a: any) => `- 🏅 **${a.name}** — ${a.description} (+${a.xp_reward}XP)`).join("\n")
        );
      }
      actions = [{ label: "Ver Conquistas", route: "/achievements", type: "navigate" }];
    }

    else {
      responseText = formatResponse("Não Entendi", "❓",
        `Tente:\n- *"Minha dieta"*\n- *"Tarefas de hoje"*\n- *"Posso comer [alimento]?"*\n- *"Meu progresso"*\n\nDigite **"ajuda"** para todos os comandos.`
      );
    }

    return new Response(JSON.stringify({
      response: responseText, actions, level: "consult", intent,
      sessionContext: newContext, dataSource: "deterministic",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ifj-command-center-patient error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
