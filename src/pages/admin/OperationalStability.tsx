
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Database, Zap, Share2, Activity, Bug, TrendingDown, ClipboardCheck, Lock, Search, FileText, History, ShieldAlert } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface FlowStatus {
  name: string;
  status: "OK" | "ERROR" | "WARNING";
  details: string;
  category: "INFRA" | "FLOW" | "POLICY";
}

interface RegressionMetrics {
  publishFailures: number;
  onboardingAborts: number;
  contractBlocks: number;
  totalErrors: number;
  stabilityScore: number;
  stabilityStreakDays: number;
  publishSuccessRate: number;
  onboardingCompletionRate: number;
  rollbackCount: number;
}

interface IncidentLog {
  id: string;
  created_at: string;
  title: string;
  module: string;
  description: string;
  root_cause: string;
  prevention: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const CHECKLIST_ITEMS = [
  { id: "cadastro", label: "Cadastro funcionando" },
  { id: "onboarding", label: "Onboarding funcionando" },
  { id: "vinculo", label: "Vínculo correto" },
  { id: "geracao", label: "Geração de plano" },
  { id: "publicacao", label: "Publicação" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "pdf", label: "PDF" },
  { id: "substituicoes", label: "Substituições" },
  { id: "app_paciente", label: "App Paciente" }
];

export default function OperationalStability() {
  const [statuses, setStatuses] = useState<FlowStatus[]>([]);
  const [metrics, setMetrics] = useState<RegressionMetrics>({
    publishFailures: 0,
    onboardingAborts: 0,
    contractBlocks: 0,
    totalErrors: 0,
    stabilityScore: 100,
    stabilityStreakDays: 0,
    publishSuccessRate: 100,
    onboardingCompletionRate: 100,
    rollbackCount: 0
  });
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const [newIncident, setNewIncident] = useState<Partial<IncidentLog>>({
    severity: "MEDIUM",
    module: "Geral"
  });
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_ITEMS.map(item => [item.id, false]))
  );
  const [savingChecklist, setSavingChecklist] = useState(false);

  useEffect(() => {
    auditSystem();
    fetchMetrics();
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from("system_incident_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setIncidents(data as IncidentLog[]);
  };

  const fetchMetrics = async () => {
    try {
      const { count: pubErrors } = await supabase
        .from("system_error_logs")
        .select("*", { count: 'exact', head: true })
        .ilike("module", "%publish%");

      const { count: onbErrors } = await supabase
        .from("system_error_logs")
        .select("*", { count: 'exact', head: true })
        .ilike("module", "%onboarding%");

      const { count: contractErrors } = await supabase
        .from("sovereign_runtime_logs")
        .select("*", { count: 'exact', head: true })
        .in("severity", ["WARNING", "CRITICAL"]);

      const { data: lastError } = await supabase
        .from("system_error_logs")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastErrorDate = lastError ? new Date(lastError.created_at) : new Date("2026-05-28");
      const streak = Math.floor((new Date().getTime() - lastErrorDate.getTime()) / (1000 * 3600 * 24));

      const total = (pubErrors || 0) + (onbErrors || 0) + (contractErrors || 0);
      const score = Math.max(0, 100 - (total * 2));

      setMetrics({
        publishFailures: pubErrors || 0,
        onboardingAborts: onbErrors || 0,
        contractBlocks: contractErrors || 0,
        totalErrors: total,
        stabilityScore: score,
        stabilityStreakDays: Math.max(0, streak),
        publishSuccessRate: 98.5, // Mock value until real telemetry is connected
        onboardingCompletionRate: 94.2, // Mock value
        rollbackCount: 0
      });
    } catch (e) {
      console.error("Erro ao buscar métricas de regressão:", e);
    }
  };

  const auditSystem = async () => {
    setLoading(true);
    const results: FlowStatus[] = [];

    // 1. Audit Schema
    try {
      const { data } = await supabase.rpc('get_column_exists', { 
        p_table: 'meal_plan_items', 
        p_column: 'clinical_mass_g' 
      });
      results.push({
        name: "Schema: Contrato V3 (meal_plan_items)",
        status: data ? "OK" : "ERROR",
        details: data ? "Coluna clinical_mass_g presente." : "Coluna clinical_mass_g AUSENTE.",
        category: "INFRA"
      });
    } catch (e) {}

    // 2. Audit RPC
    try {
      const { data: rpcExists } = await supabase.rpc('check_function_exists', { p_name: 'publish_meal_plan_v3' });
      results.push({
        name: "RPC: publish_meal_plan_v3",
        status: rpcExists ? "OK" : "ERROR",
        details: rpcExists ? "Função atômica de publicação instalada." : "Função de publicação AUSENTE.",
        category: "INFRA"
      });
    } catch (e) {}

    // 3. Flow Audit: Active Plan Constraint
    try {
      const { data: duplicates } = await supabase.rpc('check_active_plan_duplicates');
      const hasDuplicates = Array.isArray(duplicates) && duplicates.length > 0;
      results.push({
        name: "Integridade: Plano Ativo Único",
        status: hasDuplicates ? "ERROR" : "OK",
        details: hasDuplicates ? "Existem pacientes com múltiplos planos ativos!" : "Restrição de unicidade íntegra.",
        category: "FLOW"
      });
    } catch (e) {}

    setStatuses(results);
    setLoading(false);
  };

  const saveChecklist = async () => {
    setSavingChecklist(true);
    try {
      const { error } = await supabase.from("qa_checklist_runs").insert({
        checklist_key: "daily_operational",
        steps: checklist,
        passed: Object.values(checklist).every(v => v),
        notes: "Checklist diário executado via Stability Dashboard."
      });

      if (error) throw error;
      toast.success("Checklist salvo com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar checklist.");
    } finally {
      setSavingChecklist(false);
    }
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "OK": return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "ERROR": return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Estabilização Operacional
            </h1>
            <p className="text-muted-foreground mt-2">
              Arquitetura congelada. Foco total em uso clínico real e previsibilidade.
            </p>
          </div>
          <div className="flex gap-4 min-w-[300px]">
            <Card className="bg-slate-900 text-white border-none p-4 flex-1">
              <div className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-1">Streak de Estabilidade</div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black">{metrics.stabilityStreakDays}d</div>
                <div className="text-[10px] text-slate-500 uppercase leading-tight">Meta: 7 dias <br /> sem regressão</div>
              </div>
            </Card>
            <Card className="bg-slate-900 text-white border-none p-4 flex-1">
              <div className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-1">Score Geral</div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black">{metrics.stabilityScore}%</div>
                <Progress value={metrics.stabilityScore} className="h-2 flex-1 bg-slate-800" />
              </div>
            </Card>
          </div>
        </header>

        <Tabs defaultValue="checklist" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="checklist" className="gap-2">
              <ClipboardCheck className="w-4 h-4" /> Checklist Diário
            </TabsTrigger>
            <TabsTrigger value="matrix" className="gap-2">
              <Activity className="w-4 h-4" /> Matriz de Estabilidade
            </TabsTrigger>
            <TabsTrigger value="protocol" className="gap-2">
              <Lock className="w-4 h-4" /> Protocolo de Intervenção
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center justify-between">
                  Validar Fluxo Humano Real
                  <Badge variant="secondary">Sem SQL Manual</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CHECKLIST_ITEMS.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                      <Checkbox 
                        id={item.id} 
                        checked={checklist[item.id]} 
                        onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, [item.id]: !!checked }))}
                      />
                      <label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={saveChecklist} disabled={savingChecklist} className="font-bold">
                    {savingChecklist ? "Salvando..." : "Registrar Validação Diária"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matrix" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-red-500/5 border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Bug className="w-4 h-4" /> Falhas Publicação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-red-500">{metrics.publishFailures}</div>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Abandono Onboarding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-amber-500">{metrics.onboardingAborts}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Bloqueios Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-blue-500">{metrics.contractBlocks}</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> Total Regressões
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-purple-500">{metrics.totalErrors}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest">Auditoria de Infraestrutura</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recurso / Fluxo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes Operacionais</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statuses.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {s.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{renderStatusIcon(s.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="protocol">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Protocolo de Intervenção Cirúrgica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Regras de Ouro (Governança)</h3>
                    <ul className="space-y-3">
                      {[
                        "Postura Conservadora: Nenhuma mudança sem justificativa operacional",
                        "Bug Real vs. Melhoria: Proibido disfarçar refatores como correção",
                        "Só corrigir bugs reproduzíveis: Prova de falha + Prova de cura",
                        "Atomicidade: Um bug por vez, um fluxo por vez",
                        "Sem Auto-Cura: Descobrir ONDE o estado inválido nasce",
                        "Determinismo: Sem fallbacks silenciosos ou sincronizações invisíveis"
                      ].map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4 p-4 bg-background/50 rounded-xl border">
                    <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                      <Search className="w-4 h-4" /> Checklist Pré-Mudança (Mandatório)
                    </h3>
                    <div className="space-y-3 text-xs text-muted-foreground">
                      <p><strong>1. Qual bug real resolve?</strong> (Descrever falha operacional)</p>
                      <p><strong>2. Qual fluxo clínico toca?</strong> (Ex: Geração de plano, WhatsApp)</p>
                      <p><strong>3. Qual contrato altera?</strong> (Banco, RPC, Interface)</p>
                      <p><strong>4. Qual risco de regressão cria?</strong> (Baixo/Médio/Alto)</p>
                      <p><strong>5. Qual teste protege?</strong> (Prevenção de regressão)</p>
                      <p><strong>6. Como o rollback funciona?</strong> (Plano de emergência)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
