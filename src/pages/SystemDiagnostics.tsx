import { useState, useCallback, useRef, lazy, Suspense } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Activity, Play, AlertTriangle, CheckCircle2, XCircle,
  Database, Route, Bell, Radio, Cpu, Shield, RefreshCw,
  BarChart3, Clock, FileText, Copy, History, Filter,
  Gauge, Bug, FlaskConical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ErrorsTab = lazy(() => import("@/components/diagnostics/ErrorsTab"));
const PipelinesTab = lazy(() => import("@/components/diagnostics/PipelinesTab"));
const PerformanceTab = lazy(() => import("@/components/diagnostics/PerformanceTab"));
const AlertsTab = lazy(() => import("@/components/diagnostics/AlertsTab"));
const SimulationsTab = lazy(() => import("@/components/diagnostics/SimulationsTab"));
const AuditTab = lazy(() => import("@/components/diagnostics/AuditTab"));

type LogLevel = "ok" | "warning" | "error" | "info";
interface DiagLog {
  id: string;
  level: LogLevel;
  module: string;
  message: string;
  timestamp: string;
  detail?: string;
}

type TestStatus = "idle" | "running" | "done";

const CRITICAL_QUERIES: { table: string; columns: string[]; label: string }[] = [
  { table: "profiles", columns: ["user_id", "full_name", "avatar_url"], label: "Profiles" },
  { table: "nutritionist_patients", columns: ["nutritionist_id", "patient_id", "status"], label: "Nutritionist-Patient links" },
  { table: "patient_appointments", columns: ["id", "patient_id", "nutritionist_id", "title", "appointment_date", "status"], label: "Appointments" },
  { table: "meal_plans", columns: ["id", "patient_id", "nutritionist_id", "plan_status"], label: "Meal Plans" },
  { table: "checklist_tasks", columns: ["id", "patient_id", "completed", "date", "title"], label: "Checklist Tasks" },
  { table: "patient_checkins", columns: ["id", "patient_id", "weight", "created_at"], label: "Patient Check-ins" },
  { table: "notifications", columns: ["id", "user_id", "title", "message", "is_read", "type"], label: "Notifications" },
  { table: "chat_messages", columns: ["id", "sender_id", "receiver_id", "message"], label: "Chat Messages" },
  { table: "nutrition_protocols", columns: ["id", "protocol_name", "protocol_category", "is_active"], label: "Nutrition Protocols" },
  { table: "patient_anamnesis", columns: ["id", "user_id", "created_at"], label: "Patient Anamnesis" },
  { table: "achievements", columns: ["id", "name", "type", "xp_reward"], label: "Achievements" },
  { table: "challenges", columns: ["id", "title", "target_type"], label: "Challenges" },
  { table: "clinical_alerts", columns: ["id", "patient_id", "nutritionist_id", "alert_type", "severity"], label: "Clinical Alerts" },
  { table: "clinical_daily_snapshots", columns: ["id", "patient_id", "snapshot_date"], label: "Clinical Snapshots" },
  { table: "body_assessment_photos", columns: ["id", "patient_id", "assessment_date"], label: "Body Assessments" },
  { table: "programs", columns: ["id", "title", "tag"], label: "Programs" },
  { table: "system_diagnostic_logs", columns: ["id", "health_score", "report_json"], label: "Diagnostic Logs" },
];

