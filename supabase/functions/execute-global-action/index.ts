import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, requireRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // AUTH GUARD: only admin can execute global actions
    const caller = await requireUser(req);
    requireRole(caller, "admin");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { action_code, filters = {}, payload = {}, executed_by, mode = "execute" } = await req.json();

    if (!action_code) throw new Error("action_code required");

    const scope = filters.scope || "all";

    // Build patient query based on scope
    const buildPatientQuery = () => {
      let q = supabase.from("nutritionist_patients").select("patient_id, nutritionist_id, status");
      if (scope === "active") q = q.eq("status", "active");
      else if (scope === "inactive") q = q.eq("status", "inactive");
      return q.limit(1000);
    };

    // PREVIEW MODE
    if (mode === "preview") {
      let affected = 0;
      let details: any = {};

      switch (action_code) {
        case "grant_premium_days": {
          const { data } = await buildPatientQuery();
          affected = data?.length || 0;
          details = { days: payload.days || 7, scope };
          break;
        }
        case "deactivate_patients": {
          const { data } = await supabase.from("nutritionist_patients").select("patient_id").eq("status", "active").limit(1000);
          affected = data?.length || 0;
          break;
        }
        case "activate_patients": {
          const { data } = await supabase.from("nutritionist_patients").select("patient_id").eq("status", "inactive").limit(1000);
          affected = data?.length || 0;
          break;
        }
        case "archive_legacy_pending_plans": {
          const { data } = await supabase.from("meal_plans").select("id").eq("status", "pending").limit(1000);
          affected = data?.length || 0;
          break;
        }
        case "recalculate_clinical_scores": {
          const { data } = await supabase.from("nutritionist_patients").select("patient_id").eq("status", "active").limit(1000);
          affected = data?.length || 0;
          break;
        }
        case "enable_feature_flag_globally":
        case "disable_feature_flag_globally": {
          const { data } = await supabase.from("feature_flags").select("id").limit(100);
          affected = data?.length || 0;
          details = { flag: payload.flag_key };
          break;
        }
        case "publish_global_notice": {
          const { data } = await supabase.from("nutritionist_patients").select("patient_id").eq("status", "active").limit(1000);
          affected = data?.length || 0;
          break;
        }
        default: {
          const { data } = await buildPatientQuery();
          affected = data?.length || 0;
        }
      }

      return new Response(JSON.stringify({
        mode: "preview",
        action_code,
        affected,
        scope,
        details,
        risks: action_code === "deactivate_patients" ? ["Pacientes perderão acesso ao sistema"] : [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // EXECUTE MODE
    const startedAt = new Date().toISOString();
    let affectedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let summary = "";

    switch (action_code) {
      case "grant_premium_days": {
        const days = payload.days || 7;
        const { data: patients } = await buildPatientQuery();
        if (patients) {
          for (const p of patients) {
            try {
              const expiry = new Date(Date.now() + days * 86400000).toISOString();
              await supabase.from("nutritionist_patients").update({ premium_expires_at: expiry } as any).eq("patient_id", p.patient_id);
              successCount++;
            } catch { errorCount++; }
          }
          affectedCount = patients.length;
        }
        summary = `${successCount} pacientes receberam ${days} dias premium`;
        break;
      }

      case "deactivate_patients": {
        const { data: patients } = await supabase.from("nutritionist_patients").select("patient_id").eq("status", "active").limit(1000);
        if (patients) {
          for (const p of patients) {
            try {
              await supabase.from("nutritionist_patients").update({ status: "inactive" }).eq("patient_id", p.patient_id);
              successCount++;
            } catch { errorCount++; }
          }
          affectedCount = patients.length;
        }
        summary = `${successCount} pacientes desativados`;
        break;
      }

      case "activate_patients": {
        const { data: patients } = await supabase.from("nutritionist_patients").select("patient_id").eq("status", "inactive").limit(1000);
        if (patients) {
          for (const p of patients) {
            try {
              await supabase.from("nutritionist_patients").update({ status: "active" }).eq("patient_id", p.patient_id);
              successCount++;
            } catch { errorCount++; }
          }
          affectedCount = patients.length;
        }
        summary = `${successCount} pacientes ativados`;
        break;
      }

      case "archive_legacy_pending_plans": {
        const { data: plans } = await supabase.from("meal_plans").select("id").eq("status", "pending").limit(1000);
        if (plans) {
          for (const pl of plans) {
            try {
              await supabase.from("meal_plans").update({ status: "archived" } as any).eq("id", pl.id);
              successCount++;
            } catch { errorCount++; }
          }
          affectedCount = plans.length;
        }
        summary = `${successCount} planos pendentes arquivados`;
        break;
      }

      case "recalculate_clinical_scores": {
        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-clinical-brain`;
        const res = await fetch(fnUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({}),
        });
        const result = await res.json();
        affectedCount = result.patients_processed || 0;
        successCount = affectedCount;
        summary = `Scores clínicos recalculados para ${affectedCount} pacientes`;
        break;
      }

      case "enable_feature_flag_globally": {
        if (payload.flag_key) {
          await supabase.from("feature_flags").update({ is_enabled: true } as any).eq("flag_key", payload.flag_key);
          affectedCount = 1; successCount = 1;
          summary = `Feature flag '${payload.flag_key}' ativada`;
        }
        break;
      }

      case "disable_feature_flag_globally": {
        if (payload.flag_key) {
          await supabase.from("feature_flags").update({ is_enabled: false } as any).eq("flag_key", payload.flag_key);
          affectedCount = 1; successCount = 1;
          summary = `Feature flag '${payload.flag_key}' desativada`;
        }
        break;
      }

      case "publish_global_notice": {
        const { data: patients } = await supabase.from("nutritionist_patients").select("patient_id").eq("status", "active").limit(1000);
        if (patients && payload.title && payload.message) {
          for (const p of patients) {
            try {
              const pTenant = (await supabase.from("user_tenants").select("tenant_id").eq("user_id", p.patient_id).limit(1).maybeSingle()).data?.tenant_id || null;
              await supabase.from("notifications").insert({
                user_id: p.patient_id,
                title: payload.title,
                message: payload.message,
                type: "system",
                tenant_id: pTenant,
              });
              successCount++;
            } catch { errorCount++; }
          }
          affectedCount = patients.length;
        }
        summary = `Aviso global enviado para ${successCount} pacientes`;
        break;
      }

      case "rerun_pipeline": {
        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-clinical-brain`;
        const res = await fetch(fnUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({}),
        });
        const result = await res.json();
        affectedCount = result.patients_processed || 0;
        successCount = affectedCount;
        summary = `Pipeline re-executado para ${affectedCount} pacientes`;
        break;
      }

      case "release_onboarding_paid": {
        const { data: patients } = await supabase
          .from("nutritionist_patients")
          .select("patient_id, id")
          .eq("status", "active")
          .in("journey_status", ["awaiting_payment", "awaiting_onboarding_release"])
          .limit(1000);
        if (patients) {
          for (const p of patients) {
            try {
              await supabase.from("nutritionist_patients").update({ journey_status: "onboarding_active" }).eq("id", p.id);
              successCount++;
            } catch { errorCount++; }
          }
          affectedCount = patients.length;
        }
        summary = `${successCount} pacientes liberados para onboarding`;
        break;
      }

      case "archive_legacy_plans": {
        const { data: plans } = await supabase.from("meal_plans").select("id").in("status", ["pending", "draft"]).limit(1000);
        if (plans) {
          for (const pl of plans) {
            try {
              await supabase.from("meal_plans").update({ status: "archived" } as any).eq("id", pl.id);
              successCount++;
            } catch { errorCount++; }
          }
          affectedCount = plans.length;
        }
        summary = `${successCount} planos legados arquivados`;
        break;
      }

      case "recalculate_scores": {
        const fnUrl2 = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-clinical-brain`;
        const res2 = await fetch(fnUrl2, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({}),
        });
        const result2 = await res2.json();
        affectedCount = result2.patients_processed || 0;
        successCount = affectedCount;
        summary = `Scores recalculados para ${affectedCount} pacientes`;
        break;
      }

      case "enable_feature_flag":
      case "disable_feature_flag": {
        const enabled = action_code === "enable_feature_flag";
        if (payload.flag_key) {
          await supabase.from("feature_flags").update({ is_enabled: enabled } as any).eq("flag_key", payload.flag_key);
          affectedCount = 1; successCount = 1;
          summary = `Feature flag '${payload.flag_key}' ${enabled ? "ativada" : "desativada"}`;
        }
        break;
      }

      case "send_campaign": {
        summary = "Campanhas devem ser enviadas pelo módulo de campanhas";
        affectedCount = 0; successCount = 0;
        break;
      }

      default:
        summary = `Ação '${action_code}' não implementada`;
    }

    // Log execution
    await supabase.from("global_action_logs").insert({
      action_code,
      executed_by: executed_by || "system",
      filters_json: filters,
      payload_json: payload,
      affected_count: affectedCount,
      success_count: successCount,
      error_count: errorCount,
      execution_status: errorCount === 0 ? "completed" : "completed_with_errors",
      execution_summary: summary,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      mode: "execute",
      action_code,
      affected_count: affectedCount,
      success_count: successCount,
      error_count: errorCount,
      summary,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("Global action error:", err?.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
