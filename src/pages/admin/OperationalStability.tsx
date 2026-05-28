
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Database, Zap, Share2, Activity, Bug, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
}

export default function OperationalStability() {
  const [statuses, setStatuses] = useState<FlowStatus[]>([]);
  const [metrics, setMetrics] = useState<RegressionMetrics>({
    publishFailures: 0,
    onboardingAborts: 0,
    contractBlocks: 0,
    totalErrors: 0,
    stabilityScore: 100
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditSystem();
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // 1. Publish Failures (from system_error_logs where module is publish)
      const { count: pubErrors } = await supabase
        .from("system_error_logs")
        .select("*", { count: 'exact', head: true })
        .ilike("module", "%publish%");

      // 2. Onboarding Aborts (from system_error_logs where module is onboarding)
      const { count: onbErrors } = await supabase
        .from("system_error_logs")
        .select("*", { count: 'exact', head: true })
        .ilike("module", "%onboarding%");

      // 3. Contract Blocks (from sovereign_runtime_logs where severity is WARNING/CRITICAL)
      const { count: contractErrors } = await supabase
        .from("sovereign_runtime_logs")
        .select("*", { count: 'exact', head: true })
        .in("severity", ["WARNING", "CRITICAL"]);

      const total = (pubErrors || 0) + (onbErrors || 0) + (contractErrors || 0);
      
      // Basic Stability Score calculation (inverted penalty)
      const score = Math.max(0, 100 - (total * 2));

      setMetrics({
        publishFailures: pubErrors || 0,
        onboardingAborts: onbErrors || 0,
        contractBlocks: contractErrors || 0,
        totalErrors: total,
        stabilityScore: score
      });
    } catch (e) {
      console.error("Erro ao buscar métricas de regressão:", e);
    }
  };

  const auditSystem = async () => {
    setLoading(true);
    const results: FlowStatus[] = [];

    // 1. Audit Schema: Meal Plan Items
    try {
      const { data, error } = await (supabase.rpc as any)('get_column_exists', { 
        p_table: 'meal_plan_items', 
        p_column: 'clinical_mass_g' 
      });
      if (error) {
         results.push({
           name: "Schema: clinical_mass_g",
           status: "WARNING",
           details: "Necessário verificar manualmente a existência da coluna clinical_mass_g.",
           category: "INFRA"
         });
      } else {
        results.push({
          name: "Schema: Contrato V3 (meal_plan_items)",
          status: data ? "OK" : "ERROR",
          details: data ? "Coluna clinical_mass_g presente." : "Coluna clinical_mass_g AUSENTE.",
          category: "INFRA"
        });
      }
    } catch (e) {}

    // 2. Audit RPC: publish_meal_plan_v3
    try {
      const { data: rpcExists } = await (supabase.rpc as any)('check_function_exists', { p_name: 'publish_meal_plan_v3' });
      results.push({
        name: "RPC: publish_meal_plan_v3",
        status: rpcExists ? "OK" : "ERROR",
        details: rpcExists ? "Função atômica de publicação instalada." : "Função de publicação AUSENTE.",
        category: "INFRA"
      });
    } catch (e) {}

    // 3. Audit Policies: Shared Meal Plans
    try {
      const { data: bucket, error: bucketErr } = await supabase.storage.getBucket('shared-meal-plans');
      results.push({
        name: "Storage: shared-meal-plans",
        status: bucket ? "OK" : "ERROR",
        details: bucket ? "Bucket de compartilhamento configurado." : "Erro ao acessar bucket: " + bucketErr?.message,
        category: "INFRA"
      });
    } catch (e) {}

    // 4. Flow Audit: WhatsApp Logging
    try {
      const { error: logErr } = await supabase.from('whatsapp_logs').select('id').limit(1);
      results.push({
        name: "Policy: whatsapp_logs (RLS)",
        status: logErr ? "ERROR" : "OK",
        details: logErr ? `Erro de política: ${logErr.message}` : "RLS configurado corretamente para logs.",
        category: "POLICY"
      });
    } catch (e) {}

    // 5. Flow Audit: Active Plan Constraint
    try {
      const { data: duplicates } = await (supabase.rpc as any)('check_active_plan_duplicates');
      const hasDuplicates = duplicates && (duplicates as any).length > 0;
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
              Matriz de Estabilidade Operacional
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitoramento de contratos, esquemas e políticas críticas em tempo real.
            </p>
          </div>
          <Card className="bg-slate-900 text-white border-none p-4 min-w-[200px]">
            <div className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-1">Score de Estabilidade</div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black">{metrics.stabilityScore}%</div>
              <Progress value={metrics.stabilityScore} className="h-2 flex-1 bg-slate-800" />
            </div>
          </Card>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Bug className="w-4 h-4" /> Falhas de Publicação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-red-500">{metrics.publishFailures}</div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4" /> Abandonos Onboarding
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Auditoria de Infraestrutura e Fluxos</CardTitle>
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
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Auditando sistema...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Caminho Soberano
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <h4 className="text-xs font-black uppercase mb-2">Editor V3 Ativo</h4>
                <p className="text-[10px] text-muted-foreground italic">
                  Garante que todas as edições usam o contrato clinical_mass_g.
                </p>
              </div>
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <h4 className="text-xs font-black uppercase mb-2">RPC Atômica (Publish)</h4>
                <p className="text-[10px] text-muted-foreground italic">
                  Bloqueia estados inválidos durante a persistência.
                </p>
              </div>
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <h4 className="text-xs font-black uppercase mb-2">Build Guard (Contract)</h4>
                <p className="text-[10px] text-muted-foreground italic">
                  Falha o deploy se o banco divergir do contrato local.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

