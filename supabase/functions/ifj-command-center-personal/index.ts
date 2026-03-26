import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Intent = "greeting" | "help" | "students_overview" | "trained_today" | "pain_reports" | "student_detail" | "workouts_overview" | "alerts" | "navigate" | "unknown";

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectIntent(cmd: string): { intent: Intent; studentName?: string; route?: string } {
  const n = normalize(cmd);

  if (/^(oi|ola|hey|bom dia|boa tarde|boa noite)/.test(n)) return { intent: "greeting" };
  if (/^(ajuda|help|comandos)/.test(n)) return { intent: "help" };

  const navMap: Record<string, string> = {
    "dashboard": "/personal/dashboard", "alunos": "/personal/students", "treino": "/personal/workouts",
  };
  for (const [key, route] of Object.entries(navMap)) {
    if (n.includes(key) && (n.includes("abr") || n.includes("ir ") || n.includes("mostr"))) {
      return { intent: "navigate", route };
    }
  }

  const nameMatch = n.match(/(?:aluno|sobre|dados d[aeo]|como esta)\s+(.+)/);
  if (nameMatch) return { intent: "student_detail", studentName: nameMatch[1].trim() };

  if (n.includes("treinou") || n.includes("treinaram") || n.includes("treino hoje")) return { intent: "trained_today" };
  if (n.includes("dor") || n.includes("lesao") || n.includes("lesoes") || n.includes("pain")) return { intent: "pain_reports" };
  if (n.includes("alerta")) return { intent: "alerts" };
  if (n.includes("treino") || n.includes("plano")) return { intent: "workouts_overview" };
  if (n.includes("aluno") || n.includes("carteira") || n.includes("resum")) return { intent: "students_overview" };

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
    if (!actualRoles.includes("personal") && !actualRoles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Permissão negada." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id, action: "ifj_command_center_query",
      resource_type: "ifj_command_center", resource_id: "personal",
      metadata: { command: command?.substring(0, 300), role: "personal" },
    });

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
    const userName = profile?.full_name?.split(" ")[0] || "Personal";
    const today = new Date().toISOString().split("T")[0];

    const { intent, studentName, route } = detectIntent(command);

    // Fetch students
    const { data: students } = await supabase.from("personal_trainer_students")
      .select("student_id, status").eq("personal_id", user.id);
    const activeStudents = (students || []).filter((s: any) => s.status === "active");
    const studentIds = activeStudents.map((s: any) => s.student_id);
    const safeIds = studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"];

    const { data: profiles } = await supabase.from("profiles")
      .select("user_id, full_name, phone").in("user_id", safeIds);

    let responseText = "";
    let actions: any[] = [];
    const level = "consult";

    if (intent === "greeting") {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      responseText = `${period}, ${userName}! 💪\n\nVocê tem **${activeStudents.length} alunos ativos**. Me pergunte sobre treinos, dores ou progresso!`;
    }

    else if (intent === "help") {
      responseText = `## 💡 Comandos\n\n| Comando | O que faz |\n|---------|----------|\n| "Resumo dos alunos" | Visão geral |\n| "Quem treinou hoje?" | Alunos que completaram treino |\n| "Algum aluno com dor?" | Relatórios de dor/lesão |\n| "Sobre [nome]" | Dados de um aluno |\n| "Treinos ativos" | Planos de treino |\n| "Alertas" | Alertas recebidos |`;
    }

    else if (intent === "navigate" && route) {
      responseText = `Abrindo...`;
      actions = [{ label: "Ir para a tela", route, type: "navigate" }];
    }

    else if (intent === "students_overview") {
      const { data: plans } = await supabase.from("workout_plans")
        .select("student_id, is_active").eq("personal_id", user.id);
      const { data: completions } = await supabase.from("workout_completions")
        .select("student_id, completed_at").in("student_id", safeIds)
        .gte("completed_at", today + "T00:00:00").limit(100);

      const trainedToday = new Set((completions || []).map((c: any) => c.student_id)).size;
      const withActivePlan = new Set((plans || []).filter((p: any) => p.is_active).map((p: any) => p.student_id)).size;

      responseText = `## 📊 Resumo dos Alunos\n\n| Indicador | Valor |\n|-----------|-------|\n| Alunos ativos | **${activeStudents.length}** |\n| Treinaram hoje | ${trainedToday} |\n| Com plano ativo | ${withActivePlan} |\n| Sem plano | ${activeStudents.length - withActivePlan} |\n\n### Lista:\n` +
        activeStudents.map((s: any) => {
          const p = (profiles || []).find((x: any) => x.user_id === s.student_id);
          const trained = (completions || []).some((c: any) => c.student_id === s.student_id);
          const hasPlan = (plans || []).some((x: any) => x.student_id === s.student_id && x.is_active);
          return `- ${trained ? "✅" : "⬜"} **${p?.full_name || "?"}** ${hasPlan ? "" : "⚠️ sem plano"}`;
        }).join("\n");
      actions = [{ label: "Ver Alunos", route: "/personal/students", type: "navigate" }];
    }

    else if (intent === "trained_today") {
      const { data: completions } = await supabase.from("workout_completions")
        .select("student_id, duration_minutes, completed_at").in("student_id", safeIds)
        .gte("completed_at", today + "T00:00:00");

      const trained = [...new Set((completions || []).map((c: any) => c.student_id))];
      const notTrained = activeStudents.filter((s: any) => !trained.includes(s.student_id));

      responseText = `## 💪 Treinos de Hoje\n\n**Treinaram (${trained.length}):**\n` +
        (trained.length > 0 ? trained.map(id => {
          const p = (profiles || []).find((x: any) => x.user_id === id);
          const c = (completions || []).find((x: any) => x.student_id === id);
          return `- ✅ **${p?.full_name || "?"}** (${c?.duration_minutes || "?"}min)`;
        }).join("\n") : "- Ninguém ainda") +
        `\n\n**Não treinaram (${notTrained.length}):**\n` +
        (notTrained.length > 0 ? notTrained.map((s: any) => {
          const p = (profiles || []).find((x: any) => x.user_id === s.student_id);
          return `- ⬜ ${p?.full_name || "?"}`;
        }).join("\n") : "- Todos treinaram! 🎉");
    }

    else if (intent === "pain_reports") {
      const { data: feedbacks } = await supabase.from("workout_feedbacks")
        .select("student_id, pain_areas, pain_level, fatigue_level, mood, created_at")
        .in("student_id", safeIds).order("created_at", { ascending: false }).limit(30);

      const withPain = (feedbacks || []).filter((f: any) => f.pain_areas && f.pain_areas.length > 0 && f.pain_level > 2);

      if (withPain.length === 0) {
        responseText = `## ✅ Sem Relatos de Dor\n\nNenhum aluno reportou dor significativa recentemente.`;
      } else {
        responseText = `## ⚠️ Relatos de Dor (${withPain.length})\n\n` + withPain.slice(0, 10).map((f: any) => {
          const p = (profiles || []).find((x: any) => x.user_id === f.student_id);
          return `- **${p?.full_name || "?"}** — Dor nível ${f.pain_level}/10 em: ${JSON.stringify(f.pain_areas).replace(/[\[\]"]/g, "")} (${f.created_at?.split("T")[0]})`;
        }).join("\n");
      }
    }

    else if (intent === "student_detail" && studentName) {
      const normalized = normalize(studentName);
      const found = (profiles || []).find((p: any) => normalize(p.full_name).includes(normalized));

      if (!found) {
        responseText = `## ❌ Aluno não encontrado\n\nNão encontrei **"${studentName}"** entre seus alunos.`;
      } else {
        const { data: plans } = await supabase.from("workout_plans")
          .select("plan_name, is_active, created_at").eq("student_id", found.user_id).eq("personal_id", user.id);
        const { data: completions } = await supabase.from("workout_completions")
          .select("completed_at, duration_minutes").eq("student_id", found.user_id).order("completed_at", { ascending: false }).limit(10);
        const { data: feedbacks } = await supabase.from("workout_feedbacks")
          .select("pain_areas, pain_level, fatigue_level, mood, created_at").eq("student_id", found.user_id).order("created_at", { ascending: false }).limit(5);

        const activePlans = (plans || []).filter((p: any) => p.is_active);
        const lastFb = (feedbacks as any)?.[0];

        responseText = `## 👤 ${found.full_name}\n\n### Treinos\n| Indicador | Valor |\n|-----------|-------|\n| Planos ativos | ${activePlans.length} |\n| Treinos completados | ${(completions || []).length} (últimos) |\n| Último treino | ${(completions as any)?.[0]?.completed_at?.split("T")[0] || "N/A"} |`;

        if (lastFb) {
          responseText += `\n\n### Último Feedback\n- Dor: ${lastFb.pain_level || 0}/10 ${lastFb.pain_areas ? `(${JSON.stringify(lastFb.pain_areas).replace(/[\[\]"]/g, "")})` : ""}\n- Fadiga: ${lastFb.fatigue_level || "?"}/10\n- Humor: ${lastFb.mood || "?"}`;
        }
      }
    }

    else if (intent === "alerts") {
      const { data: alerts } = await supabase.from("cross_professional_alerts")
        .select("patient_id, alert_type, message, severity, created_at")
        .eq("target_professional_id", user.id).eq("is_read", false).limit(20);

      if (!alerts || alerts.length === 0) {
        responseText = `## ✅ Sem Alertas\n\nNenhum alerta pendente.`;
      } else {
        responseText = `## 🔔 Alertas (${alerts.length})\n\n` + alerts.map((a: any) => {
          const p = (profiles || []).find((x: any) => x.user_id === a.patient_id);
          return `- **${p?.full_name || "?"}** — ${a.message} (${a.severity})`;
        }).join("\n");
      }
    }

    else {
      responseText = `Não entendi **"${command}"**.\n\nTente:\n- *"Resumo dos alunos"*\n- *"Quem treinou hoje?"*\n- *"Algum aluno com dor?"*\n\nDigite **"ajuda"** para todos os comandos.`;
    }

    return new Response(JSON.stringify({
      response: responseText, actions, level, intent, dataSource: "deterministic",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ifj-command-center-personal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
