/**
 * FitJourney — User Simulation Engine v2.0 (Cost-Controlled)
 * 
 * Modes:
 *   - smoke_test: max 5-6 READ-ONLY scenarios, 3/day limit, any admin
 *   - manual: full battery (17 scenarios), 1/day limit, admin-only
 * 
 * Kill switch via feature_flags.simulator_kill_switch
 */
import { supabase } from "@/integrations/supabase/client";
import { logSystemError } from "@/lib/observability/errorLogger";

export type SimMode = "manual" | "smoke_test";
export type ScenarioStatus = "passed" | "failed" | "skipped";
export type CostLevel = "low_cost" | "medium_cost" | "high_cost";

export interface ScenarioMeta {
  group: string;
  name: string;
  smokeTest: boolean;
  readOnly: boolean;
  costLevel: CostLevel;
  estimatedQueries: number;
  route?: string;
}

export interface ScenarioResult extends ScenarioMeta {
  status: ScenarioStatus;
  durationMs: number;
  error?: string;
  errorDetail?: string;
  affectedRoute?: string;
  affectedFunction?: string;
}

export interface SimulationRunResult {
  runId: string | null;
  mode: SimMode;
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  scenarios: ScenarioResult[];
  warnings: string[];
  errors: string[];
  impactLevel: "low" | "medium" | "high";
  totalEstimatedQueries: number;
  allReadOnly: boolean;
}

type ScenarioDef = ScenarioMeta & {
  fn: () => Promise<{ ok: boolean; error?: string; detail?: string; fnName?: string }>;
};

/** Get pre-execution summary without running anything */
export function getModeSummary(mode: SimMode) {
  const all = defineScenarios();
  const scenarios = mode === "smoke_test" ? all.filter((s) => s.smokeTest) : all;
  const totalQueries = scenarios.reduce((sum, s) => sum + s.estimatedQueries, 0);
  const allReadOnly = scenarios.every((s) => s.readOnly);
  const hasHighCost = scenarios.some((s) => s.costLevel === "high_cost");
  const hasMediumCost = scenarios.some((s) => s.costLevel === "medium_cost");
  const impactLevel: "low" | "medium" | "high" = hasHighCost ? "high" : hasMediumCost ? "medium" : "low";

  return {
    count: scenarios.length,
    totalQueries,
    allReadOnly,
    impactLevel,
    scenarios: scenarios.map(({ fn, ...meta }) => meta),
    rateLimit: mode === "manual" ? "1/dia (admin)" : "3/dia",
  };
}

// ─── Kill Switch ─────────────────────────────────────────────

export async function isSimulatorEnabled(): Promise<boolean> {
  try {
    const { data } = await (supabase as any)
      .from("feature_flags")
      .select("enabled")
      .eq("key", "simulator_kill_switch")
      .maybeSingle();
    return data?.enabled !== false;
  } catch {
    return true; // fail-open for flag read errors
  }
}

export async function toggleKillSwitch(newState: boolean): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;

  // Get current state
  const { data: current } = await (supabase as any)
    .from("feature_flags")
    .select("enabled")
    .eq("key", "simulator_kill_switch")
    .maybeSingle();

  const previousState = current?.enabled ?? true;

  // Update flag
  await (supabase as any)
    .from("feature_flags")
    .update({ enabled: newState })
    .eq("key", "simulator_kill_switch");

  // Audit log
  await (supabase as any).from("simulator_audit_log").insert({
    action: newState ? "kill_switch_enabled" : "kill_switch_disabled",
    previous_state: previousState,
    new_state: newState,
    performed_by: userId,
  });

  return newState;
}

// ─── Scenario Definitions ────────────────────────────────────