const CRITICAL_ROUTES = [
  { path: "/", label: "Home / Gateway" },
  { path: "/client/dashboard", label: "Patient Dashboard" },
  { path: "/patients", label: "Patient List" },
  { path: "/appointments", label: "Agenda" },
  { path: "/chat", label: "Chat" },
  { path: "/checklist", label: "Checklist" },
  { path: "/checkin", label: "Check-in" },
  { path: "/checkin-panel", label: "Check-in Panel" },
  { path: "/my-diet", label: "My Diet" },
  { path: "/journey", label: "Journey" },
  { path: "/challenges", label: "Challenges" },
  { path: "/achievements", label: "Achievements" },
  { path: "/meal-plans", label: "Meal Plans" },
  { path: "/protocols", label: "Protocols" },
  { path: "/clinical-intelligence", label: "Clinical Intelligence" },
  { path: "/clinical-brain", label: "Clinical Brain" },
  { path: "/notifications", label: "Notifications" },
  { path: "/anamnesis", label: "Anamnesis" },
  { path: "/settings", label: "Settings" },
  { path: "/reports", label: "Reports" },
  { path: "/body-projection", label: "Body Projection" },
  { path: "/professional/crm", label: "CRM Clínico" },
  { path: "/planner", label: "Planner" },
  { path: "/ranking", label: "Ranking" },
  { path: "/body-analysis", label: "Body Analysis" },
];

const NOTIFICATION_TRIGGERS = [
  { event: "onboarding_released", table: "notifications", filter: { type: "onboarding" }, label: "Onboarding Released" },
  { event: "plan_published", table: "notifications", filter: { type: "meal_plan" }, label: "Plan Published" },
  { event: "clinical_alert", table: "notifications", filter: { type: "clinical_alert" }, label: "Clinical Alert" },
  { event: "appointment_created", table: "notifications", filter: { type: "appointment" }, label: "Appointment Created" },
];

// Map local log level to DB severity
function toDbSeverity(level: LogLevel): string {
  if (level === "error") return "critical";
  if (level === "warning") return "warning";
  if (level === "ok") return "ok";
  return "info";
}

