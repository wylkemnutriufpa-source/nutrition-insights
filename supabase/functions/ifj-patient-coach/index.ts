import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * IFJ Patient Coach — 100% Deterministic
 * Same as command-center-patient but for conversational interface
 * 
 * VALIDATED TABLES: Same as ifj-command-center-patient
 */

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

type Intent = "greeting" | "diet" | "checklist" | "hydration" | "appointment" | "progress"
  | "can_eat" | "plan_info" | "help" | "unknown";

function detectIntent(cmd: string): { intent: Intent; food?: string } {
  const n = normalize(cmd);
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|eai|salve|opa|fala|hey)/.test(n)) return { intent: "greeting" };
  if (/^(ajuda|help|comandos|menu|opcoes)/.test(n)) return { intent: "help" };

  const eatPatterns = [
    /(?:posso comer|posso tomar|pode comer|pode tomar|faz mal|devo evitar|devo comer)\s+(.+)/,
  ];
  for (const p of eatPatterns) {
    const m = n.match(p);
    if (m) return { intent: "can_eat", food: m[1].trim() };
  }

  if (n.includes("dieta") || n.includes("cardapio") || n.includes("refeicao") || n.includes("comer") || n.includes("alimentac")) return { intent: "diet" };
  if (n.includes("checklist") || n.includes("tarefa") || n.includes("fazer") || n.includes("pendente")) return { intent: "checklist" };
  if (n.includes("agua") || n.includes("hidrat") || n.includes("beber") || n.includes("copo")) return { intent: "hydration" };
  if (n.includes("consulta") || n.includes("agenda") || n.includes("proximo") || n.includes("horario")) return { intent: "appointment" };
  if (n.includes("peso") || n.includes("progresso") || n.includes("evoluc") || n.includes("resultado") || n.includes("emagre")) return { intent: "progress" };
  if (n.includes("plano") || n.includes("meta") || n.includes("objetivo")) return { intent: "plan_info" };

  return { intent: "unknown" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { question } = await req.json();
    const today = new Date().toISOString().split("T")[0];
    const { intent, food } = detectIntent(question);

    const { data: profileData } = await supabase.from("profiles").select("full_name, goal, current_weight, target_weight").eq("user_id", user.id).single();
    const profile = profileData as any;
    const name = profile?.full_name?.split(" ")[0] || "Paciente";

    let response = "";

    if (intent === "greeting") {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

      const { data: tasks } = await supabase.from("checklist_tasks")
        .select("completed").eq("patient_id", user.id).eq("date", today);
      const done = (tasks || []).filter((t: any) => t.completed).length;
      const total = (tasks || []).length;

      response = `${period}, ${name}! 😊\n\nHoje você completou **${done}/${total}** tarefas.\n\nMe pergunte sobre sua dieta, hidratação ou progresso!`;
    }

    else if (intent === "help") {
      response = `## O que posso fazer\n\n- *"Como está minha dieta?"*\n- *"Quais tarefas hoje?"*\n- *"Posso comer [alimento]?"*\n- *"Meu progresso"*\n- *"Próxima consulta"*\n- *"Hidratação"*`;
    }

    else if (intent === "diet") {
      const { data: plans } = await supabase.from("meal_plans")
        .select("id, title, total_target_calories")
        .eq("patient_id", user.id).or("plan_status.eq.published,plan_status.eq.active,is_active.eq.true")
        .limit(1);
      const plan = (plans as any)?.[0];

      if (!plan) {
        response = `Você ainda não tem um plano alimentar ativo. Converse com seu nutricionista! 🥗`;
      } else {
        const { data: items } = await supabase.from("meal_plan_items")
          .select("title, meal_type, calories_target, protein_target")
          .eq("meal_plan_id", plan.id).order("meal_type");
        response = `## ${plan.title} (${plan.total_target_calories || "?"} kcal)\n\n` +
          ((items as any[]) || []).map((m: any) =>
            `- **${m.title}** (${m.meal_type}) — ${m.calories_target || "?"}kcal, ${m.protein_target || "?"}g proteína`
          ).join("\n");
      }
    }

    else if (intent === "checklist") {
      const { data: tasks } = await supabase.from("checklist_tasks")
        .select("title, completed, category").eq("patient_id", user.id).eq("date", today);
      const done = (tasks || []).filter((t: any) => t.completed).length;
      if ((tasks || []).length === 0) {
        response = `Nenhuma tarefa hoje! 🎉`;
      } else {
        response = `## Checklist — ${done}/${(tasks || []).length}\n\n` +
          (tasks || []).map((t: any) => `- ${t.completed ? "✅" : "⬜"} ${t.title}`).join("\n");
      }
    }

    else if (intent === "hydration") {
      const { data: h } = await supabase.from("fit_intelligence_hydration")
        .select("consumed_cups, target_cups").eq("patient_id", user.id).eq("date", today).maybeSingle();
      if (!h) {
        response = `Sem registro de hidratação hoje. Beba água! 💧`;
      } else {
        const hyd = h as any;
        response = `## Hidratação — ${hyd.consumed_cups}/${hyd.target_cups} copos\n\n${hyd.consumed_cups >= hyd.target_cups ? "🎉 Meta atingida!" : `Faltam ${hyd.target_cups - hyd.consumed_cups} copos.`}`;
      }
    }

    else if (intent === "appointment") {
      const { data: appts } = await supabase.from("patient_appointments")
        .select("appointment_date, appointment_time, appointment_type")
        .eq("patient_id", user.id).gte("appointment_date", today).order("appointment_date").limit(1);
      const a = (appts as any)?.[0];
      response = a
        ? `📅 Próxima consulta: **${a.appointment_date}** às ${a.appointment_time || "?"} (${a.appointment_type || "Consulta"})`
        : `Nenhuma consulta agendada. Entre em contato com seu nutricionista!`;
    }

    else if (intent === "progress") {
      const { data: checkins } = await supabase.from("patient_checkins")
        .select("weight, mood, created_at").eq("patient_id", user.id)
        .order("created_at", { ascending: false }).limit(5);

      if (!checkins || checkins.length === 0) {
        response = `Sem check-ins ainda. Faça seu primeiro para acompanhar sua evolução! 📈`;
      } else {
        const latest = (checkins as any[])[0];
        response = `## Progresso\n\n- Peso atual: **${latest.weight || "?"}kg**\n- Meta: ${profile?.target_weight || "?"}kg\n- Último humor: ${latest.mood || "?"}\n\n### Histórico\n` +
          (checkins as any[]).map((c: any) => `- ${c.created_at?.split("T")[0]} → ${c.weight || "?"}kg`).join("\n");
      }
    }

    else if (intent === "can_eat" && food) {
      const { data: anamnesis } = await supabase.from("patient_anamnesis")
        .select("allergies, dietary_restrictions").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      const a = (anamnesis as any)?.[0];
      const restrictions = [...(a?.allergies || []), ...(a?.dietary_restrictions || [])].map((r: string) => normalize(r));
      const nFood = normalize(food);
      const blocked = restrictions.some(r => nFood.includes(r) || r.includes(nFood));

      response = !a
        ? `Não tenho sua anamnese para verificar. Converse com seu nutricionista.`
        : blocked
          ? `⚠️ **"${food}"** pode estar nas suas restrições: ${restrictions.join(", ")}. Consulte seu nutricionista.`
          : `✅ Não encontrei restrição para **"${food}"**. Verifique as porções no seu plano.`;
    }

    else {
      response = `Não entendi. Tente: *"Minha dieta"*, *"Checklist"*, *"Posso comer X?"* ou *"Progresso"*.`;
    }

    return new Response(JSON.stringify({ response, intent, dataSource: "deterministic" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ifj-patient-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
