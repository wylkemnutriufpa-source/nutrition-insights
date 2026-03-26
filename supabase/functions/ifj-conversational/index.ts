import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * IFJ Conversational — Nutritionist copilot (chat mode)
 * 100% Deterministic — delegates to same logic as command center
 * 
 * VALIDATED TABLES: Same as ifj-command-center
 */

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findPatientByName(patients: any[], searchName: string): { found: any | null; ambiguous: any[] } {
  const normalized = normalize(searchName);
  const exact = patients.filter((p: any) => normalize(p.full_name) === normalized);
  if (exact.length === 1) return { found: exact[0], ambiguous: [] };
  const partial = patients.filter((p: any) => normalize(p.full_name).includes(normalized));
  if (partial.length === 1) return { found: partial[0], ambiguous: [] };
  if (partial.length > 1) return { found: null, ambiguous: partial };
  return { found: null, ambiguous: [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { question, sessionContext } = await req.json();
    const n = normalize(question);
    const today = new Date().toISOString().split("T")[0];
    const ctx = sessionContext || {};

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
    const name = profile?.full_name?.split(" ")[0] || "Profissional";

    const { data: patients } = await supabase.from("patients")
      .select("id, full_name, status, journey_status, goal, current_weight, target_weight")
      .eq("nutritionist_id", user.id).eq("status", "active").limit(200);

    const patientIds = (patients || []).map((p: any) => p.id);
    const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];

    let response = "";
    const newContext = { ...ctx };

    // Greetings
    if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|eai|salve|opa|fala|hey)/.test(n)) {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      response = `${period}, ${name}! Você tem **${(patients || []).length} pacientes ativos**. O que deseja consultar?`;
    }

    // Who needs attention
    else if (n.includes("atencao") || n.includes("urgente") || n.includes("prioridade") || n.includes("risco") || n.includes("critico") || n.includes("abandono") || n.includes("dropout")) {
      const { data: snapshots } = await supabase.from("clinical_daily_snapshots")
        .select("patient_id, adherence_score, dropout_risk_score, risk_level")
        .in("patient_id", safeIds).eq("snapshot_date", today);

      const atRisk = (snapshots || []).filter((s: any) => s.risk_level === "high" || s.risk_level === "critical");

      if (atRisk.length === 0) {
        response = `✅ Nenhum paciente em risco hoje. Sua carteira está estável!`;
      } else {
        response = `⚠️ **${atRisk.length} paciente(s) precisam de atenção:**\n\n` +
          atRisk.map((s: any) => {
            const p = (patients || []).find((x: any) => x.id === s.patient_id);
            return `- **${p?.full_name || "?"}** — Risco: ${s.risk_level}, Adesão: ${s.adherence_score || 0}%`;
          }).join("\n");
      }
    }

    // Patient search by name
    else if (n.includes("paciente") || n.includes("sobre") || n.includes("como esta") || n.includes("como vai") || n.includes("ficha") || n.includes("perfil")) {
      const nameMatch = n.match(/(?:paciente|sobre|como esta|como vai|dados d[aeo]|ficha d[aeo]|perfil d[aeo])\s+(.+)/);
      if (nameMatch) {
        const { found, ambiguous } = findPatientByName(patients || [], nameMatch[1]);
        if (ambiguous.length > 0) {
          response = `🔍 Encontrei **${ambiguous.length}** pacientes parecidos:\n\n` +
            ambiguous.map((p: any, i: number) => `${i + 1}. **${p.full_name}** (${p.goal || "?"})`).join("\n") +
            `\n\nDigite o nome completo para eu buscar.`;
        } else if (found) {
          newContext.lastPatientId = found.id;
          newContext.lastPatientName = found.full_name;

          const { data: snap } = await supabase.from("clinical_daily_snapshots")
            .select("adherence_score, dropout_risk_score, risk_level").eq("patient_id", found.id).eq("snapshot_date", today).maybeSingle();

          response = `## ${found.full_name}\n\n- Status: ${found.status}\n- Objetivo: ${found.goal || "?"}\n- Peso: ${found.current_weight || "?"}kg → Meta: ${found.target_weight || "?"}kg\n- Adesão: ${(snap as any)?.adherence_score || "?"}%\n- Risco: ${(snap as any)?.risk_level || "?"}`;
        } else {
          response = `Não encontrei paciente com esse nome na sua carteira.`;
        }
      } else if (ctx.lastPatientName) {
        response = `Último paciente consultado: **${ctx.lastPatientName}**. Diga o nome para buscar outro.`;
      } else {
        response = `Você tem **${(patients || []).length} pacientes ativos**. Diga o nome para eu buscar os dados.`;
      }
    }

    // Financial
    else if (n.includes("financeiro") || n.includes("faturamento") || n.includes("receita") || n.includes("dinheiro") || n.includes("pagamento") || n.includes("cobranc") || n.includes("caixa")) {
      const { data: transactions } = await supabase.from("financial_transactions")
        .select("amount, status, type").eq("nutritionist_id", user.id);

      const income = (transactions || []).filter((t: any) => t.type === "income" || t.type === "receita");
      const pending = (transactions || []).filter((t: any) => t.status === "pending" || t.status === "pendente");
      const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const totalPending = pending.reduce((s: number, t: any) => s + (t.amount || 0), 0);

      response = `💰 **Financeiro:**\n- Receitas: R$ ${totalIncome.toFixed(2)}\n- Pendente: R$ ${totalPending.toFixed(2)}`;
    }

    // Alerts
    else if (n.includes("alerta") || n.includes("aviso") || n.includes("notificac")) {
      const { data: alerts } = await supabase.from("clinical_alerts")
        .select("patient_id, title, severity").eq("nutritionist_id", user.id).eq("is_active", true).limit(10);

      response = (alerts || []).length === 0
        ? `✅ Sem alertas ativos.`
        : `🔔 **${alerts!.length} alertas:**\n\n` + alerts!.map((a: any) => {
            const p = (patients || []).find((x: any) => x.id === a.patient_id);
            return `- **${p?.full_name || "?"}** — ${a.title} (${a.severity})`;
          }).join("\n");
    }

    // Summary
    else if (n.includes("resum") || n.includes("carteira") || n.includes("panorama") || n.includes("visao geral") || n.includes("overview")) {
      const { data: alerts } = await supabase.from("clinical_alerts")
        .select("id").eq("nutritionist_id", user.id).eq("is_active", true);
      const { data: decisions } = await supabase.from("clinical_decisions")
        .select("id").eq("nutritionist_id", user.id).eq("status", "pending");

      response = `## Panorama\n\n- Pacientes ativos: **${(patients || []).length}**\n- Alertas ativos: ${(alerts || []).length}\n- Decisões pendentes: ${(decisions || []).length}`;
    }

    else {
      response = `Não entendi. Tente:\n- *"Quem precisa de atenção?"*\n- *"Sobre [nome]"*\n- *"Resumo da carteira"*\n- *"Financeiro"*`;
    }

    return new Response(JSON.stringify({ response, sessionContext: newContext, dataSource: "deterministic" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ifj-conversational error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
