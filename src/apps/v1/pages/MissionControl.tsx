import { useState, useMemo } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@v1/components/ui/dialog";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Users, AlertTriangle, CheckCircle2, XCircle,
  Play, Eye, RotateCcw, Clock, Filter, Rocket, Bell,
  ToggleLeft, RefreshCw, Archive, UserCheck, Crown, Target
} from "lucide-react";
import { format } from "date-fns";

const CATEGORY_ICONS: Record<string, any> = {
  premium: Crown, patients: Users, plans: Archive, onboarding: Rocket,
  communication: Bell, feature_flags: ToggleLeft, clinical: Target, operations: RefreshCw,
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
};

interface ActionItem {
  id: string;
  action_code: string;
  action_name: string;
  action_description: string | null;
  entity_type: string;
  category: string;
  supports_preview: boolean;
  supports_rollback: boolean;
  risk_level: string;
  is_active: boolean;
}

export default function MissionControl() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [filterCategory, setFilterCategory] = useState("all");
  const [confirmText, setConfirmText] = useState("");
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [previewData, setPreviewData] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const { data: actions = [] } = useQuery({
    queryKey: ["mission-control-actions"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("global_action_catalog").select("*").eq("is_active", true).order("category");
      return (data || []) as ActionItem[];
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["mission-control-logs"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("global_action_logs").select("*").order("started_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const categories = useMemo(() => {
    const cats = new Set(actions.map(a => a.category));
    return ["all", ...Array.from(cats)];
  }, [actions]);

  const filtered = useMemo(() =>
    filterCategory === "all" ? actions : actions.filter(a => a.category === filterCategory),
  [actions, filterCategory]);

  const startWizard = (action: ActionItem) => {
    setSelectedAction(action);
    setWizardStep(1);
    setPayload({});
    setPreviewData(null);
    setConfirmText("");
  };

  const runPreview = async () => {
    if (!selectedAction) return;
    try {
      const { data, error } = await supabase.functions.invoke("execute-global-action", {
        body: {
          action_code: selectedAction.action_code,
          filters: { scope: payload.scope || "all" },
          payload,
          mode: "preview",
        },
      });
      if (error) throw error;
      setPreviewData({
        affected: data.affected || 0,
        risks: data.risks || [],
        details: data.details || {},
      });
      setWizardStep(3);
    } catch (err: any) {
      toast.error("Erro ao gerar preview: " + (err.message || ""));
    }
  };

  const executeAction = async () => {
    if (!selectedAction || !user) return;
    if (selectedAction.risk_level === "high" || selectedAction.risk_level === "critical") {
      if (confirmText !== "CONFIRMAR EXECUÇÃO") {
        toast.error("Digite 'CONFIRMAR EXECUÇÃO' para prosseguir");
        return;
      }
    }
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("execute-global-action", {
        body: {
          action_code: selectedAction.action_code,
          filters: { scope: payload.scope || "all" },
          payload,
          executed_by: user.id,
          mode: "execute",
        },
      });
      if (error) throw error;
      toast.success(`✅ ${data.summary || selectedAction.action_name + " executada"}`);
      queryClient.invalidateQueries({ queryKey: ["mission-control-logs"] });
      setSelectedAction(null);
      setWizardStep(0);
    } catch (err: any) {
      toast.error("Erro ao executar: " + (err.message || ""));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Mission Control</h1>
              <p className="text-sm text-muted-foreground">Central de Comando Operacional</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1"><Zap className="w-3 h-3" /> {actions.length} ações disponíveis</Badge>
        </motion.div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <Button key={cat} variant={filterCategory === cat ? "default" : "outline"} size="sm"
              onClick={() => setFilterCategory(cat)} className="capitalize">
              {cat === "all" ? "Todas" : cat}
            </Button>
          ))}
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((action, i) => {
            const Icon = CATEGORY_ICONS[action.category] || Zap;
            return (
              <motion.div key={action.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <Card className="cursor-pointer hover:border-primary/30 transition-all group" onClick={() => startWizard(action)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge className={`text-[10px] ${RISK_COLORS[action.risk_level]}`}>{action.risk_level}</Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{action.action_name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{action.action_description}</p>
                    <div className="flex gap-2 mt-3">
                      {action.supports_preview && <Badge variant="outline" className="text-[9px]"><Eye className="w-3 h-3 mr-1" />Preview</Badge>}
                      {action.supports_rollback && <Badge variant="outline" className="text-[9px]"><RotateCcw className="w-3 h-3 mr-1" />Rollback</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Histórico Recente</CardTitle></CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ação executada ainda</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">{log.action_code}</p>
                      <p className="text-xs text-muted-foreground">{log.started_at ? format(new Date(log.started_at), "dd/MM HH:mm") : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.affected_count} afetados</Badge>
                      <Badge className={log.execution_status === "completed" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}>
                        {log.execution_status === "completed" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {log.execution_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Wizard Dialog */}
        <Dialog open={!!selectedAction && wizardStep > 0} onOpenChange={() => { setSelectedAction(null); setWizardStep(0); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {selectedAction?.action_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Step indicator */}
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${wizardStep >= s ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{selectedAction?.action_description}</p>
                  <Badge className={RISK_COLORS[selectedAction?.risk_level || "low"]}>
                    Risco: {selectedAction?.risk_level}
                  </Badge>
                  <Button className="w-full" onClick={() => setWizardStep(2)}>Configurar Filtros →</Button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Escopo</label>
                    <Select onValueChange={v => setPayload(p => ({ ...p, scope: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar escopo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Apenas ativos</SelectItem>
                        <SelectItem value="inactive">Apenas inativos</SelectItem>
                        <SelectItem value="premium">Apenas premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedAction?.action_code === "grant_premium_days" && (
                    <div>
                      <label className="text-sm font-medium">Dias Premium</label>
                      <Input type="number" placeholder="7" onChange={e => setPayload(p => ({ ...p, days: parseInt(e.target.value) }))} />
                    </div>
                  )}
                  {selectedAction?.action_code === "send_campaign" && (
                    <div>
                      <label className="text-sm font-medium">Mensagem</label>
                      <Textarea placeholder="Mensagem da campanha..." onChange={e => setPayload(p => ({ ...p, message: e.target.value }))} />
                    </div>
                  )}
                  <Button className="w-full" onClick={runPreview}><Eye className="w-4 h-4 mr-2" /> Simular Impacto</Button>
                </div>
              )}

              {wizardStep === 3 && previewData && (
                <div className="space-y-3">
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Preview de Impacto</span>
                      </div>
                      <p className="text-2xl font-bold">{previewData.affected} registros afetados</p>
                      {previewData.risks.length > 0 && (
                        <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                          ⚠️ {previewData.risks.join(", ")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Button className="w-full" onClick={() => setWizardStep(4)}>Prosseguir para Confirmação</Button>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-3">
                  {(selectedAction?.risk_level === "high" || selectedAction?.risk_level === "critical") && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm font-medium text-destructive mb-2">⚠️ Ação de alto risco. Digite "CONFIRMAR EXECUÇÃO":</p>
                      <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="CONFIRMAR EXECUÇÃO" />
                    </div>
                  )}
                  <Button className="w-full" onClick={executeAction} disabled={executing}>
                    {executing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    {executing ? "Executando..." : "Executar Ação"}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