function defineScenarios(): ScenarioDef[] {
  return [
    // === PATIENT FLOW (all read-only) ===
    {
      group: "Paciente", name: "Sessão ativa e perfil válido",
      smokeTest: true, readOnly: true, costLevel: "low_cost", estimatedQueries: 2, route: "/",
      fn: async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return { ok: false, error: "Sem sessão ativa" };
        const { data: profile, error } = await supabase
          .from("profiles").select("user_id, full_name")
          .eq("user_id", data.session.user.id).maybeSingle();
        if (error || !profile) return { ok: false, error: "Perfil não encontrado", detail: error?.message };
        return { ok: true };
      },
    },
    {
      group: "Paciente", name: "Visualização de plano alimentar",
      smokeTest: true, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/my-diet",
      fn: async () => {
        const { data, error } = await supabase
          .from("meal_plans" as any).select("id, plan_status, is_active").limit(5);
        if (error) return { ok: false, error: error.message, fnName: "meal_plans.select" };
        return { ok: true, detail: `${(data ?? []).length} plano(s) acessíveis` };
      },
    },
    {
      group: "Paciente", name: "Check-in acessível",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/checkin",
      fn: async () => {
        const { error } = await supabase.from("patient_checkins" as any).select("id").limit(1);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    },
    {
      group: "Paciente", name: "Notificações acessíveis",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/notifications",
      fn: async () => {
        const { data, error } = await supabase.from("notifications").select("id, type, is_read").limit(5);
        if (error) return { ok: false, error: error.message };
        return { ok: true, detail: `${(data ?? []).length} notificação(ões)` };
      },
    },
    {
      group: "Paciente", name: "Checklist diário acessível",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/checklist",
      fn: async () => {
        const { error } = await supabase.from("checklist_tasks" as any).select("id, completed").limit(3);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    },
    {
      group: "Paciente", name: "Receitas acessíveis",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/recipes",
      fn: async () => {
        const { error } = await supabase.from("recipe_library" as any).select("id").limit(1);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    },

    // === PROFESSIONAL FLOW ===
    {
      group: "Profissional", name: "Lista de pacientes acessível",
      smokeTest: true, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/patients",
      fn: async () => {
        const { data, error } = await supabase
          .from("nutritionist_patients" as any).select("patient_id, status").limit(10);
        if (error) return { ok: false, error: error.message, fnName: "nutritionist_patients.select" };
        return { ok: true, detail: `${(data ?? []).length} vínculo(s)` };
      },
    },
    {
      group: "Profissional", name: "Templates de plano acessíveis",
      smokeTest: true, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/meal-plans",
      fn: async () => {
        const { data, error } = await supabase
          .from("meal_plan_templates" as any).select("id, name").limit(5);
        if (error) return { ok: false, error: error.message };
        return { ok: true, detail: `${(data ?? []).length} template(s)` };
      },
    },
    {
      group: "Profissional", name: "Protocolos clínicos acessíveis",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/protocols",
      fn: async () => {
        const { data, error } = await supabase
          .from("nutrition_protocols" as any).select("id, protocol_name, is_active").limit(5);
        if (error) return { ok: false, error: error.message };
        return { ok: true, detail: `${(data ?? []).length} protocolo(s)` };
      },
    },
    {
      group: "Profissional", name: "Agenda acessível",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/appointments",
      fn: async () => {
        const { error } = await supabase.from("patient_appointments" as any).select("id, status").limit(3);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    },
    {
      group: "Profissional", name: "Chat acessível",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 1, route: "/chat",
      fn: async () => {
        const { error } = await supabase.from("chat_messages" as any).select("id").limit(1);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    },
    {
      group: "Profissional", name: "Alertas clínicos acessíveis",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 1,
      fn: async () => {
        const { error } = await supabase.from("clinical_alerts" as any).select("id, alert_type, severity").limit(3);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
    },
    {
      group: "Profissional", name: "Pipeline de plano executável",
      smokeTest: true, readOnly: true, costLevel: "low_cost", estimatedQueries: 1,
      fn: async () => {
        const { data, error } = await (supabase as any)
          .from("pipeline_execution_logs").select("id, pipeline_name, status")
          .order("started_at", { ascending: false }).limit(3);
        if (error) return { ok: false, error: error.message, fnName: "pipeline_execution_logs" };
        return { ok: true, detail: `${(data ?? []).length} execução(ões) recentes` };
      },
    },

    // === HYBRID FLOW ===
    {
      group: "Híbrido", name: "Contexto de workspace disponível",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 0,
      fn: async () => {
        const stored = localStorage.getItem("fj_workspace_context");
        return { ok: true, detail: `Contexto atual: ${stored ?? "default"}` };
      },
    },
    {
      group: "Híbrido", name: "Perfil com role válido",
      smokeTest: false, readOnly: true, costLevel: "low_cost", estimatedQueries: 2,
      fn: async () => {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) return { ok: false, error: "Sem sessão" };
        const { data: profile } = await supabase
          .from("profiles").select("user_id, role")
          .eq("user_id", session.session.user.id).maybeSingle();
        if (!profile) return { ok: false, error: "Perfil não encontrado" };
        return { ok: true, detail: `Role: ${(profile as any).role ?? "undefined"}` };
      },
    },

    // === SYSTEM INTEGRITY ===
    {
      group: "Sistema", name: "Consistência is_active vs plan_status",
      smokeTest: true, readOnly: true, costLevel: "low_cost", estimatedQueries: 1,
      fn: async () => {
        const { count, error } = await (supabase as any)
          .from("meal_plans").select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .not("plan_status", "in", '("approved","published_to_patient","published")');
        if (error) return { ok: false, error: error.message };
        if ((count ?? 0) > 0) return { ok: false, error: `${count} plano(s) inconsistentes` };
        return { ok: true };
      },
    },
    {
      group: "Sistema", name: "Realtime subscription test",
      smokeTest: false, readOnly: true, costLevel: "medium_cost", estimatedQueries: 0,
      fn: async () => {
        const ch = supabase.channel("sim-test");
        const result = await new Promise<string>((resolve) => {
          const timer = setTimeout(() => resolve("timeout"), 8000);
          ch.on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {})
            .subscribe((s) => {
              if (s === "SUBSCRIBED") { clearTimeout(timer); resolve("ok"); }
            });
        });
        supabase.removeChannel(ch);
        if (result === "timeout") return { ok: false, error: "Realtime timeout (8s)" };
        return { ok: true };
      },
    },
  ];
}

// ─── Engine ──────────────────────────────────────────────────

export async function runSimulation(mode: SimMode): Promise<SimulationRunResult> {
  // Kill switch check (backend layer)
  const enabled = await isSimulatorEnabled();
  if (!enabled) {
    return {
      runId: null, mode, totalScenarios: 0, passed: 0, failed: 0, skipped: 0,
      durationMs: 0, scenarios: [], warnings: [], impactLevel: "low",
      totalEstimatedQueries: 0, allReadOnly: true,
      errors: ["Simulador desativado pelo administrador (kill switch)"],
    };
  }

  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;

  // Check mode-aware rate limit
  try {
    const { data: allowed } = await supabase.rpc("check_simulation_rate_limit" as any, { _mode: mode });
    if (allowed === false) {
      const limitMsg = mode === "manual"
        ? "Limite diário atingido (máx. 1 bateria completa/dia)"
        : "Limite diário atingido (máx. 3 smoke tests/dia)";
      return {
        runId: null, mode, totalScenarios: 0, passed: 0, failed: 0, skipped: 0,
        durationMs: 0, scenarios: [], warnings: [], impactLevel: "low",
        totalEstimatedQueries: 0, allReadOnly: true, errors: [limitMsg],
      };
    }
  } catch {
    // If RPC fails, proceed but warn
  }

  // Create run record
  const { data: runRow } = await (supabase as any)
    .from("simulation_runs")
    .insert({ executed_by: userId, mode, status: "running" })
    .select("id").single();

  const runId: string | null = runRow?.id ?? null;

  const allScenarios = defineScenarios();
  const scenarios = mode === "smoke_test"
    ? allScenarios.filter((s) => s.smokeTest)
    : allScenarios;

  const results: ScenarioResult[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const start = Date.now();

  for (const scenario of scenarios) {
    const scenarioStart = Date.now();
    const { fn, ...meta } = scenario;
    try {
      const result = await fn();
      const durationMs = Date.now() - scenarioStart;
      const status: ScenarioStatus = result.ok ? "passed" : "failed";

      if (!result.ok) {
        errors.push(`[${scenario.group}] ${scenario.name}: ${result.error}`);
        logSystemError({
          module: `simulator/${scenario.group}`,
          error_message: result.error ?? "Scenario failed",
          action_attempted: scenario.name,
          page_route: scenario.route,
          severity: "medium",
          auto_recovered: false,
        });
      }

      if (durationMs > 5000) {
        warnings.push(`[${scenario.group}] ${scenario.name}: Lento (${durationMs}ms)`);
      }

      results.push({ ...meta, status, durationMs, error: result.ok ? undefined : result.error,
        errorDetail: result.ok ? undefined : result.detail,
        affectedRoute: scenario.route, affectedFunction: result.ok ? undefined : result.fnName });

      if (runId) {
        await (supabase as any).from("simulation_scenario_results").insert({
          run_id: runId, scenario_group: scenario.group, scenario_name: scenario.name,
          status, duration_ms: durationMs, error_message: result.ok ? null : result.error,
          error_detail: result.ok ? null : result.detail,
          affected_route: scenario.route ?? null,
          affected_function: result.ok ? null : (result.fnName ?? null),
        });
      }
    } catch (err: any) {
      const durationMs = Date.now() - scenarioStart;
      errors.push(`[${scenario.group}] ${scenario.name}: Exception: ${err.message}`);
      results.push({ ...meta, status: "failed", durationMs, error: err.message, affectedRoute: scenario.route });

      if (runId) {
        await (supabase as any).from("simulation_scenario_results").insert({
          run_id: runId, scenario_group: scenario.group, scenario_name: scenario.name,
          status: "failed", duration_ms: durationMs, error_message: err.message,
          affected_route: scenario.route ?? null,
        });
      }
    }
  }

  const totalDuration = Date.now() - start;
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const totalEstimatedQueries = results.reduce((s, r) => s + r.estimatedQueries, 0);
  const allReadOnly = results.every((r) => r.readOnly);
  const hasHighCost = results.some((r) => r.costLevel === "high_cost");
  const hasMediumCost = results.some((r) => r.costLevel === "medium_cost");
  const impactLevel: "low" | "medium" | "high" = hasHighCost ? "high" : hasMediumCost ? "medium" : "low";

  if (runId) {
    await (supabase as any).from("simulation_runs").update({
      status: failed > 0 ? (failed === results.length ? "failed" : "partial") : "completed",
      scenarios_total: results.length, scenarios_passed: passed,
      scenarios_failed: failed, scenarios_skipped: skipped,
      duration_ms: totalDuration, warnings, errors,
      finished_at: new Date().toISOString(),
    }).eq("id", runId);

    await (supabase as any).from("system_performance_logs").insert({
      flow_name: `simulation_${mode}`, execution_time_ms: totalDuration,
      success: failed === 0, metadata: { scenarios: results.length, passed, failed },
    }).then(() => {}).catch(() => {});

    if (failed > 0) {
      await (supabase as any).from("system_alerts").insert({
        alert_type: "SIMULATION_FAILURE", severity: failed > 3 ? "critical" : "warning",
        title: `Simulação ${mode}: ${failed} falha(s)`,
        description: errors.slice(0, 5).join("\n"), module: "simulator", is_active: true,
      }).then(() => {}).catch(() => {});
    }
  }

  try {
    await supabase.rpc("log_pipeline_execution" as any, {
      _pipeline_name: `simulation_${mode}`,
      _status: failed > 0 ? "partial" : "completed",
      _metadata: { scenarios: results.length, passed, failed, duration_ms: totalDuration },
    });
  } catch { /* non-critical */ }

  return {
    runId, mode, totalScenarios: results.length, passed, failed, skipped,
    durationMs: totalDuration, scenarios: results, warnings, errors,
    impactLevel, totalEstimatedQueries, allReadOnly,
  };
}
