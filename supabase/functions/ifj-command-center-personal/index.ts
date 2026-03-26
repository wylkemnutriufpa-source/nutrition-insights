import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * IFJ Command Center — Personal Trainer
 * 100% Deterministic
 * 
 * VALIDATED TABLES:
 * - profiles (user_id, full_name, phone)
 * - personal_trainer_students (personal_id, student_id, status)
 * - workout_plans (personal_id, student_id, plan_name, is_active)
 * - workout_completions (student_id, completed_at, duration_minutes)
 * - workout_session_feedback (student_id, pain_areas, fatigue_level, overall_feeling, feedback_date)
 * - cross_professional_alerts (target_professional_id, patient_id, alert_type, message, severity, is_read)
 */

type Intent = "greeting" | "help" | "students_overview" | "trained_today" | "pain_reports"
  | "student_detail" | "workouts_overview" | "alerts" | "navigate" | "unknown";

interface SessionContext {
  lastStudentId?: string;
  lastStudentName?: string;
  lastModule?: string;
}

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const SYNONYMS: Record<string, string[]> = {
  treino: ["treinou", "treinaram", "treino hoje", "treinamento", "exercicio", "malhou", "malharam"],
  dor: ["dor", "lesao", "lesoes", "pain", "machuc", "desconforto", "incomo"],
  alerta: ["alerta", "alertas", "notificac", "aviso"],
  aluno: ["aluno", "alunos", "estudante", "carteira", "resum", "panorama", "visao geral"],
  plano_treino: ["treino", "plano", "ficha", "rotina"],
};

function match(text: string, group: string): boolean {
  return (SYNONYMS[group] || []).some(s => text.includes(s));
}

function findStudentByName(profiles: any[], searchName: string): { found: any | null; ambiguous: any[] } {
  const normalized = normalize(searchName);
  const exact = profiles.filter((p: any) => normalize(p.full_name) === normalized);
  if (exact.length === 1) return { found: exact[0], ambiguous: [] };
  const partial = profiles.filter((p: any) => normalize(p.full_name).includes(normalized));
  if (partial.length === 1) return { found: partial[0], ambiguous: [] };
  if (partial.length > 1) return { found: null, ambiguous: partial };
  const firstName = profiles.filter((p: any) => normalize(p.full_name).split(" ")[0] === normalized);
  if (firstName.length === 1) return { found: firstName[0], ambiguous: [] };
  if (firstName.length > 1) return { found: null, ambiguous: firstName };
  return { found: null, ambiguous: [] };
}

