import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Intent =
  | "greeting" | "help" | "diet_today" | "checklist_today" | "hydration"
  | "next_appointment" | "progress" | "my_plan" | "my_team" | "achievements"
  | "weight_history" | "navigate" | "can_i_eat" | "swap_food" | "unknown";

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectIntent(cmd: string): { intent: Intent; food?: string; route?: string } {
  const n = normalize(cmd);

  if (/^(oi|ola|hey|bom dia|boa tarde|boa noite|e ai)/.test(n)) return { intent: "greeting" };
  if (/^(ajuda|help|comandos|o que voce)/.test(n)) return { intent: "help" };

  // Navigation
  const navMap: Record<string, string> = {
    "checklist": "/checklist", "tarefa": "/checklist", "dieta": "/my-diet",
    "refeicao": "/my-meals", "progresso": "/my-progress", "time": "/my-team",
    "equipe": "/my-team", "conquista": "/achievements", "consulta": "/appointments",
  };
  for (const [key, route] of Object.entries(navMap)) {
    if (n.includes(key) && (n.includes("abr") || n.includes("ir ") || n.includes("mostr"))) {
      return { intent: "navigate", route };
    }
  }

  // Can I eat...
  const eatMatch = n.match(/(?:posso comer|posso tomar|pode comer|pode tomar|faz mal)\s+(.+)/);
  if (eatMatch) return { intent: "can_i_eat", food: eatMatch[1].trim() };

  // Swap food
  if (n.includes("troc") || n.includes("substituir") || n.includes("substitu")) return { intent: "swap_food" };

  if (n.includes("dieta") || n.includes("cardapio") || n.includes("plano alimentar") || n.includes("refeicao") || n.includes("comer hoje")) return { intent: "diet_today" };
  if (n.includes("checklist") || n.includes("tarefa") || n.includes("fazer hoje") || n.includes("pendente")) return { intent: "checklist_today" };
  if (n.includes("agua") || n.includes("hidrata")) return { intent: "hydration" };
  if (n.includes("consulta") || n.includes("proximo") || n.includes("agenda")) return { intent: "next_appointment" };
  if (n.includes("progresso") || n.includes("evoluc") || n.includes("resultado")) return { intent: "progress" };
  if (n.includes("plano") || n.includes("meta")) return { intent: "my_plan" };
  if (n.includes("time") || n.includes("equipe") || n.includes("nutricionista") || n.includes("personal")) return { intent: "my_team" };
  if (n.includes("conquista") || n.includes("medalha") || n.includes("xp")) return { intent: "achievements" };
  if (n.includes("peso") || n.includes("balanc")) return { intent: "weight_history" };

  return { intent: "unknown" };
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

    const { command } = await req.json();

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
    const userName = (profile as any)?.full_name?.split(" ")[0] || "Paciente";
    const today = new Date().toISOString().split("T")[0];

    const { intent, food, route } = detectIntent(command);

    let responseText = "";
    let actions: any[] = [];
    const level = "consult";

    if (intent === "greeting") {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      responseText = `${period}, ${userName}! 😊\n\nEstou aqui para te ajudar com dados reais do seu acompanhamento. Me pergunte sobre sua dieta, checklist, consultas ou progresso!`;
    }

    else if (intent === "help") {
      responseText = `## 💡 O que posso fazer por você\n\n| Comando | O que faz |\n|---------|----------|\n| "Como está minha dieta?" | Seu plano alimentar ativo |\n| "Quais tarefas hoje?" | Checklist do dia |\n| "Próxima consulta" | Data da próxima consulta |\n| "Meu progresso" | Evolução de peso e check-ins |\n| "Posso comer [alimento]?" | Verifica restrições |\n| "Meu time" | Seus profissionais |\n| "Conquistas" | Medalhas e XP |`;
    }

    else if (intent === "navigate" && route) {
      responseText = `Abrindo para você...`;
      actions = [{ label: "Ir para a tela", route, type: "navigate" }];
    }

    else if (intent === "diet_today") {
      const { data: plans } = await supabase.from("patient_meal_plans")
        .select("id, title, total_calories, status")
        .eq("patient_id", user.id).eq("status", "published").limit(1);

      const plan = (plans as any)?.[0];
      if (!plan) {
        responseText = `## 🍽️ Plano Alimentar\n\nVocê ainda não tem um plano alimentar ativo. Converse com seu nutricionista!`;
      } else {
        const { data: meals } = await supabase.from("meal_plan_meals")
          .select("meal_name, meal_time, foods, calories, protein, carbs, fat")
          .eq("plan_id", plan.id).order("meal_time");

        responseText = `## 🍽️ ${plan.title} (${plan.total_calories} kcal)\n\n` +
          ((meals as any[]) || []).map((m: any) => {
            const foodList = Array.isArray(m.foods) ? m.foods.map((f: any) => typeof f === "string" ? f : f.name || f.food).join(", ") : "Ver detalhes";
            return `### ⏰ ${m.meal_name} (${m.meal_time || "?"})\n- Alimentos: ${foodList}\n- ${m.calories || "?"}kcal | P: ${m.protein || "?"}g | C: ${m.carbs || "?"}g | G: ${m.fat || "?"}g`;
          }).join("\n\n");
      }
      actions = [{ label: "Ver Minha Dieta", route: "/my-diet", type: "navigate" }];
    }

    else if (intent === "checklist_today") {
      const { data: tasks } = await supabase.from("checklist_tasks")
        .select("title, completed, category").eq("patient_id", user.id).eq("date", today);

      const done = (tasks || []).filter((t: any) => t.completed).length;
      const total = (tasks || []).length;

      if (total === 0) {
        responseText = `## ✅ Checklist\n\nNenhuma tarefa para hoje. Aproveite o dia! 🎉`;
      } else {
        responseText = `## ✅ Checklist de Hoje — ${done}/${total} concluídas\n\n` +
          (tasks || []).map((t: any) => `- ${t.completed ? "✅" : "⬜"} ${t.title} (${t.category})`).join("\n");
        if (done === total) responseText += `\n\n🎉 **Parabéns!** Todas as tarefas concluídas!`;
      }
      actions = [{ label: "Abrir Checklist", route: "/checklist", type: "navigate" }];
    }

    else if (intent === "hydration") {
      const { data: hydration } = await supabase.from("fit_intelligence_hydration")
        .select("consumed_cups, target_cups").eq("patient_id", user.id).eq("date", today).maybeSingle();

      if (!hydration) {
        responseText = `## 💧 Hidratação\n\nSem registro de hoje ainda. Lembre-se de beber água regularmente!`;
      } else {
        const h = hydration as any;
        const percent = h.target_cups > 0 ? Math.round((h.consumed_cups / h.target_cups) * 100) : 0;
        responseText = `## 💧 Hidratação — ${h.consumed_cups}/${h.target_cups} copos (${percent}%)\n\n${"💧".repeat(Math.min(h.consumed_cups, 20))}${"⬜".repeat(Math.max(0, h.target_cups - h.consumed_cups))}\n\n${percent >= 100 ? "🎉 Meta atingida!" : `Faltam **${h.target_cups - h.consumed_cups}** copos.`}`;
      }
    }

    else if (intent === "next_appointment") {
      const { data: appts } = await supabase.from("patient_appointments")
        .select("appointment_date, appointment_time, appointment_type, status")
        .eq("patient_id", user.id).gte("appointment_date", today).order("appointment_date").limit(3);

      if (!appts || appts.length === 0) {
        responseText = `## 📅 Consultas\n\nNenhuma consulta agendada. Entre em contato com seu nutricionista para agendar!`;
      } else {
        responseText = `## 📅 Próximas Consultas\n\n` + (appts || []).map((a: any) =>
          `- **${a.appointment_date}** às ${a.appointment_time || "?"} — ${a.appointment_type || "Consulta"} (${a.status})`
        ).join("\n");
      }
      actions = [{ label: "Ver Agenda", route: "/appointments", type: "navigate" }];
    }

    else if (intent === "progress" || intent === "weight_history") {
      const { data: checkins } = await supabase.from("patient_checkins")
        .select("weight, mood, energy_level, created_at").eq("patient_id", user.id)
        .order("created_at", { ascending: false }).limit(10);

      const p = profile as any;
      if (!checkins || checkins.length === 0) {
        responseText = `## 📈 Progresso\n\nSem check-ins registrados ainda. Faça seu primeiro check-in para acompanhar sua evolução!`;
      } else {
        const latest = checkins[0] as any;
        const first = checkins[checkins.length - 1] as any;
        const diff = latest.weight && first.weight ? (latest.weight - first.weight).toFixed(1) : "?";
        const toGoal = p?.target_weight && latest.weight ? (latest.weight - p.target_weight).toFixed(1) : "?";

        responseText = `## 📈 Seu Progresso\n\n| Indicador | Valor |\n|-----------|-------|\n| Peso atual | **${latest.weight || "?"}** kg |\n| Meta | ${p?.target_weight || "?"} kg |\n| Variação (período) | ${diff} kg |\n| Falta para meta | ${toGoal} kg |\n| Último humor | ${latest.mood || "?"} |\n| Energia | ${latest.energy_level || "?"} |\n\n### Histórico\n` +
          checkins.map((c: any) => `- ${c.created_at?.split("T")[0]} → ${c.weight || "?"}kg`).join("\n");
      }
      actions = [{ label: "Ver Check-in", route: "/checkin", type: "navigate" }];
    }

    else if (intent === "can_i_eat" && food) {
      // Check anamnesis for restrictions
      const { data: anamnesis } = await supabase.from("patient_anamnesis")
        .select("allergies, dietary_restrictions, food_preferences, health_conditions")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);

      const a = (anamnesis as any)?.[0];
      const restrictions = [...(a?.allergies || []), ...(a?.dietary_restrictions || [])].map((r: string) => normalize(r));
      const normalizedFood = normalize(food);
      const isRestricted = restrictions.some(r => normalizedFood.includes(r) || r.includes(normalizedFood));

      if (isRestricted) {
        responseText = `## ⚠️ Atenção com "${food}"\n\nDe acordo com sua anamnese, **"${food}"** pode estar entre suas restrições ou alergias.\n\n**Restrições registradas:** ${restrictions.join(", ") || "Nenhuma"}\n\n> Consulte seu nutricionista antes de consumir.`;
      } else if (!a) {
        responseText = `## ❓ Sem dados de anamnese\n\nNão encontrei sua anamnese no sistema. Sem ela, não consigo verificar restrições alimentares.\n\nConverse com seu nutricionista para completar sua anamnese.`;
      } else {
        responseText = `## ✅ "${food}"\n\nNão encontrei restrições para **"${food}"** na sua anamnese.\n\n**Suas restrições:** ${restrictions.join(", ") || "Nenhuma registrada"}\n\n> Lembre-se de verificar porções e encaixe no seu plano alimentar.`;
      }
    }

    else if (intent === "my_team") {
      const { data: links } = await supabase.from("patient_professional_links")
        .select("professional_id, professional_type, status").eq("patient_id", user.id).eq("status", "active");

      if (!links || links.length === 0) {
        responseText = `## 👥 Meu Time\n\nNenhum profissional vinculado no momento.`;
      } else {
        const profIds = links.map((l: any) => l.professional_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", profIds);
        responseText = `## 👥 Meu Time\n\n` + links.map((l: any) => {
          const prof = (profs || []).find((p: any) => p.user_id === l.professional_id);
          const type = l.professional_type === "nutritionist" ? "🥗 Nutricionista" : "💪 Personal Trainer";
          return `- ${type}: **${prof?.full_name || "?"}**`;
        }).join("\n");
      }
      actions = [{ label: "Ver Meu Time", route: "/my-team", type: "navigate" }];
    }

    else if (intent === "achievements") {
      const { data: userAch } = await supabase.from("user_achievements")
        .select("achievement_id, earned_at").eq("user_id", user.id).limit(20);
      
      if (!userAch || userAch.length === 0) {
        responseText = `## 🏆 Conquistas\n\nVocê ainda não desbloqueou nenhuma conquista. Continue seguindo seu plano!`;
      } else {
        const achIds = userAch.map((a: any) => a.achievement_id);
        const { data: achievements } = await supabase.from("achievements")
          .select("id, name, description, xp_reward").in("id", achIds);
        
        const totalXP = (achievements || []).reduce((s: number, a: any) => s + (a.xp_reward || 0), 0);
        responseText = `## 🏆 Conquistas (${userAch.length}) — ${totalXP} XP total\n\n` +
          (achievements || []).map((a: any) => `- 🏅 **${a.name}** — ${a.description} (+${a.xp_reward}XP)`).join("\n");
      }
      actions = [{ label: "Ver Conquistas", route: "/achievements", type: "navigate" }];
    }

    else {
      responseText = `Não entendi **"${command}"**.\n\nTente:\n- *"Como está minha dieta?"*\n- *"Quais tarefas hoje?"*\n- *"Posso comer [alimento]?"*\n- *"Meu progresso"*\n\nDigite **"ajuda"** para todos os comandos.`;
    }

    return new Response(JSON.stringify({
      response: responseText, actions, level, intent, dataSource: "deterministic",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ifj-command-center-patient error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
