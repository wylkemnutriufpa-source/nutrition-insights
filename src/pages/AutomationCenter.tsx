import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Play, Clock, AlertTriangle, CheckCircle2, Bell, ListChecks } from "lucide-react";

const TRIGGER_TYPES = [
  { value: "checklist.low_detected", label: "Baixa aderência ao checklist" },
  { value: "patient.inactive", label: "Paciente inativo" },
  { value: "plan.stale", label: "Plano alimentar desatualizado" },
];

const ACTION_TYPES = [
  { value: "notify_user", label: "Notificar paciente", icon: Bell },
  { value: "notify_professional", label: "Notificar nutricionista", icon: Bell },
  { value: "create_task", label: "Criar tarefa no checklist", icon: ListChecks },
];

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  conditions: any[];
  actions: any[];
  is_active: boolean;
  cooldown_hours: number;
  created_at: string;
}

interface AutomationRun {
  id: string;
  rule_id: string;
  patient_id: string | null;
  status: string;
  error_message: string | null;
  executed_at: string;
  actions_executed: any[];
}

export default function AutomationCenter() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger_type: "checklist.low_detected",
    cooldown_hours: 24,
    actions: [] as string[],
  });

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [rulesRes, runsRes] = await Promise.all([
        (supabase.from("automation_rules" as any) as any).select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false }),
        (supabase.from("automation_runs" as any) as any).select("*").eq("nutritionist_id", user.id).order("executed_at", { ascending: false }).limit(50),
      ]);
      setRules(rulesRes.data || []);
      setRuns(runsRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.actions.length === 0) { toast.error("Selecione pelo menos uma ação"); return; }

    const { data, error } = await (supabase.from("automation_rules" as any) as any).insert({
      nutritionist_id: user.id,
      name: form.name.trim(),
      description: form.description || null,
      trigger_type: form.trigger_type,
      conditions: [],
      actions: form.actions.map(a => ({ type: a })),
      cooldown_hours: form.cooldown_hours,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    setRules(prev => [data, ...prev]);
    setCreateOpen(false);
    setForm({ name: "", description: "", trigger_type: "checklist.low_detected", cooldown_hours: 24, actions: [] });
    toast.success("Regra criada! 🤖");
  };

  const toggleRule = async (id: string, active: boolean) => {
    await (supabase.from("automation_rules" as any) as any).update({ is_active: active }).eq("id", id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: active } : r));
  };

  const deleteRule = async (id: string) => {
    await (supabase.from("automation_rules" as any) as any).delete().eq("id", id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("Regra removida");
  };

  const toggleAction = (action: string) => {
    setForm(prev => ({
      ...prev,
      actions: prev.actions.includes(action) ? prev.actions.filter(a => a !== action) : [...prev.actions, action],
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Motor de Automação</h1>
              <p className="text-muted-foreground text-sm">{rules.filter(r => r.is_active).length} regras ativas</p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow"><Plus className="w-4 h-4" /> Nova Regra</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Criar Regra de Automação</DialogTitle>
              </DialogHeader>
              <form onSubmit={createRule} className="space-y-4">
                <div>
                  <Label>Nome da regra</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Alerta de baixa aderência" required />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Opcional" />
                </div>
                <div>
                  <Label>Trigger</Label>
                  <Select value={form.trigger_type} onValueChange={v => setForm(p => ({ ...p, trigger_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cooldown (horas)</Label>
                  <Input type="number" min={1} value={form.cooldown_hours} onChange={e => setForm(p => ({ ...p, cooldown_hours: parseInt(e.target.value) || 24 }))} />
                </div>
                <div>
                  <Label>Ações</Label>
                  <div className="space-y-2 mt-2">
                    {ACTION_TYPES.map(a => (
                      <div key={a.value} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <Checkbox checked={form.actions.includes(a.value)} onCheckedChange={() => toggleAction(a.value)} />
                        <a.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{a.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary">Criar Regra</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Regras ({rules.length})</TabsTrigger>
            <TabsTrigger value="history">Histórico ({runs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rules.length === 0 ? (
              <Card className="glass shadow-card">
                <CardContent className="py-12 text-center">
                  <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhuma regra criada</p>
                  <p className="text-xs text-muted-foreground mt-1">Crie sua primeira regra de automação</p>
                </CardContent>
              </Card>
            ) : rules.map(rule => (
              <Card key={rule.id} className="glass shadow-card">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-sm">{rule.name}</h3>
                        <Badge variant={rule.is_active ? "default" : "secondary"} className={rule.is_active ? "bg-success/10 text-success border-0" : ""}>
                          {rule.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      {rule.description && <p className="text-xs text-muted-foreground mb-1">{rule.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Trigger: {TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type}</span>
                        <span>•</span>
                        <span>Cooldown: {rule.cooldown_hours}h</span>
                        <span>•</span>
                        <span>{(rule.actions as any[])?.length || 0} ações</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.is_active} onCheckedChange={v => toggleRule(rule.id, v)} />
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            {runs.length === 0 ? (
              <Card className="glass shadow-card">
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhuma execução registrada</p>
                </CardContent>
              </Card>
            ) : runs.map(run => (
              <div key={run.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                {run.status === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {rules.find(r => r.id === run.rule_id)?.name || "Regra removida"}
                  </p>
                  {run.error_message && <p className="text-xs text-destructive">{run.error_message}</p>}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(run.executed_at).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
