import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * IFJ Conversational — 100% Deterministic
 * Replaced LLM with keyword-based intent detection + real data queries.
 * Same capabilities as command center but used from the conversational interface.
 */

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
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
    const n = normalize(question);
    const today = new Date().toISOString().split("T")[0];

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
    const name = profile?.full_name?.split(" ")[0] || "Profissional";

    const { data: patients } = await supabase.from("patients")
      .select("id, full_name, status, journey_status, goal, current_weight, target_weight")
      .eq("nutritionist_id", user.id).eq("status", "active").limit(100);

    const patientIds = (patients || []).map((p: any) => p.id);
    const safeIds = patientIds.length ? patientIds : ["00000000-0000-0000-0000-000000000000"];

    let response = "";

    // Greetings
    if (/^(oi|ola|bom dia|boa tarde|boa noite)/.test(n)) {
      const hour = new Date().getHours();
      const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      response = `${period}, ${name}! Você tem **${(patients || []).length} pacientes ativos**. O que deseja consultar?`;
    }

    // Who needs attention
    else if (n.includes("atencao") || n.includes("urgente") || n.includes("prioridade") || n.includes("risco")) {
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
    else if (n.includes("paciente") || n.includes("sobre") || n.includes("como esta")) {
      const nameMatch = n.match(/(?:paciente|sobre|como esta|dados d[aeo])\s+(.+)/);
      if (nameMatch) {
        const search = normalize(nameMatch[1]);
        const found = (patients || []).find((p: any) => normalize(p.full_name).includes(search));
        if (found) {
          const { data: snap } = await supabase.from("clinical_daily_snapshots")
            .select("adherence_score, dropout_risk_score, risk_level").eq("patient_id", found.id).eq("snapshot_date", today).maybeSingle();

          response = `## ${found.full_name}\n\n- Status: ${found.status}\n- Objetivo: ${found.goal || "?"}\n- Peso: ${found.current_weight || "?"}kg → Meta: ${found.target_weight || "?"}kg\n- Adesão: ${(snap as any)?.adherence_score || "?"}%\n- Risco: ${(snap as any)?.risk_level || "?"}`;
        } else {
          response = `Não encontrei paciente com esse nome na sua carteira.`;
        }
      } else {
        response = `Você tem **${(patients || []).length} pacientes ativos**. Diga o nome para eu buscar os dados.`;
      }
    }

    // Financial
    else if (n.includes("financeiro") || n.includes("pagamento") || n.includes("dinheiro")) {
      const { data: payments } = await supabase.from("patient_payments")
        .select("amount, status").eq("nutritionist_id", user.id);

      const paid = (payments || []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const pending = (payments || []).filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + (p.amount || 0), 0);

      response = `💰 **Financeiro:**\n- Recebido: R$ ${paid.toFixed(2)}\n- Pendente: R$ ${pending.toFixed(2)}`;
    }

    // Alerts
    else if (n.includes("alerta")) {
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
    else if (n.includes("resum") || n.includes("carteira") || n.includes("panorama")) {
      const { data: alerts } = await supabase.from("clinical_alerts")
        .select("id").eq("nutritionist_id", user.id).eq("is_active", true);
      const { data: decisions } = await supabase.from("clinical_decisions")
        .select("id").eq("nutritionist_id", user.id).eq("status", "pending");

      response = `## Panorama\n\n- Pacientes ativos: **${(patients || []).length}**\n- Alertas ativos: ${(alerts || []).length}\n- Decisões pendentes: ${(decisions || []).length}`;
    }

    else {
      response = `Não entendi. Tente:\n- *"Quem precisa de atenção?"*\n- *"Sobre [nome]"*\n- *"Resumo da carteira"*\n- *"Financeiro"*`;
    }

    return new Response(JSON.stringify({ response, dataSource: "deterministic" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ifj-conversational error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
