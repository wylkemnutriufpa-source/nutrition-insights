import React, { useEffect, useMemo, useState, Fragment } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { localGenerateMealPlan } from "@/lib/localMealPlanGenerator";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Sparkles,
  ExternalLink,
  Search,
  Download,
  Calendar,
  X,
  CheckSquare,
  Zap,
  ShieldCheck,
  Activity,
  User,
  Info,
  ChevronRight,
  Database,
  Terminal,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import jsPDF from "jspdf";
import "jspdf-autotable";

type AuditStatus =
  | "OK_PUBLICADO"
  | "APROVADO_NAO_PUBLICADO"
  | "SO_RASCUNHO"
  | "SEM_PLANO";

interface AuditRow {
  patient_id: string;
  patient_name: string | null;
  published_count: number;
  approved_count: number;
  draft_count: number;
  total_plans: number;
  latest_plan_id: string | null;
  latest_plan_status: string | null;
  latest_validation_status: string | null;
  latest_updated_at: string | null;
  audit_status: AuditStatus;
}

const STATUS_META: Record<
  AuditStatus,
  { label: string; tone: string; icon: JSX.Element; description: string }
> = {
  OK_PUBLICADO: {
    label: "Publicado",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    description: "Paciente já tem plano ativo publicado.",
  },
  APROVADO_NAO_PUBLICADO: {
    label: "Aprovado — falta publicar",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    description: "Plano aprovado pelo motor clínico, basta publicar.",
  },
  SO_RASCUNHO: {
    label: "Rascunho",
    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    icon: <FileText className="w-3.5 h-3.5" />,
    description: "Existe rascunho — abra o editor para validar e publicar.",
  },
  SEM_PLANO: {
    label: "Sem plano",
    tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    icon: <XCircle className="w-3.5 h-3.5" />,
    description: "Paciente ainda não recebeu nenhum plano alimentar.",
  },
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
};

