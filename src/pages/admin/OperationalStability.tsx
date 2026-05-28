
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Database, Zap, Share2 } from "lucide-react";

interface FlowStatus {
  name: string;
  status: "OK" | "ERROR" | "WARNING";
  details: string;
  category: "INFRA" | "FLOW" | "POLICY";
}

export default function OperationalStability() {
  const [statuses, setStatuses] = useState<FlowStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditSystem();
  }, []);

  const auditSystem = async () => {
    setLoading(true);
    const results: FlowStatus[] = [];

    // 1. Audit Schema: Meal Plan Items
    try {
      const { data, error } = await supabase.rpc('get_column_exists', { 
        p_table: 'meal_plan_items', 
        p_column: 'clinical_mass_g' 
      });
      // Fallback manual check if RPC doesn't exist yet
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
    } catch (e) {
      console.error(e);
    }

    // 2. Audit RPC: publish_meal_plan_v3
    try {
      const { data: rpcExists } = await supabase.rpc('check_function_exists', { p_name: 'publish_meal_plan_v3' });
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
      const { data: duplicates } = await supabase.rpc('check_active_plan_duplicates');
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
        <header>
          <h1 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Matriz de Estabilidade Operacional
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitoramento de contratos, esquemas e políticas críticas em tempo real.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4" /> Infraestrutura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-500">
                {statuses.filter(s => s.category === 'INFRA' && s.status === 'OK').length} / {statuses.filter(s => s.category === 'INFRA').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4" /> Fluxos Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-blue-500">
                {statuses.filter(s => s.category === 'FLOW' && s.status === 'OK').length} / {statuses.filter(s => s.category === 'FLOW').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Governança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-purple-500">
                {statuses.filter(s => s.category === 'POLICY' && s.status === 'OK').length} / {statuses.filter(s => s.category === 'POLICY').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Auditoria em Tempo Real</CardTitle>
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
      </div>
    </DashboardLayout>
  );
}