function detectIntent(cmd: string, ctx: SessionContext): { intent: Intent; studentName?: string; route?: string } {
  const n = normalize(cmd);

  if (/^(oi|ola|hey|bom dia|boa tarde|boa noite|e ai|eai|salve|opa|fala)/.test(n)) return { intent: "greeting" };
  if (/^(ajuda|help|comandos|menu|opcoes)/.test(n)) return { intent: "help" };

  const navMap: Record<string, string> = {
    "dashboard": "/personal/dashboard", "alunos": "/personal/students",
    "treino": "/personal/workouts", "ficha": "/personal/workouts",
  };
  for (const [key, route] of Object.entries(navMap)) {
    if (n.includes(key) && (n.includes("abr") || n.includes("ir ") || n.includes("mostr") || n.includes("acess") || n.includes("vai"))) {
      return { intent: "navigate", route };
    }
  }

  // Student detail
  const namePatterns = [
    /(?:aluno|sobre|dados d[aeo]|como esta|como vai|detalhe[s]? d[aeo])\s+(.+)/,
    /(?:me fala|fala|fale) (?:sobre|d[aeo])\s+(.+)/,
  ];
  for (const pattern of namePatterns) {
    const m = n.match(pattern);
    if (m) return { intent: "student_detail", studentName: m[1].trim() };
  }

  // Context: "como ele está?"
  if ((n === "como esta" || n === "como ele esta" || n === "como ela esta" || n === "detalhes") && ctx.lastStudentName) {
    return { intent: "student_detail", studentName: ctx.lastStudentName };
  }

  if (match(n, "treino") && !match(n, "plano_treino")) return { intent: "trained_today" };
  if (match(n, "dor")) return { intent: "pain_reports" };
  if (match(n, "alerta")) return { intent: "alerts" };
  if (match(n, "plano_treino") && !match(n, "treino")) return { intent: "workouts_overview" };
  if (match(n, "aluno")) return { intent: "students_overview" };

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

    const { intent, studentName, route } = detectIntent(command, ctx);

    const { data: students } = await supabase.from("personal_trainer_students")
      .select("student_id, status").eq("personal_id", user.id);
    const activeStudents = (students || []).filter((s: any) => s.status === "active");
    const studentIds = activeStudents.map((s: any) => s.student_id);
    const safeIds = studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"];

    const { data: profiles } = await supabase.from("profiles")
      .select("user_id, full_name, phone").in("user_id", safeIds);

    let responseText = "";
    let actions: any[] = [];
    const newContext: SessionContext = { ...ctx };

    if (intent === "greeting") {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      responseText = formatResponse("Bem-vindo", "💪",
        `${period}, ${userName}!\n\n**${activeStudents.length} alunos ativos**. Me pergunte sobre treinos, dores ou progresso!`,
        "Dados 100% reais"
      );
    }

    else if (intent === "help") {
      responseText = formatResponse("Comandos", "💡",
        `| Comando | O que faz |\n|---------|----------|\n| "Resumo dos alunos" | Visão geral |\n| "Quem treinou hoje?" | Completaram treino |\n| "Algum aluno com dor?" | Relatos de dor |\n| "Sobre [nome]" | Dados de um aluno |\n| "Alertas" | Alertas recebidos |`
      );
    }

    else if (intent === "navigate" && route) {
      responseText = `Abrindo...`;
      actions = [{ label: "Ir para a tela", route, type: "navigate" }];
      newContext.lastModule = route;
    }

    else if (intent === "students_overview") {
      const { data: plans } = await supabase.from("workout_plans")
        .select("student_id, is_active").eq("personal_id", user.id);
      const { data: completions } = await supabase.from("workout_completions")
        .select("student_id, completed_at").in("student_id", safeIds)
        .gte("completed_at", today + "T00:00:00").limit(100);

      const trainedToday = new Set((completions || []).map((c: any) => c.student_id)).size;
      const withActivePlan = new Set((plans || []).filter((p: any) => p.is_active).map((p: any) => p.student_id)).size;

      responseText = formatResponse("Resumo dos Alunos", "📊",
        `| Indicador | Valor |\n|-----------|-------|\n| Ativos | **${activeStudents.length}** |\n| Treinaram hoje | ${trainedToday} |\n| Com plano ativo | ${withActivePlan} |\n| Sem plano | ${activeStudents.length - withActivePlan} |\n\n### Lista\n` +
        activeStudents.map((s: any) => {
          const pr = (profiles || []).find((x: any) => x.user_id === s.student_id);
          const trained = (completions || []).some((c: any) => c.student_id === s.student_id);
          const hasPlan = (plans || []).some((x: any) => x.student_id === s.student_id && x.is_active);
          return `- ${trained ? "✅" : "⬜"} **${pr?.full_name || "?"}** ${hasPlan ? "" : "⚠️ sem plano"}`;
        }).join("\n")
      );
      actions = [{ label: "Ver Alunos", route: "/personal/students", type: "navigate" }];
    }

    else if (intent === "trained_today") {
      const { data: completions } = await supabase.from("workout_completions")
        .select("student_id, duration_minutes, completed_at").in("student_id", safeIds)
        .gte("completed_at", today + "T00:00:00");

      const trained = [...new Set((completions || []).map((c: any) => c.student_id))];
      const notTrained = activeStudents.filter((s: any) => !trained.includes(s.student_id));

      responseText = formatResponse("Treinos de Hoje", "💪",
        `**Treinaram (${trained.length}):**\n` +
        (trained.length > 0 ? trained.map(id => {
          const pr = (profiles || []).find((x: any) => x.user_id === id);
          const c = (completions || []).find((x: any) => x.student_id === id);
          return `- ✅ **${pr?.full_name || "?"}** (${c?.duration_minutes || "?"}min)`;
        }).join("\n") : "- Ninguém ainda") +
        `\n\n**Não treinaram (${notTrained.length}):**\n` +
        (notTrained.length > 0 ? notTrained.map((s: any) => {
          const pr = (profiles || []).find((x: any) => x.user_id === s.student_id);
          return `- ⬜ ${pr?.full_name || "?"}`;
        }).join("\n") : "- Todos treinaram! 🎉")
      );
    }

    else if (intent === "pain_reports") {
      const { data: feedbacks } = await supabase.from("workout_session_feedback")
        .select("student_id, pain_areas, fatigue_level, overall_feeling, feedback_date")
        .in("student_id", safeIds).order("feedback_date", { ascending: false }).limit(30);

      const withPain = (feedbacks || []).filter((f: any) => f.pain_areas && (Array.isArray(f.pain_areas) ? f.pain_areas.length > 0 : Object.keys(f.pain_areas).length > 0));

      if (withPain.length === 0) {
        responseText = formatResponse("Sem Relatos de Dor", "✅", "Nenhum aluno reportou dor recentemente.");
      } else {
        responseText = formatResponse(`Relatos de Dor (${withPain.length})`, "⚠️",
          withPain.slice(0, 10).map((f: any) => {
            const pr = (profiles || []).find((x: any) => x.user_id === f.student_id);
            const areas = Array.isArray(f.pain_areas) ? f.pain_areas.join(", ") : JSON.stringify(f.pain_areas).replace(/[\{\}"]/g, "");
            return `- **${pr?.full_name || "?"}** — Dor em: ${areas} | Fadiga: ${f.fatigue_level || "?"}/10 (${f.feedback_date})`;
          }).join("\n")
        );
      }
    }

    else if (intent === "student_detail" && studentName) {
      const { found, ambiguous } = findStudentByName(profiles || [], studentName);

      if (ambiguous.length > 0) {
        responseText = formatResponse("Múltiplos Alunos", "🔍",
          `Encontrei **${ambiguous.length}** alunos com nome parecido:\n\n` +
          ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}**`).join("\n") +
          `\n\nSeja mais específico.`
        );
      } else if (!found) {
        responseText = formatResponse("Aluno Não Encontrado", "❌", `Não encontrei **"${studentName}"** entre seus alunos.`);
      } else {
        newContext.lastStudentId = found.user_id;
        newContext.lastStudentName = found.full_name;

        const { data: plans } = await supabase.from("workout_plans")
          .select("plan_name, is_active, created_at").eq("student_id", found.user_id).eq("personal_id", user.id);
        const { data: completions } = await supabase.from("workout_completions")
          .select("completed_at, duration_minutes").eq("student_id", found.user_id).order("completed_at", { ascending: false }).limit(10);
        const { data: feedbacks } = await supabase.from("workout_session_feedback")
          .select("pain_areas, fatigue_level, overall_feeling, feedback_date").eq("student_id", found.user_id).order("feedback_date", { ascending: false }).limit(5);

        const activePlans = (plans || []).filter((p: any) => p.is_active);
        const lastFb = (feedbacks as any)?.[0];

        let body = `### Treinos\n| Indicador | Valor |\n|-----------|-------|\n| Planos ativos | ${activePlans.length} |\n| Treinos recentes | ${(completions || []).length} |\n| Último treino | ${(completions as any)?.[0]?.completed_at?.split("T")[0] || "N/A"} |`;

        if (lastFb) {
          const areas = lastFb.pain_areas ? (Array.isArray(lastFb.pain_areas) ? lastFb.pain_areas.join(", ") : JSON.stringify(lastFb.pain_areas).replace(/[\{\}"]/g, "")) : "Nenhuma";
          body += `\n\n### Último Feedback\n- Dor: ${areas}\n- Fadiga: ${lastFb.fatigue_level || "?"}/10\n- Sensação: ${lastFb.overall_feeling || "?"}`;
        }

        responseText = formatResponse(found.full_name, "👤", body);
      }
    }

    else if (intent === "alerts") {
      const { data: alerts } = await supabase.from("cross_professional_alerts")
        .select("patient_id, alert_type, message, severity, created_at")
        .eq("target_professional_id", user.id).eq("is_read", false).limit(20);

      if (!alerts || alerts.length === 0) {
        responseText = formatResponse("Sem Alertas", "✅", "Nenhum alerta pendente.");
      } else {
        responseText = formatResponse(`Alertas (${alerts.length})`, "🔔",
          alerts.map((a: any) => {
            const pr = (profiles || []).find((x: any) => x.user_id === a.patient_id);
            return `- **${pr?.full_name || "?"}** — ${a.message} (${a.severity})`;
          }).join("\n")
        );
      }
    }

    else {
      responseText = formatResponse("Não Entendi", "❓",
        `Tente:\n- *"Resumo dos alunos"*\n- *"Quem treinou hoje?"*\n- *"Algum aluno com dor?"*\n\nDigite **"ajuda"** para todos os comandos.`
      );
    }

    return new Response(JSON.stringify({
      response: responseText, actions, level: "consult", intent,
      sessionContext: newContext, dataSource: "deterministic",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ifj-command-center-personal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
