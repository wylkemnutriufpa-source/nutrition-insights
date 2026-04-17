/**
 * System Diagnostics — Audit Tab v2.0.0
 *
 * Mostra resultados unificados das auditorias automáticas:
 *  - Planos (plan_audit_results)
 *  - Pacientes (patient_audit_results) — auto-cura preventiva
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, RefreshCw, AlertTriangle, XCircle, CheckCircle2, Play, Wand2,
} from "lucide-react";
import { toast } from "sonner";

const severityStyle: Record<string, { cls: string; icon: React.ReactNode }> = {
  critical: { cls: "bg-red-500/10 text-red-500", icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
  high: { cls: "bg-orange-500/10 text-orange-500", icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> },
  medium: { cls: "bg-amber-500/10 text-amber-500", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> },
  warning: { cls: "bg-amber-500/10 text-amber-500", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> },
  low: { cls: "bg-blue-500/10 text-blue-400", icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> },
  info: { cls: "bg-blue-500/10 text-blue-400", icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> },
};

const planAuditLabels: Record<string, string> = {
  active_not_published: "Ativo mas não publicado",
  no_items: "Sem itens",
  missing_nutritionist_binding: "Sem vínculo nutri",
  orphan_draft: "Rascunho órfão",
  macro_inconsistency: "Inconsistência de macros",
};

const patientAuditLabels: Record<string, string> = {
  inactive_link_with_active_journey: "Vínculo inativo (jornada ativa)",
  missing_onboarding_pipeline: "Sem pipeline de onboarding",
  missing_clinical_consent: "Sem consentimento clínico",
  pipeline_not_released: "Pipeline não liberado",
  active_plan_without_items: "Plano ativo sem itens",
  audit_exception: "Erro de auditoria",
};

const actionStyle: Record<string, string> = {
  auto_fixed: "bg-emerald-500/10 text-emerald-400",
  needs_attention: "bg-orange-500/10 text-orange-500",
  failed: "bg-red-500/10 text-red-500",
  ignored: "bg-muted/40 text-muted-foreground",
};

export default function AuditTab() {
  const [running, setRunning] = useState(false);

  // Plan audits (existing)
  const { data: planResults = [], refetch: refetchPlans } = useQuery({
    queryKey: ["plan-audit-results"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("plan_audit_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  // Patient audits (NEW)
  const { data: patientResults = [], refetch: refetchPatients } = useQuery({
    queryKey: ["patient-audit-results"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("patient_audit_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit-active-plans");
      if (error) throw error;
      const fixed = data?.patient_audit?.auto_fixed ?? 0;
      const flagged = data?.patient_audit?.flagged_for_attention ?? 0;
      toast.success(
        `Auditoria concluída — ${fixed} auto-corrigidos, ${flagged} requerem atenção`
      );
      refetchPlans();
      refetchPatients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao executar auditoria: " + msg);
    } finally {
      setRunning(false);
    }
  };

  // Stats — patient audits
  const pCritical = patientResults.filter((r: any) => r.severity === "critical").length;
  const pFixed = patientResults.filter((r: any) => r.action_taken === "auto_fixed").length;
  const pNeedsAttention = patientResults.filter((r: any) => r.action_taken === "needs_attention").length;
  const lastRun = patientResults[0]?.created_at
    ? new Date(patientResults[0].created_at).toLocaleString("pt-BR")
    : "Nunca";

  return (
    <div className="space-y-4">
      {/* Stats globais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{pFixed}</p>
            <p className="text-[10px] text-muted-foreground">Auto-corrigidos</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{pNeedsAttention}</p>
            <p className="text-[10px] text-muted-foreground">Requerem ação</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{pCritical}</p>
            <p className="text-[10px] text-muted-foreground">Críticos</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-foreground">{lastRun}</p>
            <p className="text-[10px] text-muted-foreground">Última execução</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Auditoria & Auto-Cura
            </CardTitle>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="text-xs h-7 gap-1.5"
                onClick={runAudit}
                disabled={running}
              >
                {running ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                {running ? "Executando..." : "Auditar agora"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { refetchPlans(); refetchPatients(); }}
                className="h-7 px-2"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="patients" className="w-full">
            <TabsList className="mx-3 mt-1 grid w-[calc(100%-1.5rem)] grid-cols-2">
              <TabsTrigger value="patients" className="text-xs">
                Pacientes ({patientResults.length})
              </TabsTrigger>
              <TabsTrigger value="plans" className="text-xs">
                Planos ({planResults.length})
              </TabsTrigger>
            </TabsList>

            {/* PATIENTS */}
            <TabsContent value="patients" className="m-0">
              <ScrollArea className="h-[420px]">
                {patientResults.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nenhum achado. Clique em "Auditar agora".
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {patientResults.map((r: any) => {
                      const st = severityStyle[r.severity] || severityStyle.info;
                      return (
                        <div key={r.id} className="p-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {st.icon}
                              <span className="text-xs font-medium truncate">
                                {patientAuditLabels[r.finding_type] || r.finding_type}
                              </span>
                              <Badge className={`text-[10px] ${st.cls}`} variant="outline">
                                {r.severity}
                              </Badge>
                              <Badge className={`text-[10px] ${actionStyle[r.action_taken]}`} variant="outline">
                                {r.action_taken}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {r.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            {r.patient_id && (
                              <span className="font-mono">👤 {r.patient_id.slice(0, 8)}</span>
                            )}
                            {r.nutritionist_id && (
                              <span className="font-mono">🩺 {r.nutritionist_id.slice(0, 8)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* PLANS */}
            <TabsContent value="plans" className="m-0">
              <ScrollArea className="h-[420px]">
                {planResults.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nenhum achado de plano.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {planResults.map((r: any) => {
                      const st = severityStyle[r.severity] || severityStyle.info;
                      return (
                        <div key={r.id} className="p-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {st.icon}
                              <span className="text-xs font-medium">
                                {planAuditLabels[r.audit_type] || r.audit_type}
                              </span>
                              <Badge className={`text-[10px] ${st.cls}`} variant="outline">
                                {r.severity}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                            {r.plan_id && (
                              <span className="font-mono truncate max-w-[120px]">
                                📋 {r.plan_id.slice(0, 8)}
                              </span>
                            )}
                            {r.patient_id && (
                              <span className="font-mono truncate max-w-[120px]">
                                👤 {r.patient_id.slice(0, 8)}
                              </span>
                            )}
                            {r.resolved && <span className="text-emerald-400">✅ Resolvido</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