const ActionableSummary = ({ logs }: { logs: any[] }) => {
  const errors = logs.filter((l) => l.status === "error");
  const alerts: { type: string; message: string; icon: any }[] = [];

  if (errors.some((e) => e.errorType === "RLS")) {
    alerts.push({
      type: "warning",
      message:
        "Suspeita de RLS: O plano foi criado mas não aparece na query do paciente.",
      icon: ShieldCheck,
    });
  }
  if (errors.some((e) => e.errorType === "Persistência")) {
    alerts.push({
      type: "critical",
      message:
        "Suspeita de Persistência: Falha ao gravar dados no banco (meal_plans ou items).",
      icon: Database,
    });
  }
  if (errors.some((e) => e.errorType === "Validação")) {
    alerts.push({
      type: "info",
      message:
        "Suspeita de Validação: Dados rejeitados pelo servidor ou regras de negócio.",
      icon: AlertTriangle,
    });
  }

  if (
    alerts.length === 0 &&
    logs.length > 0 &&
    logs.every((l) => l.status === "success")
  ) {
    return (
      <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5" />
        <div className="text-sm font-medium">
          Fluxo saudável! Nenhuma suspeita de erro estrutural detectada.
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Execute o fluxo para gerar diagnóstico.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            a.type === "critical"
              ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/10 dark:text-rose-300 dark:border-rose-900/30"
              : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/10 dark:text-amber-300 dark:border-amber-900/30"
          }`}
        >
          <a.icon className="w-5 h-5 shrink-0" />
          <div className="space-y-1">
            <span className="text-sm font-bold uppercase block">
              {a.type === "critical" ? "Alerta Crítico" : "Recomendação"}
            </span>
            <span className="text-xs font-medium">{a.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const PlanAudit = () => {

  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("plan_audit_active_tab") || "overview");
  
  useEffect(() => {
    localStorage.setItem("plan_audit_active_tab", activeTab);
  }, [activeTab]);
  const [diagnosticPatientId, setDiagnosticPatientId] = useState<string>("");
  const [diagnosticLogs, setDiagnosticLogs] = useState<any[]>([]);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  // Emergency Flow state
  const [emergencyStep, setEmergencyStep] = useState<number>(0);
  const [emergencyLogs, setEmergencyLogs] = useState<{ 
    executionId: string;
    step: string; 
    status: "loading" | "success" | "error"; 
    message: string;
    payload?: any;
    response?: any;
    errorType?: "RLS" | "Validação" | "Persistência" | "Outro";
    timestamp?: string;
  }[]>([]);
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
  const [emergencyProcessing, setEmergencyProcessing] = useState(false);
  const [snapshots, setSnapshots] = useState<Record<string, any>>({});
  const [emergencyPatientId, setEmergencyPatientId] = useState<string | null>(null);
  const [emergencyPlanId, setEmergencyPlanId] = useState<string | null>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [diffViewData, setDiffViewData] = useState<{ before: any, after: any, label: string } | null>(null);
  const [executionIdFilter, setExecutionIdFilter] = useState<string>("");
  const [correlatorId, setCorrelatorId] = useState<string>("");
  const [selectedLogsForDiff, setSelectedLogsForDiff] = useState<number[]>([]);



  // RLS Validation state
  const [rlsPatientId, setRlsPatientId] = useState<string>("");
  const [rlsResult, setRlsResult] = useState<any>(null);
  const [rlsLoading, setRlsLoading] = useState(false);

  // Data Consistency state
  const [consistencyRows, setConsistencyRows] = useState<any[]>([]);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [mismatchRows, setMismatchRows] = useState<any[]>([]);
  const [dayMismatchRows, setDayMismatchRows] = useState<any[]>([]);
  const [mismatchLoading, setMismatchLoading] = useState(false);

  // Persistence keys
  const EMERGENCY_STATE_KEY = "plan_audit_emergency_state";

  // Load emergency state on mount
  useEffect(() => {
    const saved = localStorage.getItem(EMERGENCY_STATE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEmergencyStep(parsed.step || 0);
        setEmergencyLogs(parsed.logs || []);
        setSnapshots(parsed.snapshots || {});
        setEmergencyPatientId(parsed.patientId || null);
        setEmergencyPlanId(parsed.planId || null);
        if (parsed.activeTab) setActiveTab(parsed.activeTab);
        // Load persistent filters
        if (parsed.executionIdFilter) setExecutionIdFilter(parsed.executionIdFilter);
        if (parsed.correlatorId) setCorrelatorId(parsed.correlatorId);
      } catch (e) {
        console.error("Error loading emergency state", e);
      }
    }
  }, []);

  // Save emergency state when it changes
  useEffect(() => {
    localStorage.setItem(EMERGENCY_STATE_KEY, JSON.stringify({
      step: emergencyStep,
      logs: emergencyLogs,
      snapshots,
      patientId: emergencyPatientId,
      planId: emergencyPlanId,
      executionIdFilter,
      correlatorId,
      activeTab
    }));
  }, [emergencyStep, emergencyLogs, snapshots, emergencyPatientId, emergencyPlanId, executionIdFilter, correlatorId, activeTab]);

  const clearEmergencyState = () => {
    localStorage.removeItem(EMERGENCY_STATE_KEY);
    setEmergencyStep(0);
    setEmergencyLogs([]);
    setSnapshots({});
    setEmergencyPatientId(null);
    setEmergencyPlanId(null);
    toast.info("Estado de emergência limpo.");
  };

  const takeSnapshot = async (patientId: string, label: string, executionId?: string) => {
    if (!patientId) return;
    try {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("id, plan_status, is_active")
        .eq("patient_id", patientId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      const snapshotKey = `${label}_${Date.now()}`;
      setSnapshots(prev => ({
        ...prev,
        [snapshotKey]: data
      }));

      if (executionId) {
        setEmergencyLogs(prev => [...prev, { 
          executionId, 
          step: "Snapshot", 
          status: "success", 
          message: `Snapshot capturado: ${label}`, 
          payload: { label, snapshotKey },
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.error("Snapshot error:", err);
    }
  };

  // Filters from URL
  const search = searchParams.get("q") || "";
  const statusFilter = (searchParams.get("status") as AuditStatus | "all") || "all";
  const dateFrom = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const dateTo = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  const setFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc(
        "get_nutritionist_patients_plan_audit"
      );
      if (error) throw error;
      setRows((data ?? []) as AuditRow[]);
    } catch (err: any) {
      console.error("[PlanAudit] load error", err);
      toast.error(err?.message || "Erro ao carregar auditoria de planos.");
    } finally {
      setLoading(false);
    }
  };

  const loadDiagnostics = async (patientId: string) => {
    if (!patientId) return;
    setDiagnosticLoading(true);
    try {
      // Fetch audit logs for this patient
      const { data: logs, error: logsError } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .eq("resource_id", patientId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (logsError) throw logsError;

      // Fetch meal plans for this patient to see "last state"
      const { data: plans, error: plansError } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("patient_id", patientId)
        .order("updated_at", { ascending: false });

      if (plansError) throw plansError;

      setDiagnosticLogs(
        (logs || []).map((l: any) => ({
          ...l,
          type: "log",
        })).concat(
          (plans || []).map((p: any) => ({
            ...p,
            type: "plan_state",
            created_at: p.updated_at,
          }))
        ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch (err: any) {
      console.error("[PlanAudit] loadDiagnostics error", err);
      toast.error("Erro ao carregar diagnósticos.");
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const runEmergencyFlow = async () => {
    if (!user) return;
    setEmergencyProcessing(true);
    
    // Unique Execution ID
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setLastExecutionId(executionId);

    const addLog = (
      step: string, 
      status: "loading" | "success" | "error", 
      message: string, 
      payload?: any, 
      response?: any,
      errorType?: "RLS" | "Validação" | "Persistência" | "Outro"
    ) => {
      const timestamp = new Date().toISOString();
      setEmergencyLogs(prev => [...prev, { executionId, step, status, message, payload, response, errorType, timestamp }]);
    };



    const runFromStep = async (startStep: number) => {
      let currentPatientId = emergencyPatientId;
      let currentPlanId = emergencyPlanId;

      try {
        // 1. Criar Paciente Temporário (ou usar existente no Replay)
        if (startStep <= 1) {
          setEmergencyStep(1);
          
          if (replayMode && emergencyPatientId) {
            addLog("Replay Mode", "success", `Reusando paciente existente: ${emergencyPatientId}`);
            currentPatientId = emergencyPatientId;
            await takeSnapshot(currentPatientId!, "Replay Inicial", executionId);
          } else {
            addLog("Criar Paciente", "loading", "Convocando invite-patient...");
            const tempEmail = `test-${Date.now()}@fitjourney.test`;
            const tempName = `Teste Emergência ${format(new Date(), "HH:mm:ss")}`;
            
            const invitePayload = {
              name: tempName,
              email: tempEmail,
              method: "password",
              password: "password123",
              autoConfirm: true
            };

            const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite-patient", {
              body: invitePayload
            });

            if (inviteError || !inviteData?.patient_id) {
              const errorMsg = inviteError?.message || inviteData?.error || "ID não retornado";
              addLog("Criar Paciente", "error", `Erro no invite: ${errorMsg}`, invitePayload, inviteData, "Persistência");
              throw new Error(errorMsg);
            }
            
            currentPatientId = inviteData.patient_id;
            setEmergencyPatientId(currentPatientId);
            addLog("Criar Paciente", "success", `Paciente ${tempName} criado (UUID: ${currentPatientId}).`, invitePayload, inviteData);
            await takeSnapshot(currentPatientId!, "Inicial", executionId);
          }
        }


        // 2. Criar Plano Simples
        if (startStep <= 2) {
          setEmergencyStep(2);
          addLog("Criar Plano", "loading", "Iniciando rascunho de 1 refeição...");
          const planPayload = {
            patient_id: currentPatientId,
            nutritionist_id: user.id,
            title: "Plano de Emergência",
            plan_status: "draft",
            is_active: false
          };

          const { data: plan, error: planError } = await (supabase.from("meal_plans").insert(planPayload as any).select().single() as any);

          if (planError) {
            addLog("Criar Plano", "error", `Erro ao criar plano: ${planError.message}`, planPayload, planError, "Persistência");
            throw new Error(planError.message);
          }
          
          currentPlanId = plan.id;
          setEmergencyPlanId(currentPlanId);

          const itemPayload = {
            meal_plan_id: currentPlanId,
            title: "Café da Manhã",
            description: "1 Fruta + 1 Iogurte",
            order_index: 0
          };

          const { error: itemError } = await supabase.from("meal_plan_items").insert(itemPayload as any);

          if (itemError) {
            addLog("Criar Plano", "error", `Erro ao criar item: ${itemError.message}`, itemPayload, itemError, "Persistência");
            throw new Error(itemError.message);
          }
          addLog("Criar Plano", "success", "Plano com 1 refeição criado.", { planPayload, itemPayload }, { plan });
        }

        // 3. Salvar (Simulado como Aprovar)
        if (startStep <= 3) {
          setEmergencyStep(3);
          addLog("Salvar/Aprovar", "loading", "Validando e aprovando...");
          await takeSnapshot(currentPatientId!, "Antes de Salvar", executionId);
          
          const { savePlanAsApproved } = await import("@/lib/serverTransitions");
          const saveRes = await savePlanAsApproved(currentPlanId!, user.id);
          
          if (!saveRes.success) {
            addLog("Salvar/Aprovar", "error", saveRes.error || "Erro ao salvar", { planId: currentPlanId }, saveRes, "Validação");
            throw new Error(saveRes.error);
          }
          addLog("Salvar/Aprovar", "success", "Plano aprovado com sucesso.", { planId: currentPlanId }, saveRes);
          await takeSnapshot(currentPatientId!, "Depois de Salvar", executionId);
        }

        // 4. Publicar
        if (startStep <= 4) {
          setEmergencyStep(4);
          addLog("Publicar", "loading", "Publicando para o paciente...");
          await takeSnapshot(currentPatientId!, "Antes de Publicar", executionId);
          
          const { publishMealPlan } = await import("@/lib/serverTransitions");
          const pubRes = await publishMealPlan(currentPlanId!, user.id);
          
          if (!pubRes.success) {
            addLog("Publicar", "error", pubRes.error || "Erro ao publicar", { planId: currentPlanId }, pubRes, "RLS");
            throw new Error(pubRes.error);
          }
          addLog("Publicar", "success", "Plano publicado.", { planId: currentPlanId }, pubRes);
          await takeSnapshot(currentPatientId!, "Depois de Publicar", executionId);
        }

        // 5. Validar Visualização
        if (startStep <= 5) {
          setEmergencyStep(5);
          addLog("Validar", "loading", "Verificando visibilidade do banco...");
          const { data: checkPlan, error: checkError } = await supabase
            .from("meal_plans")
            .select("plan_status, is_active")
            .eq("id", currentPlanId!)
            .single();
          
          if (checkError) {
            addLog("Validar", "error", `Erro na checagem: ${checkError.message}`, { planId: currentPlanId }, checkError, "RLS");
            throw checkError;
          }
          
          if (checkPlan.plan_status === "published_to_patient" && checkPlan.is_active) {
            addLog("Validar", "success", "Fluxo validado: Plano visível e ativo.", { planId: currentPlanId }, checkPlan);
          } else {
            const errorMsg = `Inconsistência detectada: Status=${checkPlan.plan_status}, Ativo=${checkPlan.is_active}`;
            addLog("Validar", "error", errorMsg, { planId: currentPlanId }, checkPlan, "RLS");
            throw new Error(errorMsg);
          }
        }

        setEmergencyStep(6); // Concluído
        toast.success("Fluxo de emergência concluído com sucesso!");
        // Clear state on success if desired, or keep it to show the logs
      } catch (err: any) {
        console.error("Emergency Flow Error:", err);
        // addLog was already called inside the specific step catch
        toast.error("Falha no fluxo de emergência.");
      } finally {
        setEmergencyProcessing(false);
      }
    };

    if (emergencyStep > 0 && emergencyStep < 6 && !confirm("Deseja reiniciar do zero? Clique Cancelar para retomar de onde parou.")) {
      runFromStep(emergencyStep);
    } else {
      setEmergencyLogs([]);
      setSnapshots({});
      setEmergencyPatientId(null);
      setEmergencyPlanId(null);
      runFromStep(1);
    }
  };

  const validateRLS = async (patientId: string) => {
    if (!patientId) return;
    setRlsLoading(true);
    try {
      // O desafio aqui é que não podemos "agir" como o paciente facilmente no client-side sem logout.
      // Mas podemos simular a query que o paciente faria e verificar as restrições via RPC ou apenas checar os campos.
      // O usuário pediu: "confirmando que somente os planos do paciente aparecem e que published_to_patient está correto."
      
      // 1. Simular query total do nutricionista para este paciente
      const { data: allPlans, error: allPlansError } = await supabase
        .from("meal_plans")
        .select("id, title, plan_status, is_active, patient_id")
        .eq("patient_id", patientId);
      
      if (allPlansError) throw allPlansError;

      // 2. Simular query que o PACIENTE faria (filtros de visibilidade)
      const { data: patientVisible, error: patientError } = await supabase
        .from("meal_plans")
        .select("id, title, plan_status, is_active")
        .eq("patient_id", patientId)
        .eq("plan_status", "published_to_patient")
        .eq("is_active", true);

      if (patientError) throw patientError;

      setRlsResult({
        total: (allPlans || []).length,
        visibleCount: (patientVisible || []).length,
        allPlans: allPlans || [],
        visiblePlans: patientVisible || []
      });
      
      toast.success("Verificação RLS concluída.");
    } catch (err: any) {
      console.error("RLS Validation Error:", err);
      toast.error("Erro na validação RLS.");
    } finally {
      setRlsLoading(false);
    }
  };

  const loadConsistencyReport = async () => {
    setConsistencyLoading(true);
    try {
      // Fetch anamnesis and assessments
      const { data: anamnesis } = await (supabase.from("patient_anamnesis" as any).select("user_id, answers") as any);

      const { data: assessments } = await (supabase.from("patient_body_assessments" as any).select("patient_id, weight_kg, height_m, created_at").order("created_at", { ascending: false }) as any);

      const { data: patients } = await (supabase.from("profiles").select("user_id, full_name") as any);

      const report = (patients || []).map((p: any) => {
        const ana = (anamnesis || []).find((a: any) => a.user_id === p.user_id);
        const ass = (assessments || []).find((a: any) => a.patient_id === p.user_id);
        
        const anaWeight = ana?.answers?.weight;
        const anaHeight = ana?.answers?.height;
        const assWeight = ass?.weight_kg;
        const assHeight = ass?.height_m ? ass.height_m * 100 : null; // cm

        let source = "Nenhum";
        let weight = null;
        let height = null;
        let isFallback = false;

        if (assWeight || assHeight) {
          source = "Avaliação Física";
          weight = assWeight;
          height = assHeight;
        } else if (anaWeight || anaHeight) {
          source = "Anamnese";
          weight = anaWeight;
          height = anaHeight;
          isFallback = true;
        }

        const inconsistent = (anaWeight && assWeight && Math.abs(anaWeight - assWeight) > 2);

        return {
          patient_id: p.user_id,
          patient_name: p.full_name,
          source,
          weight,
          height,
          isFallback,
          inconsistent,
          anaWeight,
          assWeight
  };

      });

      setConsistencyRows(report);
    } catch (err: any) {
      console.error("Consistency Report Error:", err);
      toast.error("Erro ao carregar relatório.");
    } finally {
      setConsistencyLoading(false);
    }
  };

  const loadMismatchReport = async () => {
    setMismatchLoading(true);
    try {
      // Fetch plan_type_mismatch and invalid_day_of_week from plan_audit_results
      const { data, error } = await supabase
        .from("plan_audit_results")
        .select("*")
        .in("audit_type", ["plan_type_mismatch", "invalid_day_of_week"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const typeMismatches = (data || []).filter(r => r.audit_type === "plan_type_mismatch");
      const dayMismatches = (data || []).filter(r => r.audit_type === "invalid_day_of_week");
      
      setMismatchRows(typeMismatches);
      setDayMismatchRows(dayMismatches);
    } catch (err: any) {
      console.error("[PlanAudit] mismatch load error", err);
      toast.error("Erro ao carregar auditoria de tipos.");
    } finally {
      setMismatchLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += 1;
        acc[r.audit_status] += 1;
        return acc;
      },
      {
        total: 0,
        OK_PUBLICADO: 0,
        APROVADO_NAO_PUBLICADO: 0,
        SO_RASCUNHO: 0,
        SEM_PLANO: 0,
      } as Record<string, number>
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.audit_status !== statusFilter) return false;
      if (term && !(r.patient_name ?? "").toLowerCase().includes(term)) return false;
      
      if (dateFrom || dateTo) {
        if (!r.latest_updated_at) return false;
        const d = new Date(r.latest_updated_at);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
      
      return true;
    });
  }, [rows, search, statusFilter, dateFrom, dateTo]);

  const handleQuickPublish = async (row: AuditRow) => {
    if (!user || !row.latest_plan_id) return;
    setPublishingId(row.latest_plan_id);
    const toastId = toast.loading(`Publicando plano para ${row.patient_name}...`);
    try {
      const { publishMealPlan } = await import("@/lib/serverTransitions");
      const result = await publishMealPlan(row.latest_plan_id, user.id);
      if (!result.success) {
        throw new Error(result.error || "Erro ao publicar.");
      }
      toast.success(`✅ Plano publicado para ${row.patient_name ?? "paciente"}.`, { id: toastId });
      await load();
    } catch (err: any) {
      console.error("[PlanAudit] publish error", err);
      toast.error(err?.message || "Erro ao publicar o plano.", { id: toastId });
    } finally {
      setPublishingId(null);
    }
  };

  const handleBatchGenerate = async () => {
    const targets = rows.filter(r => r.audit_status === "SEM_PLANO");
    if (targets.length === 0) {
      toast.info("Nenhum paciente sem plano para processar.");
      return;
    }

    if (!confirm(`Deseja gerar e validar planos para ${targets.length} pacientes?`)) return;

    setBatchProcessing(true);
    const results = { success: 0, fail: 0 };
    
    const toastId = toast.loading(`Processando ${targets.length} pacientes...`);

    for (const target of targets) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
          body: {
            patientId: target.patient_id,
            nutritionistId: user?.id,
            isPipeline: false,
          },
        });

        if (error || !data?.success) throw new Error(data?.error || "Erro na geração");
        
        results.success++;
      } catch (err) {
        console.error(`Batch generate error for ${target.patient_name}:`, err);
        results.fail++;
      }
    }

    toast.success(`Lote finalizado: ${results.success} aprovados, ${results.fail} falharam.`, { id: toastId });
    setBatchProcessing(false);
    await load();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const now = format(new Date(), "dd/MM/yyyy HH:mm");
    
    doc.setFontSize(18);
    doc.text("Relatório de Auditoria de Planos", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, 14, 28);

    // Summary table
    (doc as any).autoTable({
      startY: 35,
      head: [["Status", "Quantidade"]],
      body: [
        ["Total de Pacientes", summary.total],
        ["Publicados", summary.OK_PUBLICADO],
        ["Aprovados", summary.APROVADO_NAO_PUBLICADO],
        ["Rascunhos", summary.SO_RASCUNHO],
        ["Sem Plano", summary.SEM_PLANO],
      ],
    });

    // Patients table
    const tableBody = filtered.map(r => [
      r.patient_name || "Sem nome",
      STATUS_META[r.audit_status].label,
      formatDate(r.latest_updated_at),
      `${r.published_count} P / ${r.approved_count} A / ${r.draft_count} R`
    ]);

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Paciente", "Status", "Último Update", "P/A/R"]],
      body: tableBody,
    });

    doc.save(`auditoria-planos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const handleExportJSON = () => {
    const data = {
      executionId: lastExecutionId,
      timestamp: new Date().toISOString(),
      patientId: emergencyPatientId,
      planId: emergencyPlanId,
      logs: emergencyLogs,
      snapshots: snapshots,
      diagnostics: diagnosticLogs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergency-flow-${lastExecutionId || 'report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório JSON exportado!");
  };

  const handleExportCSV = () => {
    const sanitizeCsvValue = (val: any) => {
      if (val === null || val === undefined) return "";
      let str = typeof val === "string" ? val : JSON.stringify(val);
      // Escape quotes and wrap in quotes
      str = str.replace(/"/g, '""');
      // Limit size to prevent breaking Excel/CSV readers
      if (str.length > 30000) {
        str = str.substring(0, 30000) + "... [TRUNCATED]";
      }
      return `"${str}"`;
    };

    const logsToExport = emergencyLogs.filter(l => 
      !executionIdFilter || l.executionId.toLowerCase().includes(executionIdFilter.toLowerCase())
    );

    if (logsToExport.length === 0) {
      toast.error("Nenhum log para exportar com o filtro atual.");
      return;
    }

    // Export Logs CSV
    const logHeaders = ["ExecutionID", "Step", "Status", "Message", "Payload", "Response", "ErrorType", "Timestamp"];
    const logRows = logsToExport.map(l => [
      l.executionId,
      l.step,
      l.status,
      sanitizeCsvValue(l.message),
      sanitizeCsvValue(l.payload),
      sanitizeCsvValue(l.response),
      l.errorType || "",
      l.timestamp || ""
    ]);

    const logsCsvContent = [logHeaders, ...logRows].map(r => r.join(",")).join("\n");
    const logsBlob = new Blob([logsCsvContent], { type: "text/csv;charset=utf-8;" });
    const logsUrl = URL.createObjectURL(logsBlob);
    const logsLink = document.createElement("a");
    logsLink.setAttribute("href", logsUrl);
    logsLink.setAttribute("download", `emergency-logs-${Date.now()}.csv`);
    logsLink.click();

    // Export Snapshots CSV (Changed Fields)
    const snapshotKeys = Object.keys(snapshots);
    if (snapshotKeys.length > 0) {
      const snapshotHeaders = ["Moment", "PlanID", "Status", "IsActive"];
      const snapshotRows: any[] = [];
      
      snapshotKeys.forEach(label => {
        const data = snapshots[label];
        if (Array.isArray(data)) {
          data.forEach(p => {
            snapshotRows.push([label.split('_')[0], p.id, p.plan_status, p.is_active]);
          });
        }
      });

      const snapshotsCsvContent = [snapshotHeaders, ...snapshotRows].map(r => r.join(",")).join("\n");
      const snapshotsBlob = new Blob([snapshotsCsvContent], { type: "text/csv;charset=utf-8;" });
      const snapshotsUrl = URL.createObjectURL(snapshotsBlob);
      const snapshotsLink = document.createElement("a");
      snapshotsLink.setAttribute("href", snapshotsUrl);
      snapshotsLink.setAttribute("download", `emergency-snapshots-${Date.now()}.csv`);
      snapshotsLink.click();
    }

    toast.success("CSV(s) exportado(s) com sucesso!");
  };

  const filteredEmergencyLogs = useMemo(() => {
    return emergencyLogs.filter(l => 
      !executionIdFilter || l.executionId.toLowerCase().includes(executionIdFilter.toLowerCase())
    );
  }, [emergencyLogs, executionIdFilter]);

  const stepMetrics = useMemo(() => {
    const steps = ["Salvar/Aprovar", "Publicar", "Validar", "Snapshot"];
    return steps.map(stepName => {
      const stepLogs = filteredEmergencyLogs.filter(l => {
        if (stepName === "Salvar/Aprovar") {
          return l.step === "Criar Paciente" || l.step === "Criar Plano" || l.step === "Criar Item" || l.errorType === "Persistência" || l.step === "Salvar/Aprovar";
        }
        return l.step.includes(stepName);
      });
      
      const total = stepLogs.length;
      const failures = stepLogs.filter(l => l.status === "error").length;
      const successes = total - failures;
      
      let successRate = 0;
      let failureRate = 0;
      
      if (total > 0) {
        successRate = (successes / total) * 100;
        failureRate = 100 - successRate;
      }
      
      return { name: stepName, total, failures, successes, failureRate, successRate };
    });
  }, [filteredEmergencyLogs]);

  const incompleteDataStatus = useMemo(() => {
    if (!executionIdFilter && filteredEmergencyLogs.length === 0) return { isIncomplete: false, missing: [] as string[] };
    
    const logs = filteredEmergencyLogs;
    if (logs.length === 0) return { isIncomplete: false, missing: [] };

    // Identifica o tipo de fluxo: Replay ou Completo
    const isReplay = logs.some(l => l.step === "Replay Mode");
    
    // Etapas esperadas por tipo de fluxo
    const expectedSteps = isReplay 
      ? ["Snapshot", "Salvar/Aprovar", "Publicar", "Validar"] 
      : ["Criar Paciente", "Criar Plano", "Snapshot", "Salvar/Aprovar", "Publicar", "Validar"];

    const missing = expectedSteps.filter(step => {
      // Mapeamento flexível para aceitar variações no nome da etapa se necessário
      const hasStep = logs.some(l => {
        if (step === "Snapshot") return l.step === "Snapshot";
        if (step === "Salvar/Aprovar") return l.step === "Salvar/Aprovar";
        if (step === "Publicar") return l.step === "Publicar";
        if (step === "Validar") return l.step === "Validar";
        if (step === "Criar Paciente") return l.step === "Criar Paciente";
        if (step === "Criar Plano") return l.step === "Criar Plano";
        return false;
      });
      return !hasStep;
    });

    const logCount = logs.length;
    // Adiciona "logs insuficientes" se o total for muito baixo para o esperado
    if (logCount > 0 && logCount < (isReplay ? 4 : 6) && missing.length === 0) {
      missing.push("logs insuficientes para o fluxo");
    }
    
    return { 
      isIncomplete: missing.length > 0, 
      missing 
    };
  }, [filteredEmergencyLogs, executionIdFilter]);

  const exportSummaryPDF = () => {
    const doc = new jsPDF();
    const now = format(new Date(), "dd/MM/yyyy HH:mm");
    
    doc.setFontSize(18);
    doc.text("Resumo por Etapa de Execução", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, 14, 28);
    doc.text(`Filtro Execution ID: ${executionIdFilter || "Nenhum"}`, 14, 34);

    const tableHeaders = [["Execution ID", "Etapa", "Status", "Timestamp", "Link do Log/Snapshot"]];
    const tableData = filteredEmergencyLogs.map(l => [
      l.executionId,
      l.step,
      l.status,
      l.timestamp ? format(new Date(l.timestamp), "HH:mm:ss") : "—",
      l.step === "Snapshot" ? "Abrir Snapshot" : (correlatorId ? "GCP Cloud Logging" : "Ver no App")
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7 },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          const rowData = filteredEmergencyLogs[data.row.index];
          const val = data.cell.raw;
          let url = "";
          
          if (val === "GCP Cloud Logging" && correlatorId) {
            url = `https://console.cloud.google.com/logs/query;query=jsonPayload.correlator%3D%22${correlatorId}%22`;
          } else {
            url = `${window.location.origin}/plan-audit?tab=emergency&execId=${rowData.executionId}`;
          }
          
          if (url) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
            doc.setTextColor(0, 0, 255);
          }
        }
      }
    });

    doc.save(`resumo-etapas-${executionIdFilter || "geral"}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF do resumo gerado com sucesso!");
  };

  const exportSummaryCSV = () => {
    const headers = ["ExecutionID", "Etapa", "Status", "Timestamp", "Log Link"];
    const rows = filteredEmergencyLogs.map(l => {
      let logUrl = "";
      if (correlatorId) {
        logUrl = `https://console.cloud.google.com/logs/query;query=jsonPayload.correlator%3D%22${correlatorId}%22`;
      } else if (l.step === "Snapshot") {
        logUrl = `${window.location.origin}/plan-audit?tab=emergency&execId=${l.executionId}`;
      }
      
      return [
        l.executionId,
        l.step,
        l.status,
        l.timestamp ? format(new Date(l.timestamp), "HH:mm:ss") : "—",
        logUrl || "N/A"
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.body.appendChild(document.createElement("a"));
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `resumo_auditoria_${executionIdFilter || 'geral'}.csv`);
    link.style.visibility = 'hidden';
    link.click();
    document.body.removeChild(link);
    toast.success("Resumo exportado com sucesso!");
  };



  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Helmet>
        <title>Auditoria de Planos — FitJourney</title>
        <meta
          name="description"
          content="Veja em uma tela só quais pacientes têm plano publicado, aprovado, em rascunho ou sem plano."
        />
        <link rel="canonical" href="/plan-audit" />
      </Helmet>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Auditoria de Planos
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Visão única do estado de cada paciente. Identifique quem está sem plano,
            quem precisa publicar e abra o editor com 1 clique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            PDF Relatório
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleBatchGenerate}
            disabled={batchProcessing || loading}
            className="gap-2"
          >
            {batchProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Gerar em Lote
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-7 h-auto p-1 gap-1">
          <TabsTrigger value="overview" className="text-xs py-2">
            <Activity className="w-3.5 h-3.5 mr-1.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="text-xs py-2">
            <Terminal className="w-3.5 h-3.5 mr-1.5" /> Diagnóstico
          </TabsTrigger>
          <TabsTrigger value="emergency" className="text-xs py-2">
            <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Emergência
          </TabsTrigger>
          <TabsTrigger value="mismatches" className="text-xs py-2" onClick={loadMismatchReport}>
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Tipo de Plano
          </TabsTrigger>
          <TabsTrigger value="failure-report" className="text-xs py-2">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Relatório Erros
          </TabsTrigger>
          <TabsTrigger value="rls" className="text-xs py-2">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Validador RLS
          </TabsTrigger>
          <TabsTrigger value="consistency" className="text-xs py-2" onClick={loadConsistencyReport}>
            <Database className="w-3.5 h-3.5 mr-1.5" /> Consistência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 m-0">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pacientes</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </Card>
        {(
          [
            "OK_PUBLICADO",
            "APROVADO_NAO_PUBLICADO",
            "SO_RASCUNHO",
            "SEM_PLANO",
          ] as AuditStatus[]
        ).map((s) => {
          const meta = STATUS_META[s];
          const active = statusFilter === s;
          return (
            <Card
              key={s}
              className={`p-4 cursor-pointer transition-colors ${
                active ? "ring-2 ring-primary" : "hover:bg-muted/40"
              }`}
              onClick={() => setFilter("status", active ? undefined : s)}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {meta.icon}
                <span>{meta.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{summary[s] ?? 0}</p>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setFilter("q", e.target.value)}
              placeholder="Nome ou prontuário…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  {dateFrom || dateTo ? (
                    <>
                      {dateFrom ? format(dateFrom, "dd/MM") : "..."} - {dateTo ? format(dateTo, "dd/MM") : "..."}
                    </>
                  ) : (
                    "Filtrar data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b flex items-center justify-between">
                  <span className="text-xs font-medium">Faixa de atualização</span>
                  {(dateFrom || dateTo) && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => {
                        setFilter("from", undefined);
                        setFilter("to", undefined);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row">
                  <div className="p-1">
                    <p className="text-[10px] text-muted-foreground px-2 py-1">Início</p>
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={(d) => setFilter("from", d?.toISOString())}
                      locale={ptBR}
                    />
                  </div>
                  <div className="p-1 border-t sm:border-t-0 sm:border-l">
                    <p className="text-[10px] text-muted-foreground px-2 py-1">Fim</p>
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={(d) => setFilter("to", d?.toISOString())}
                      locale={ptBR}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {(statusFilter !== "all" || search || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchParams(new URLSearchParams(), { replace: true });
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refazer sincronização
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Carregando auditoria…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhum paciente encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((row) => {
              const meta = STATUS_META[row.audit_status];
              return (
                <div
                  key={row.patient_id}
                  className="flex flex-col md:flex-row md:items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/patients/${row.patient_id}`}
                        className="font-medium truncate hover:underline"
                      >
                        {row.patient_name ?? "Sem nome"}
                      </Link>
                      <Badge
                        variant="outline"
                        className={`text-[10px] gap-1 ${meta.tone}`}
                      >
                        {meta.icon}
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {meta.description} · Atualizado {formatDate(row.latest_updated_at)}
                      {row.total_plans > 0 && (
                        <>
                          {" "}
                          · {row.published_count} publicado(s) ·{" "}
                          {row.approved_count} aprovado(s) ·{" "}
                          {row.draft_count} rascunho(s)
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {row.latest_plan_id && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        <Link to={`/meal-plans/${row.latest_plan_id}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir editor
                        </Link>
                      </Button>
                    )}
                    {row.audit_status === "APROVADO_NAO_PUBLICADO" && row.latest_plan_id && (
                      <Button
                        size="sm"
                        onClick={() => handleQuickPublish(row)}
                        disabled={publishingId === row.latest_plan_id}
                        className="gap-1.5"
                      >
                        {publishingId === row.latest_plan_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Publicar
                      </Button>
                    )}
                    {row.audit_status === "SEM_PLANO" && (
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                      >
                        <Link to={`/patients/${row.patient_id}`}>
                          <Sparkles className="w-3.5 h-3.5" />
                          Gerar plano
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="m-0 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex gap-2">
              <Select value={diagnosticPatientId} onValueChange={setDiagnosticPatientId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um paciente para diagnosticar" />
                </SelectTrigger>
                <SelectContent>
                  {rows.map(r => (
                    <SelectItem key={r.patient_id} value={r.patient_id}>
                      {r.patient_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => loadDiagnostics(diagnosticPatientId)} disabled={!diagnosticPatientId || diagnosticLoading}>
                {diagnosticLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Diagnosticar
              </Button>
            </div>

            {diagnosticLogs.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Timeline de Eventos e Estados
                  </h3>
                  {selectedLogsForDiff.length === 2 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-[10px] gap-1.5 border-primary/40 text-primary bg-primary/5"
                      onClick={() => {
                        const l1 = diagnosticLogs[selectedLogsForDiff[0]];
                        const l2 = diagnosticLogs[selectedLogsForDiff[1]];
                        // Ensure l1 is the "before" (older) and l2 is "after" (newer)
                        const d1 = new Date(l1.created_at || l1.updated_at).getTime();
                        const d2 = new Date(l2.created_at || l2.updated_at).getTime();
                        const [before, after] = d1 < d2 ? [l1, l2] : [l2, l1];
                        setDiffViewData({ 
                          before: before.metadata || before, 
                          after: after.metadata || after, 
                          label: `Comparação: ${before.action || before.plan_status} vs ${after.action || after.plan_status}` 
                        });
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Comparar Selecionados
                    </Button>
                  )}
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Evento / Status</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {diagnosticLogs.map((log, i) => (
                        <TableRow key={i} className={selectedLogsForDiff.includes(i) ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedLogsForDiff.includes(i)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedLogsForDiff(prev => [...prev, i].slice(-2));
                                } else {
                                  setSelectedLogsForDiff(prev => prev.filter(idx => idx !== i));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(log.created_at || log.updated_at)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {log.type === 'log' ? 'AUDIT LOG' : 'DB STATE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-xs">
                            {log.action || log.plan_status || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {log.metadata ? JSON.stringify(log.metadata) : (log.title || 'Sem detalhes')}
                          </TableCell>
                        </TableRow>
                      ))}

                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : diagnosticPatientId && !diagnosticLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum log ou estado encontrado para este paciente.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="m-0 space-y-4">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Fluxo de Emergência (Auto-Teste)
                </h2>
                <p className="text-sm text-muted-foreground">
                  Cria um cenário completo para validar se o sistema está salvando, publicando e exibindo corretamente.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 border-r pr-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">ID Execução</span>
                    <Input 
                      placeholder="Filtrar ID..." 
                      value={executionIdFilter}
                      onChange={(e) => setExecutionIdFilter(e.target.value)}
                      className="h-8 text-xs w-32"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 border-r pr-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Request ID (Backend)</span>
                    <div className="flex gap-1">
                      <Input 
                        placeholder="Correlator ID..." 
                        value={correlatorId}
                        onChange={(e) => setCorrelatorId(e.target.value)}
                        className="h-8 text-xs w-40"
                      />
                      {correlatorId && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          asChild
                        >
                          <a 
                            href={`https://console.cloud.google.com/logs/query;query=jsonPayload.correlator%3D%22${correlatorId}%22`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-r pr-4">
                  <span className="text-xs font-medium">Replay:</span>
                  <Button 
                    variant={replayMode ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setReplayMode(!replayMode)}
                    className="h-8 text-[10px]"
                  >
                    {replayMode ? "ON" : "OFF"}
                  </Button>
                </div>
                
                {emergencyLogs.length > 0 && (
                  <div className="flex gap-2">
                    <Button onClick={handleExportJSON} variant="outline" size="sm" className="h-8 gap-2">
                      <Download className="w-3.5 h-3.5" />
                      JSON
                    </Button>
                    <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-8 gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      Exportar CSV
                    </Button>
                  </div>
                )}

                {emergencyStep > 0 && (
                  <Button onClick={clearEmergencyState} variant="ghost" size="sm" className="h-8">
                    Limpar
                  </Button>
                )}

                <Button onClick={runEmergencyFlow} disabled={emergencyProcessing} variant="secondary" className="h-8">
                  {emergencyProcessing ? (
                    <Loader2 className="animate-spin w-3.5 h-3.5 mr-2" />
                  ) : emergencyStep > 0 && emergencyStep < 6 ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                  )}
                  {emergencyStep > 0 && emergencyStep < 6 ? "Retomar" : "Iniciar Fluxo"}
                </Button>
              </div>

            </div>

            {emergencyLogs.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div key={step} className={`h-1.5 rounded-full ${emergencyStep >= step ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-muted'}`} />
                  ))}
                </div>
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  {filteredEmergencyLogs.map((log, i) => (
                    <div key={i} className="space-y-2 border-b last:border-0 pb-2 last:pb-0">
                      <div className="flex items-start gap-3 text-sm">
                        {log.status === 'loading' ? (
                          <Loader2 className="w-4 h-4 animate-spin mt-0.5 text-amber-500" />
                        ) : log.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 mt-0.5 text-rose-500" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs">{log.step}:</span> 
                            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded">{log.executionId.slice(-8)}</span>
                            {log.timestamp && (
                              <span className="text-[9px] text-muted-foreground">{format(new Date(log.timestamp), "HH:mm:ss.SSS")}</span>
                            )}
                            {log.errorType && (
                              <Badge variant="outline" className="text-[9px] uppercase border-rose-500 text-rose-600">
                                Erro: {log.errorType}
                              </Badge>
                            )}
                            {log.step === "Snapshot" && log.payload?.snapshotKey && (
                              <Badge 
                                variant="secondary" 
                                className="text-[9px] cursor-pointer hover:bg-secondary/80"
                                onClick={() => {
                                  const data = snapshots[log.payload.snapshotKey];
                                  if (data) {
                                    alert(JSON.stringify(data, null, 2));
                                  }
                                }}
                              >
                                Ver Snapshot
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm font-medium">{log.message}</div>
                        </div>
                      </div>
                      
                      {(log.payload || log.response) && (
                        <div className="ml-7 bg-background/50 rounded p-2 text-[10px] font-mono overflow-auto max-h-40">
                          {log.payload && (
                            <div className="mb-2">
                              <span className="text-muted-foreground uppercase">[Payload]:</span>
                              <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                            </div>
                          )}
                          {log.response && (
                            <div>
                              <span className="text-muted-foreground uppercase">[Response/Error]:</span>
                              <pre>{JSON.stringify(log.response, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="failure-report" className="m-0 space-y-4">
          <Card className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Relatório de Falhas e Snapshots
              </h2>
              <p className="text-sm text-muted-foreground">
                Agrupamento de erros por tipo e comparação de estados do banco de dados.
              </p>
            </div>

            <div className="space-y-4">
               <h3 className="text-sm font-semibold flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-amber-500" /> Diagnóstico Sugerido
               </h3>
               <ActionableSummary logs={filteredEmergencyLogs} />
            </div>

             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-blue-500" /> Resumo por Etapa
                 </h3>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1"
                      onClick={exportSummaryCSV}
                    >
                      <Download className="w-3 h-3" /> CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1"
                      onClick={exportSummaryPDF}
                    >
                      <FileText className="w-3 h-3" /> PDF
                    </Button>
                  </div>
                </div>

                {incompleteDataStatus.isIncomplete && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-[10px] leading-relaxed">
                      <span className="font-bold block uppercase mb-0.5">Dados Incompletos</span>
                      Este ID de execução não possui todos os logs ou snapshots esperados:
                      <ul className="list-disc list-inside mt-1 font-medium">
                        {incompleteDataStatus.missing.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                      As taxas de sucesso e falha podem estar distorcidas.
                    </div>
                  </div>
                )}

               <div className="border rounded-md overflow-hidden">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Etapa</TableHead>
                       <TableHead className="text-center">Total</TableHead>
                       <TableHead className="text-center">Sucessos</TableHead>
                       <TableHead className="text-center text-rose-500">Falhas</TableHead>
                       <TableHead className="text-right">Taxa de Sucesso</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {stepMetrics.map((m) => (
                       <TableRow key={m.name}>
                         <TableCell className="font-medium text-xs">{m.name}</TableCell>
                         <TableCell className="text-center text-xs">{m.total}</TableCell>
                         <TableCell className="text-center text-xs text-emerald-600 font-medium">{m.successes}</TableCell>
                         <TableCell className="text-center text-xs text-rose-500 font-semibold">{m.failures}</TableCell>
                         <TableCell className="text-right text-xs">
                           <Badge variant={m.successRate < 100 ? "destructive" : "secondary"} className="text-[10px]">
                             {m.successRate.toFixed(1)}%
                           </Badge>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {["RLS", "Validação", "Persistência"].map(type => {
                const count = emergencyLogs.filter(l => l.errorType === type).length;
                return (
                  <Card key={type} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">{type}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <AlertTriangle className={`w-8 h-8 ${count > 0 ? 'text-rose-500' : 'text-muted/20'}`} />
                  </Card>
                );
              })}
            </div>

            {Object.keys(snapshots).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Database className="w-4 h-4" /> Comparação de Snapshots (plan_status, is_active)
                  </h3>
                  {Object.keys(snapshots).length >= 2 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-2"

                      onClick={() => {
                        const keys = Object.keys(snapshots).sort();
                        const before = snapshots[keys[0]];
                        const after = snapshots[keys[keys.length - 1]];
                        setDiffViewData({ before, after, label: "Diff: Inicial vs Final" });
                      }}
                    >
                      Comparar Primeiro vs Último
                    </Button>
                  )}
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Momento</TableHead>
                        <TableHead>ID Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(snapshots).sort((a, b) => b[0].localeCompare(a[0])).map(([label, data]: [string, any], index, arr) => (
                        <Fragment key={label}>
                          <TableRow className="bg-muted/10">
                            <TableCell className="font-medium text-xs whitespace-nowrap" colSpan={4}>
                              {label.split('_')[0]}
                            </TableCell>
                            <TableCell>
                              {index < arr.length - 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => setDiffViewData({ 
                                    before: arr[index+1][1], 
                                    after: data, 
                                    label: `Diff: ${arr[index+1][0].split('_')[0]} → ${label.split('_')[0]}` 
                                  })}
                                >
                                  <Activity className="w-3 h-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          {data.map((p: any) => (
                            <TableRow key={`${label}_${p.id}`}>
                              <TableCell className="text-[10px] pl-6 text-muted-foreground">↳ {label.split('_')[0]}</TableCell>
                              <TableCell className="text-[10px] font-mono">{p.id.slice(0, 8)}...</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{p.plan_status}</Badge>
                              </TableCell>
                              <TableCell>
                                {p.is_active ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-muted" />}
                              </TableCell>
                              <TableCell>—</TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>

              </div>
            )}

            {!emergencyLogs.some(l => l.status === 'error') && Object.keys(snapshots).length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                Nenhuma falha ou snapshot registrado recentemente.
                <br />
                Execute o Fluxo de Emergência para gerar dados.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="rls" className="m-0 space-y-4">
          <Card className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Simulador de Visão do Paciente (RLS)
              </h2>
              <p className="text-sm text-muted-foreground">
                Simula as queries que o aplicativo do paciente faz para validar se as permissões (RLS) e filtros de visibilidade estão ativos.
              </p>
            </div>

            <div className="flex gap-2">
              <Select value={rlsPatientId} onValueChange={setRlsPatientId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o paciente alvo" />
                </SelectTrigger>
                <SelectContent>
                  {rows.map(r => (
                    <SelectItem key={r.patient_id} value={r.patient_id}>
                      {r.patient_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => validateRLS(rlsPatientId)} disabled={!rlsPatientId || rlsLoading} variant="outline">
                {rlsLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
                Validar RLS
              </Button>
            </div>

            {rlsResult && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" /> Visão Nutricionista (Todos)
                    </h3>
                    <div className="space-y-2">
                      {rlsResult.allPlans.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-[10px] p-2 bg-background border rounded">
                          <span className="truncate max-w-[120px]">{p.title}</span>
                          <Badge variant="outline" className="text-[8px]">{p.plan_status}</Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">Total: {rlsResult.total} planos</p>
                  </div>

                  <div className="space-y-3 border rounded-lg p-4 bg-emerald-500/5">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                      <ShieldCheck className="w-4 h-4" /> Simulação: Visão Paciente
                    </h3>
                    <div className="space-y-2">
                      {rlsResult.visiblePlans.length > 0 ? (
                        rlsResult.visiblePlans.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between text-[10px] p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                            <span className="truncate max-w-[120px]">{p.title}</span>
                            <Badge className="text-[8px] bg-emerald-500">VISÍVEL</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-muted-foreground italic">
                          Nenhum plano visível para o paciente.
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-700 text-center font-medium">
                      Filtrado por: published_to_patient + is_active
                    </p>
                  </div>
                </div>

                <div className="text-[10px] bg-emerald-500/10 text-emerald-700 p-2 rounded flex gap-2">
                  <Info className="w-3 h-3 shrink-0" />
                  <span>
                    <strong>Validação concluída:</strong> O simulador confirma que {rlsResult.visibleCount} de {rlsResult.total} planos são acessíveis pelo paciente. 
                    As regras de RLS garantem que um paciente nunca veja planos de outros usuários, mesmo que tente acessar via ID.
                  </span>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="mismatches" className="m-0 space-y-4">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" /> Auditoria de Mismatch de Tipo e Dia
                </h2>
                <p className="text-sm text-muted-foreground">
                  Registra itens com plan_type misturado ou day_of_week diferente de 0 (Single-Day).
                </p>
              </div>
              <Button onClick={loadMismatchReport} disabled={mismatchLoading} variant="outline" size="sm">
                {mismatchLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Mismatch de plan_type (NORMAL vs MARMITA)
                </h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Plano/Paciente</TableHead>
                        <TableHead>Esperado</TableHead>
                        <TableHead>Encontrado</TableHead>
                        <TableHead>Link/Snapshot</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mismatchRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-[10px]">{formatDate(row.created_at)}</TableCell>
                          <TableCell className="text-xs">
                             <Link to={`/meal-plans/${row.plan_id}`} className="hover:underline font-medium">
                               {row.plan_id?.slice(0, 8)}
                             </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {(row.details as any)?.expected}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] text-rose-600 font-medium">
                            {(row.details as any)?.found?.join(", ")}
                          </TableCell>
                          <TableCell>
                            {row.audit_run_id && (
                              <Link 
                                to={`/plan-audit?tab=emergency&execId=${row.audit_run_id}`}
                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> Snapshot
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {mismatchRows.length === 0 && !mismatchLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                            Nenhum mismatch de tipo detectado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Itens com day_of_week ≠ 0
                </h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Dias Encontrados</TableHead>
                        <TableHead>Qtd Itens</TableHead>
                        <TableHead>Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayMismatchRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-[10px]">{formatDate(row.created_at)}</TableCell>
                          <TableCell className="text-xs">
                             <Link to={`/meal-plans/${row.plan_id}`} className="hover:underline font-medium">
                               {row.plan_id?.slice(0, 8)}
                             </Link>
                          </TableCell>
                          <TableCell className="text-[10px]">
                            {(row.details as any)?.wrong_days?.join(", ")}
                          </TableCell>
                          <TableCell className="text-[10px]">
                            {(row.details as any)?.count}
                          </TableCell>
                          <TableCell>
                             <Link 
                                to={`/plan-audit?tab=emergency&execId=${row.audit_run_id}`}
                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> Snapshot
                              </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dayMismatchRows.length === 0 && !mismatchLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                            Nenhuma inconsistência de dia detectada.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="consistency" className="m-0 space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Database className="w-5 h-5" /> Relatório de Validação de Dados
                </h2>
                <p className="text-sm text-muted-foreground">
                  Identifica de onde o sistema está lendo Peso/Altura e aponta inconsistências.
                </p>
              </div>
              <Button onClick={loadConsistencyReport} disabled={consistencyLoading} variant="outline" size="sm">
                {consistencyLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Fonte Atual</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Altura (cm)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consistencyRows.map((row) => (
                    <TableRow key={row.patient_id}>
                      <TableCell className="font-medium">{row.patient_name}</TableCell>
                      <TableCell>
                        <Badge variant={row.isFallback ? "secondary" : "outline"} className="text-[10px]">
                          {row.source}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.weight || '—'}</TableCell>
                      <TableCell>{row.height || '—'}</TableCell>
                      <TableCell>
                        {row.inconsistent ? (
                          <Badge variant="destructive" className="text-[9px]">Inconsistente</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-600">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {consistencyRows.length === 0 && !consistencyLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum dado carregado. Clique em atualizar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!diffViewData} onOpenChange={(open) => !open && setDiffViewData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              {diffViewData?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Antes</h4>
                <pre className="text-[9px] bg-muted/30 p-3 rounded-lg border overflow-auto max-h-[50vh]">
                  {JSON.stringify(diffViewData?.before, null, 2)}
                </pre>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-primary">Depois</h4>
                <pre className="text-[9px] bg-primary/5 p-3 rounded-lg border border-primary/20 overflow-auto max-h-[50vh]">
                  {JSON.stringify(diffViewData?.after, null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg">
               <h4 className="text-[10px] font-bold uppercase mb-2">Campos Alterados</h4>
               <div className="space-y-1">
                 {diffViewData && (() => {
                    const beforeStr = JSON.stringify(diffViewData.before);
                    const afterStr = JSON.stringify(diffViewData.after);
                    if (beforeStr === afterStr) return <span className="text-xs text-muted-foreground italic">Nenhuma mudança detectada nos campos principais.</span>;
                    
                    // Simple field-level diff
                    const b = Array.isArray(diffViewData.before) ? diffViewData.before[0] : diffViewData.before;
                    const a = Array.isArray(diffViewData.after) ? diffViewData.after[0] : diffViewData.after;
                    
                    if (!b || !a) return null;

                    return Object.keys({ ...b, ...a }).map(key => {
                      if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs border-b border-muted py-1 last:border-0">
                            <span className="font-mono font-semibold w-24 shrink-0">{key}:</span>
                            <span className="text-rose-600 line-through truncate">{String(b[key])}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <span className="text-emerald-600 font-bold truncate">{String(a[key])}</span>
                          </div>
                        );
                      }
                      return null;
                    });
                 })()}
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanAudit;