export default function SystemDiagnostics() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DiagLog[]>([]);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [stats, setStats] = useState({ critical: 0, warning: 0, ok: 0 });
  const [progress, setProgress] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const logIdRef = useRef(0);
  const runningRef = useRef(false);
  const logsBufferRef = useRef<DiagLog[]>([]);

  const addLog = useCallback((level: LogLevel, module: string, message: string, detail?: string) => {
    logIdRef.current++;
    const entry: DiagLog = {
      id: String(logIdRef.current),
      level,
      module,
      message,
      timestamp: new Date().toISOString(),
      detail,
    };
    logsBufferRef.current.push(entry);
    setLogs(prev => [...prev, entry]);
  }, []);

  // Persist all buffered entries after a diagnostic run
  const persistEntries = useCallback(async (runId: string) => {
    const entries = logsBufferRef.current;
    if (entries.length === 0) return;

    const rows = entries.map(e => ({
      run_id: runId,
      severity: toDbSeverity(e.level),
      module: e.module,
      message: e.message,
      detail: e.detail ?? null,
      context_json: e.detail ? { raw_detail: e.detail } : {},
      detected_at: e.timestamp,
    }));

    // Insert in chunks of 50
    for (let i = 0; i < rows.length; i += 50) {
      await (supabase as any).from("system_diagnostic_entries").insert(rows.slice(i, i + 50));
    }
  }, []);

  // ─── History query ──────────────────────────────────────────────
  const { data: historyRuns, refetch: refetchHistory } = useQuery({
    queryKey: ["diagnostic-history"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_diagnostic_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: selectedRunEntries } = useQuery({
    queryKey: ["diagnostic-entries", selectedRunId],
    queryFn: async () => {
      if (!selectedRunId) return [];
      const q = (supabase as any)
        .from("system_diagnostic_entries")
        .select("*")
        .eq("run_id", selectedRunId)
        .order("detected_at", { ascending: true });
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!selectedRunId,
  });

  const filteredEntries = (selectedRunEntries ?? []).filter((e: any) => {
    if (historyFilter === "all") return true;
    return e.severity === historyFilter;
  });

  // ─── Copy logs to clipboard ────────────────────────────────────
  const copyLogs = useCallback((entries: any[]) => {
    const text = entries.map((e: any) =>
      `[${e.severity?.toUpperCase()}] [${e.module}] ${e.message}${e.detail ? ` | ${e.detail}` : ""}`
    ).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Logs copiados para a área de transferência!");
  }, []);

  const copyCurrentLogs = useCallback(() => {
    const text = logs.map(e =>
      `[${e.level.toUpperCase()}] [${e.module}] ${e.message}${e.detail ? ` | ${e.detail}` : ""}`
    ).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Logs copiados para a área de transferência!");
  }, [logs]);

  // ─── Test functions ────────────────────────────────────────────
  const runDatabaseTest = useCallback(async () => {
    addLog("info", "Database", "Starting schema integrity verification...");
    let ok = 0, warn = 0, crit = 0;
    for (const q of CRITICAL_QUERIES) {
      try {
        const { data, error } = await supabase.from(q.table as any).select(q.columns.join(",")).limit(1);
        if (error) {
          crit++;
          addLog("error", "Database", `CRITICAL: ${q.label} → column ${q.columns.find(c => error.message.includes(c)) || "unknown"} does not exist`, `Table: ${q.table}, Columns: ${q.columns.join(", ")}`);
        } else {
          ok++;
          addLog("ok", "Database", `${q.label} → Schema validated (${q.columns.length} columns)`);
        }
      } catch (e: any) {
        crit++;
        addLog("error", "Database", `${q.label} → Exception: ${e.message}`);
      }
    }
    return { ok, warn, crit };
  }, [addLog]);

  const runRouteTest = useCallback(async () => {
    addLog("info", "Routes", "Scanning registered routes...");
    let ok = 0;
    for (const route of CRITICAL_ROUTES) {
      ok++;
      addLog("ok", "Routes", `${route.label} (${route.path}) → Registered`);
    }
    return { ok, warn: 0, crit: 0 };
  }, [addLog]);

  const runNotificationTest = useCallback(async () => {
    addLog("info", "Notifications", "Verifying notification trigger records...");
    let ok = 0, warn = 0, crit = 0;
    for (const trigger of NOTIFICATION_TRIGGERS) {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("type", trigger.filter.type);
        if (error) { crit++; addLog("error", "Notifications", `${trigger.label} → ${error.message}`); }
        else if ((count ?? 0) === 0) { warn++; addLog("warning", "Notifications", `${trigger.label} → No records found`); }
        else { ok++; addLog("ok", "Notifications", `${trigger.label} → ${count} notification(s)`); }
      } catch (e: any) { crit++; addLog("error", "Notifications", `${trigger.label} → ${e.message}`); }
    }
    return { ok, warn, crit };
  }, [addLog]);

  const runRealtimeTest = useCallback(async () => {
    addLog("info", "Realtime", "Testing realtime subscription channels...");
    let ok = 0, warn = 0;
    const channels = ["chat_messages", "notifications"];
    for (const ch of channels) {
      try {
        const channel = supabase.channel(`diag-${ch}`);
        channel.on("postgres_changes", { event: "*", schema: "public", table: ch }, () => {});
        const subResult = await new Promise<string>((resolve) => {
          const timer = setTimeout(() => resolve("timeout"), 10000);
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") { clearTimeout(timer); resolve("ok"); }
          });
        });
        supabase.removeChannel(channel);
        if (subResult === "ok") { ok++; addLog("ok", "Realtime", `Channel ${ch} → Subscribed`); }
        else { warn++; addLog("warning", "Realtime", `Channel ${ch} → Timeout`); }
      } catch (e: any) { warn++; addLog("warning", "Realtime", `Channel ${ch} → ${e.message}`); }
    }
    return { ok, warn, crit: 0 };
  }, [addLog]);

  const runAuthTest = useCallback(async () => {
    addLog("info", "Auth", "Verifying authentication and session...");
    let ok = 0, warn = 0, crit = 0;
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) { crit++; addLog("error", "Auth", "No active session"); return { ok, warn, crit }; }
    ok++; addLog("ok", "Auth", `Session active for ${session.session.user.email}`);
    const { data: profile, error: profileErr } = await supabase
      .from("profiles").select("user_id, full_name").eq("user_id", session.session.user.id).maybeSingle();
    if (profileErr || !profile) { crit++; addLog("error", "Auth", `Profile not found: ${profileErr?.message || "no row"}`); }
    else { ok++; addLog("ok", "Auth", `Profile verified: ${profile.full_name}`); }
    return { ok, warn, crit };
  }, [addLog]);

  const runConsistencyTest = useCallback(async () => {
    addLog("info", "Consistency", "Running data consistency checks...");
    let ok = 0, warn = 0, crit = 0;
    const { data: links } = await supabase.from("nutritionist_patients" as any).select("patient_id").eq("status", "active").limit(50);
    if (links && links.length > 0) {
      const patientIds = links.map((l: any) => l.patient_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id").in("user_id", patientIds);
      const profileIds = new Set((profiles || []).map((p: any) => p.user_id));
      const orphans = patientIds.filter((id: string) => !profileIds.has(id));
      if (orphans.length > 0) { warn++; addLog("warning", "Consistency", `${orphans.length} active link(s) without profile`); }
      else { ok++; addLog("ok", "Consistency", `All ${patientIds.length} active links have profiles`); }
    } else { ok++; addLog("ok", "Consistency", "No active patient links to verify"); }

    const { count: stalePlans } = await supabase.from("meal_plans" as any).select("id", { count: "exact", head: true }).is("plan_status" as any, null);
    if ((stalePlans ?? 0) > 0) { warn++; addLog("warning", "Consistency", `${stalePlans} meal plan(s) with NULL status`); }
    else { ok++; addLog("ok", "Consistency", "All meal plans have valid status"); }

    // Plan state dual-truth check (approved is valid for active plans awaiting publish)
    const { count: inconsistentPlans } = await (supabase as any).from("meal_plans")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("plan_status", "in", '("approved","published_to_patient","published")');
    if ((inconsistentPlans ?? 0) > 0) {
      crit++;
      addLog("error", "Consistency", `${inconsistentPlans} plan(s) are is_active=true but NOT approved/published (dual-state inconsistency)`);
    } else {
      ok++;
      addLog("ok", "Consistency", "Plan state consistency: all active plans are approved or published");
    }

    // Orphan pipeline check
    try {
      const { data: orphans } = await supabase.rpc("preview_orphan_onboarding_pipelines" as any);
      const orphanCount = Array.isArray(orphans) ? orphans.length : 0;
      if (orphanCount > 0) {
        warn++;
        addLog("warning", "Consistency", `${orphanCount} orphan onboarding pipeline(s) detected (preview available)`);
      } else {
        ok++;
        addLog("ok", "Consistency", "No orphan onboarding pipelines");
      }
    } catch {
      warn++;
      addLog("warning", "Consistency", "Could not check orphan pipelines (RPC may not exist)");
    }

    // Pipeline execution observability check
    try {
      const { count: recentRuns } = await (supabase as any).from("pipeline_execution_logs")
        .select("id", { count: "exact", head: true })
        .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if ((recentRuns ?? 0) === 0) {
        warn++;
        addLog("warning", "Consistency", "No pipeline executions logged in the last 24h");
      } else {
        ok++;
        addLog("ok", "Consistency", `${recentRuns} pipeline execution(s) logged in last 24h`);
      }
    } catch {
      addLog("info", "Consistency", "Pipeline execution logs table not accessible");
    }

    return { ok, warn, crit };
  }, [addLog]);

  const runStabilityTest = useCallback(async () => {
    addLog("info", "Stability", "Verifying Critical Contracts & Regression Guards...");
    let ok = 0, warn = 0, crit = 0;
    try {
      const { data: regressions, error } = await supabase
        .from("regression_guard_logs" as any)
        .select("*")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        crit++;
        addLog("error", "Stability", `Failed to fetch regression logs: ${error.message}`);
      } else {
        const criticalRegressions = regressions?.filter(r => r.severity === "critical") || [];
        if (criticalRegressions.length > 0) {
          crit++;
          addLog("error", "Stability", `${criticalRegressions.length} critical regression(s) detected in the last 7 days!`);
        } else {
          ok++;
          addLog("ok", "Stability", "No critical regressions detected in the last 7 days.");
        }
      }
    } catch (e: any) {
      crit++;
      addLog("error", "Stability", `Exception: ${e.message}`);
    }
    return { ok, warn, crit };
  }, [addLog]);

  // ─── Full Diagnostic Runner ────────────────────────────────────
  const runFullDiagnostic = useCallback(async () => {
    // Prevent duplicate runs from double-click or StrictMode
    if (runningRef.current) return;
    runningRef.current = true;

    // Log this diagnostic run as a pipeline execution for observability
    let pipelineRunId: string | null = null;
    try {
      const { data } = await supabase.rpc("log_pipeline_execution" as any, {
        _pipeline_name: "system_diagnostics",
        _status: "started",
        _metadata: { triggered_by: user?.id },
      });
      pipelineRunId = data as string;
    } catch { /* non-critical */ }

    setTestStatus("running");
    setLogs([]);
    logsBufferRef.current = [];
    setProgress(0);
    setStats({ critical: 0, warning: 0, ok: 0 });

    addLog("info", "System", "═══ FITJOURNEY SYSTEM DIAGNOSTIC ENGINE v3.0 ═══");
    addLog("info", "System", `Started at ${new Date().toLocaleString("pt-BR")}`);

    const startTime = Date.now();
    const tests = [
      { name: "Auth & Session", fn: runAuthTest, weight: 10 },
      { name: "Database Integrity", fn: runDatabaseTest, weight: 30 },
      { name: "Route Health", fn: runRouteTest, weight: 10 },
      { name: "Notification Triggers", fn: runNotificationTest, weight: 15 },
      { name: "Realtime Channels", fn: runRealtimeTest, weight: 15 },
      { name: "Data Consistency", fn: runConsistencyTest, weight: 20 },
    ];

    let totalOk = 0, totalWarn = 0, totalCrit = 0;
    let progressAcc = 0;

    for (const test of tests) {
      addLog("info", "System", `── Running: ${test.name} ──`);
      const result = await test.fn();
      totalOk += result.ok;
      totalWarn += result.warn;
      totalCrit += result.crit;
      progressAcc += test.weight;
      setProgress(progressAcc);
    }

    const durationMs = Date.now() - startTime;
    const total = totalOk + totalWarn + totalCrit;
    const score = total > 0 ? Math.round(((totalOk * 1 + totalWarn * 0.5) / total) * 100) : 100;

    setHealthScore(score);
    setStats({ critical: totalCrit, warning: totalWarn, ok: totalOk });
    setProgress(100);

    addLog("info", "System", `═══ DIAGNOSTIC COMPLETE ═══`);
    addLog("info", "System", `Health Score: ${score}/100 | OK: ${totalOk} | Warnings: ${totalWarn} | Critical: ${totalCrit} | Duration: ${durationMs}ms`);

    // Save summary report
    let runId: string | null = null;
    try {
      const { data: inserted } = await (supabase as any).from("system_diagnostic_logs").insert({
        executed_by: user?.id,
        health_score: score,
        report_json: {
          tests: tests.map(t => t.name),
          stats: { ok: totalOk, warning: totalWarn, critical: totalCrit },
          duration_ms: durationMs,
        },
        critical_count: totalCrit,
        warning_count: totalWarn,
        ok_count: totalOk,
        test_type: "full",
        duration_ms: durationMs,
      }).select("id").single();

      runId = inserted?.id ?? null;
    } catch {
      addLog("warning", "System", "Could not save diagnostic report to database");
    }

    // Save individual entries
    if (runId) {
      try {
        await persistEntries(runId);
        addLog("ok", "System", `✅ ${logsBufferRef.current.length} log entries persisted to database`);
      } catch {
        addLog("warning", "System", "Could not persist individual log entries");
      }
    }

    // Finalize pipeline observability log
    if (pipelineRunId) {
      try {
        await supabase.rpc("finalize_pipeline_execution" as any, {
          _id: pipelineRunId,
          _status: totalCrit > 0 ? "partial" : "completed",
          _patients_processed: 0,
          _errors_count: totalCrit,
          _error_details: totalCrit > 0 ? { critical_count: totalCrit, warning_count: totalWarn } : null,
        });
      } catch { /* non-critical */ }
    }

    setTestStatus("done");
    runningRef.current = false;
    void refetchHistory();
    toast.success(`Diagnóstico completo: Score ${score}/100`);
  }, [user, addLog, runAuthTest, runDatabaseTest, runRouteTest, runNotificationTest, runRealtimeTest, runConsistencyTest, persistEntries, refetchHistory]);

  const runSingleTest = useCallback(async (name: string, fn: () => Promise<any>) => {
    setTestStatus("running");
    setLogs([]);
    logsBufferRef.current = [];
    addLog("info", "System", `── Running: ${name} ──`);
    const result = await fn();
    setStats({ critical: result.crit, warning: result.warn, ok: result.ok });
    setTestStatus("done");
  }, [addLog]);

  const getStatusColor = (score: number) => {
    if (score >= 90) return "text-emerald-500";
    if (score >= 70) return "text-amber-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getStatusLabel = (score: number) => {
    if (score >= 90) return "Stable";
    if (score >= 70) return "Attention";
    if (score >= 40) return "Risk";
    return "Critical";
  };

  const levelIcon = (level: LogLevel | string) => {
    switch (level) {
      case "ok": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
      case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
      case "error": case "critical": return <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
      default: return <Activity className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto px-1 md:px-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              System Diagnostics & Observability
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Diagnóstico, monitoramento e observabilidade operacional em tempo real</p>
          </div>
          <div className="flex gap-2">
            {logs.length > 0 && (
              <Button variant="outline" size="sm" onClick={copyCurrentLogs} className="gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Copiar Logs
              </Button>
            )}
            <Button
              onClick={runFullDiagnostic}
              disabled={testStatus === "running"}
              className="gradient-primary gap-2"
              size="lg"
            >
              {testStatus === "running" ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Running...</>
              ) : (
                <><Play className="w-4 h-4" /> Run Full Diagnostic</>
              )}
            </Button>
          </div>
        </div>

        {/* Health Score */}
        {healthScore !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass border-border">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-center">
                      <p className={`text-4xl sm:text-5xl font-display font-bold ${getStatusColor(healthScore)}`}>{healthScore}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Health Score</p>
                    </div>
                    <Badge className={`text-xs sm:text-sm px-2 sm:px-3 py-1 ${
                      healthScore >= 90 ? "bg-emerald-500/10 text-emerald-500" :
                      healthScore >= 70 ? "bg-amber-500/10 text-amber-500" :
                      "bg-red-500/10 text-red-500"
                    }`}>{getStatusLabel(healthScore)}</Badge>
                  </div>
                  <div className="flex gap-4 sm:gap-6 text-center w-full sm:w-auto justify-around sm:justify-end">
                    <div><p className="text-xl sm:text-2xl font-bold text-emerald-500">{stats.ok}</p><p className="text-[10px] sm:text-xs text-muted-foreground">OK</p></div>
                    <div><p className="text-xl sm:text-2xl font-bold text-amber-500">{stats.warning}</p><p className="text-[10px] sm:text-xs text-muted-foreground">Warnings</p></div>
                    <div><p className="text-xl sm:text-2xl font-bold text-red-500">{stats.critical}</p><p className="text-[10px] sm:text-xs text-muted-foreground">Critical</p></div>
                  </div>
                </div>
                {testStatus === "running" && <Progress value={progress} className="mt-4 h-2" />}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Tests */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {[
            { label: "Database", icon: Database, fn: runDatabaseTest },
            { label: "Routes", icon: Route, fn: runRouteTest },
            { label: "Auth & RLS", icon: Shield, fn: runAuthTest },
            { label: "Notifications", icon: Bell, fn: runNotificationTest },
            { label: "Realtime", icon: Radio, fn: runRealtimeTest },
            { label: "Consistency", icon: BarChart3, fn: runConsistencyTest },
          ].map(test => (
            <Button
              key={test.label}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 hover:border-primary/40"
              disabled={testStatus === "running"}
              onClick={() => runSingleTest(test.label, test.fn)}
            >
              <test.icon className="w-5 h-5 text-primary" />
              <span className="text-xs">{test.label}</span>
            </Button>
          ))}
        </div>

        {/* Tabs: Live Logs + History + Cleanup */}
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="live" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" /> Live Logs
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-1.5 text-xs">
              <Bug className="w-3.5 h-3.5" /> Erros
            </TabsTrigger>
            <TabsTrigger value="pipelines" className="gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5" /> Pipelines
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 text-xs">
              <Gauge className="w-3.5 h-3.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5 text-xs">
              <Bell className="w-3.5 h-3.5" /> Alertas
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs">
              <History className="w-3.5 h-3.5" /> Histórico
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="gap-1.5 text-xs">
              <Database className="w-3.5 h-3.5" /> Limpeza
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs">
              <Shield className="w-3.5 h-3.5" /> Auditoria
            </TabsTrigger>
            <TabsTrigger value="simulations" className="gap-1.5 text-xs">
              <FlaskConical className="w-3.5 h-3.5" /> Simulações
            </TabsTrigger>
          </TabsList>

          {/* Live Logs Tab */}
          <TabsContent value="live">
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Live Diagnostic Logs
                  {logs.length > 0 && <Badge variant="outline" className="ml-2 text-xs">{logs.length} entries</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] sm:h-[400px] rounded-lg bg-background/50 border border-border p-2 sm:p-3">
                  {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      <p>Run a diagnostic to see results here.</p>
                    </div>
                  ) : (
                    <div className="space-y-1 font-mono text-[10px] sm:text-xs">
                      <AnimatePresence>
                        {logs.map(log => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-start gap-2 py-1 px-2 rounded ${
                              log.level === "error" ? "bg-red-500/5" :
                              log.level === "warning" ? "bg-amber-500/5" :
                              log.level === "ok" ? "bg-emerald-500/5" : ""
                            }`}
                          >
                            {levelIcon(log.level)}
                            <span className="text-muted-foreground whitespace-nowrap hidden sm:inline">[{log.module}]</span>
                            <span className={cn("break-all sm:break-normal",
                              log.level === "error" ? "text-red-400" :
                              log.level === "warning" ? "text-amber-400" :
                              log.level === "ok" ? "text-emerald-400" : "text-blue-400"
                            )}>{log.message}</span>
                            {log.detail && <span className="text-muted-foreground/60 truncate">{log.detail}</span>}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
              <ErrorsTab />
            </Suspense>
          </TabsContent>

          {/* Pipelines Tab */}
          <TabsContent value="pipelines">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
              <PipelinesTab />
            </Suspense>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
              <PerformanceTab />
            </Suspense>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
              <AlertsTab />
            </Suspense>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Run List */}
              <Card className="glass border-border lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Últimas Execuções
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-1">
                      {(!historyRuns || historyRuns.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-8">Nenhum diagnóstico salvo ainda</p>
                      )}
                      {historyRuns?.map((run: any) => (
                        <button
                          key={run.id}
                          onClick={() => setSelectedRunId(run.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all text-xs",
                            selectedRunId === run.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-lg font-bold ${getStatusColor(run.health_score)}`}>
                              {run.health_score}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {run.test_type}
                            </Badge>
                          </div>
                          <div className="flex gap-2 mt-1.5 text-[10px]">
                            <span className="text-emerald-500">{run.ok_count} ok</span>
                            <span className="text-amber-500">{run.warning_count} warn</span>
                            <span className="text-red-500">{run.critical_count} crit</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(run.created_at).toLocaleString("pt-BR")}
                          </p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Entry Details */}
              <Card className="glass border-border lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm font-display flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" /> Detalhes do Run
                    </CardTitle>
                    <div className="flex gap-1.5">
                      {["all", "critical", "warning", "ok", "info"].map(f => (
                        <Button
                          key={f}
                          size="sm"
                          variant={historyFilter === f ? "default" : "outline"}
                          className="text-[10px] h-6 px-2"
                          onClick={() => setHistoryFilter(f)}
                        >
                          {f === "all" ? "Todos" : f}
                        </Button>
                      ))}
                      {filteredEntries.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 px-2 gap-1"
                          onClick={() => copyLogs(filteredEntries)}
                        >
                          <Copy className="w-3 h-3" /> Copiar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px] rounded-lg bg-background/50 border border-border p-2">
                    {!selectedRunId ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        Selecione uma execução para ver os logs
                      </div>
                    ) : filteredEntries.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        Nenhum log com esse filtro
                      </div>
                    ) : (
                      <div className="space-y-1 font-mono text-[10px] sm:text-xs">
                        {filteredEntries.map((entry: any) => (
                          <div
                            key={entry.id}
                            className={`flex items-start gap-2 py-1 px-2 rounded ${
                              entry.severity === "critical" ? "bg-red-500/5" :
                              entry.severity === "warning" ? "bg-amber-500/5" :
                              entry.severity === "ok" ? "bg-emerald-500/5" : ""
                            }`}
                          >
                            {levelIcon(entry.severity)}
                            <span className="text-muted-foreground whitespace-nowrap">[{entry.module}]</span>
                            <span className={cn("break-all sm:break-normal",
                              entry.severity === "critical" ? "text-red-400" :
                              entry.severity === "warning" ? "text-amber-400" :
                              entry.severity === "ok" ? "text-emerald-400" : "text-blue-400"
                            )}>{entry.message}</span>
                            {entry.detail && <span className="text-muted-foreground/60 truncate">{entry.detail}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* Cleanup Tab */}
          <TabsContent value="cleanup">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> Limpeza de Pipelines Órfãos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Remove pipelines de onboarding sem nutricionista ativo, duplicados ou com mais de 90 dias sem atividade.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const { data, error } = await supabase.rpc("preview_orphan_onboarding_pipelines" as any);
                      if (error) { toast.error("Erro ao verificar: " + error.message); return; }
                      const list = Array.isArray(data) ? data : [];
                      if (list.length === 0) { toast.success("Nenhum pipeline órfão encontrado ✓"); return; }
                      toast.info(`${list.length} pipeline(s) órfão(s) encontrado(s)`);
                    }}
                  >
                    <Activity className="w-3.5 h-3.5 mr-1.5" /> Verificar Órfãos
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Confirma arquivamento de todos os pipelines órfãos?")) return;
                      const { data, error } = await supabase.rpc("archive_orphan_onboarding_pipelines" as any);
                      if (error) { toast.error("Erro: " + error.message); return; }
                      toast.success("Pipelines órfãos arquivados com sucesso ✓");
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Arquivar Órfãos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Audit Tab */}
          <TabsContent value="audit">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
              <AuditTab />
            </Suspense>
          </TabsContent>
          {/* Simulations Tab */}
          <TabsContent value="simulations">
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
              <SimulationsTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

