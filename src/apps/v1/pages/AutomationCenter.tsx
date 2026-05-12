import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Switch } from "@v1/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Checkbox } from "@v1/components/ui/checkbox";
import { Badge } from "@v1/components/ui/badge";
import { toast } from "sonner";
import {
  Bot, Plus, Trash2, Clock, AlertTriangle, CheckCircle2,
  Bell, ListChecks, Lightbulb, Zap, BookOpen, ChevronDown, ChevronUp,
  Lock, Shield,
} from "lucide-react";
import ProtocolMasterDocumentation from "@v1/components/admin/ProtocolMasterDocumentation";

const TRIGGER_TYPES = [
  { value: "checklist.low_detected", label: "Baixa aderência ao checklist" },
  { value: "patient.inactive", label: "Paciente inativo" },
  { value: "plan.stale", label: "Plano alimentar desatualizado" },
  { value: "weekly_goal.missed", label: "Meta semanal não atingida" },
  { value: "supplement.not_logged", label: "Suplemento não registrado" },
  { value: "checkin.overdue", label: "Check-in atrasado" },
  { value: "weight.plateau", label: "Platô de peso detectado" },
  { value: "meal.skipped", label: "Refeição não registrada" },
  { value: "pattern.weekend_drop", label: "🧠 Queda de aderência no fim de semana" },
  { value: "pattern.consecutive_drop", label: "🧠 Queda consecutiva de aderência" },
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

interface AutomationTemplate {
  name: string;
  description: string;
  trigger_type: string;
  actions: string[];
  cooldown_hours: number;
  icon: string;
  category: string;
}

const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    name: "Alerta de baixa aderência",
    description: "Notifica você e o paciente quando a aderência ao checklist cai abaixo do esperado por 3 dias seguidos.",
    trigger_type: "checklist.low_detected",
    actions: ["notify_user", "notify_professional"],
    cooldown_hours: 48,
    icon: "📉",
    category: "engajamento",
  },
  {
    name: "Paciente sumiu",
    description: "Envia lembrete automático quando o paciente não registra refeições ou checklist por 5+ dias.",
    trigger_type: "patient.inactive",
    actions: ["notify_user", "notify_professional"],
    cooldown_hours: 72,
    icon: "👻",
    category: "engajamento",
  },
  {
    name: "Renovação de plano alimentar",
    description: "Alerta quando o plano alimentar de um paciente está ativo há mais de 30 dias sem atualização.",
    trigger_type: "plan.stale",
    actions: ["notify_professional"],
    cooldown_hours: 168,
    icon: "📋",
    category: "clínico",
  },
  {
    name: "Motivação por aderência",
    description: "Envia mensagem motivacional quando o paciente completa 100% do checklist do dia.",
    trigger_type: "checklist.low_detected",
    actions: ["notify_user"],
    cooldown_hours: 24,
    icon: "🏆",
    category: "engajamento",
  },
  {
    name: "Lembrete de hidratação",
    description: "Cria tarefa diária de hidratação automaticamente para pacientes em protocolos ativos.",
    trigger_type: "checklist.low_detected",
    actions: ["create_task"],
    cooldown_hours: 24,
    icon: "💧",
    category: "tarefas",
  },
  {
    name: "Alerta de plano vencido",
    description: "Notifica o nutricionista 3 dias antes do plano alimentar expirar para renovação.",
    trigger_type: "plan.stale",
    actions: ["notify_professional"],
    cooldown_hours: 72,
    icon: "⏰",
    category: "clínico",
  },
  {
    name: "Check-in semanal automático",
    description: "Envia mensagem ao paciente toda semana pedindo feedback sobre como está se sentindo.",
    trigger_type: "patient.inactive",
    actions: ["notify_user"],
    cooldown_hours: 168,
    icon: "💬",
    category: "engajamento",
  },
  {
    name: "Tarefa de suplementação",
    description: "Cria automaticamente tarefas de suplementação no checklist dos pacientes com protocolos ativos.",
    trigger_type: "checklist.low_detected",
    actions: ["create_task", "notify_user"],
    cooldown_hours: 24,
    icon: "💊",
    category: "tarefas",
  },
  {
    name: "Reengajamento pós-férias",
    description: "Detecta pacientes que voltaram de período inativo e envia plano de retorno com tarefas.",
    trigger_type: "patient.inactive",
    actions: ["notify_user", "create_task"],
    cooldown_hours: 48,
    icon: "🏖️",
    category: "engajamento",
  },
  {
    name: "Aviso de consulta próxima",
    description: "Lembra o nutricionista de preparar materiais quando uma consulta está agendada nos próximos 2 dias.",
    trigger_type: "plan.stale",
    actions: ["notify_professional"],
    cooldown_hours: 48,
    icon: "📅",
    category: "clínico",
  },
  {
    name: "Meta semanal não atingida",
    description: "Notifica paciente e nutricionista quando a meta semanal (peso, refeições, checklist) não foi cumprida.",
    trigger_type: "weekly_goal.missed",
    actions: ["notify_user", "notify_professional"],
    cooldown_hours: 168,
    icon: "🎯",
    category: "metas",
  },
  {
    name: "Suplemento esquecido",
    description: "Alerta o paciente quando um suplemento ativo não foi registrado no checklist por 2+ dias.",
    trigger_type: "supplement.not_logged",
    actions: ["notify_user", "create_task"],
    cooldown_hours: 48,
    icon: "💊",
    category: "tarefas",
  },
  {
    name: "Check-in atrasado",
    description: "Envia lembrete ao paciente quando o check-in programado pelo nutricionista está atrasado.",
    trigger_type: "checkin.overdue",
    actions: ["notify_user", "notify_professional"],
    cooldown_hours: 48,
    icon: "📸",
    category: "engajamento",
  },
  {
    name: "Platô de peso",
    description: "Detecta quando o peso do paciente não muda por 3+ semanas e notifica o nutricionista para ajustar o plano.",
    trigger_type: "weight.plateau",
    actions: ["notify_professional"],
    cooldown_hours: 168,
    icon: "⚖️",
    category: "clínico",
  },
  {
    name: "Refeição pulada",
    description: "Alerta quando o paciente não registra refeições por 2 dias consecutivos.",
    trigger_type: "meal.skipped",
    actions: ["notify_user"],
    cooldown_hours: 48,
    icon: "🍽️",
    category: "engajamento",
  },
  {
    name: "Lembrete de suplementação diária",
    description: "Cria tarefa automática no checklist para cada suplemento ativo do paciente.",
    trigger_type: "supplement.not_logged",
    actions: ["create_task"],
    cooldown_hours: 24,
    icon: "💉",
    category: "tarefas",
  },
  {
    name: "Meta de água não atingida",
    description: "Notifica quando o paciente não atinge a meta de água por 3 dias seguidos na semana.",
    trigger_type: "weekly_goal.missed",
    actions: ["notify_user", "create_task"],
    cooldown_hours: 72,
    icon: "💧",
    category: "metas",
  },
  // ── Behavioral Pattern Automations ──
  {
    name: "Suporte de Fim de Semana",
    description: "Detecta queda de aderência na sexta/sábado/domingo e envia dicas de nutrição social: festas, restaurantes, praia e estratégias para manter consistência.",
    trigger_type: "pattern.weekend_drop",
    actions: ["notify_user", "create_task"],
    cooldown_hours: 168,
    icon: "🏖️",
    category: "comportamental",
  },
  {
    name: "Coach de Eventos Sociais",
    description: "Envia dicas práticas para o paciente lidar com alimentação em restaurantes, bares, churrascos e festas sem sair do plano.",
    trigger_type: "pattern.weekend_drop",
    actions: ["notify_user"],
    cooldown_hours: 72,
    icon: "🍷",
    category: "comportamental",
  },
  {
    name: "Alerta de Padrão Negativo",
    description: "Detecta quando a aderência cai por 3+ dias consecutivos e envia mensagem motivacional com micro-metas para retomada.",
    trigger_type: "pattern.consecutive_drop",
    actions: ["notify_user", "notify_professional"],
    cooldown_hours: 72,
    icon: "📊",
    category: "comportamental",
  },
  {
    name: "Preparação Pré-Fim de Semana",
    description: "Toda quinta-feira envia ao paciente um checklist de preparação: compras, prep de marmitas e plano de hidratação para o fim de semana.",
    trigger_type: "pattern.weekend_drop",
    actions: ["notify_user", "create_task"],
    cooldown_hours: 168,
    icon: "📋",
    category: "comportamental",
  },
];

const TUTORIAL_STEPS = [
  {
    icon: "🎯",
    title: "Escolha um Trigger",
    description: "Triggers são eventos que disparam a automação. Ex: paciente não faz checklist por 3 dias, plano alimentar desatualizado, ou paciente inativo.",
  },
  {
    icon: "⚡",
    title: "Defina as Ações",
    description: "Ações são o que acontece quando o trigger é ativado. Pode ser notificar o paciente, notificar você, ou criar tarefas automaticamente.",
  },
  {
    icon: "⏱️",
    title: "Configure o Cooldown",
    description: "O cooldown evita spam. Se definido para 24h, a mesma regra não será executada novamente para o mesmo paciente dentro desse período.",
  },
  {
    icon: "🔄",
    title: "Ative e Monitore",
    description: "Ative a regra e acompanhe as execuções no histórico. Você pode pausar ou ajustar regras a qualquer momento.",
  },
];

export default function AutomationCenter() {
  const { user, roles } = useAuth();
  const isAdmin = roles?.includes("admin");
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [activeTab, setActiveTab] = useState("templates");
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

  const createFromTemplate = async (template: AutomationTemplate) => {
    if (!user) return;

    const { data, error } = await (supabase.from("automation_rules" as any) as any).insert({
      nutritionist_id: user.id,
      name: template.name,
      description: template.description,
      trigger_type: template.trigger_type,
      conditions: [],
      actions: template.actions.map(a => ({ type: a })),
      cooldown_hours: template.cooldown_hours,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    setRules(prev => [data, ...prev]);
    toast.success(`"${template.name}" criada com sucesso! 🤖`);
    setActiveTab("rules");
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

  const categoryColors: Record<string, string> = {
    engajamento: "bg-primary/10 text-primary",
    clínico: "bg-accent/10 text-accent-foreground",
    tarefas: "bg-secondary/50 text-secondary-foreground",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
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

        {/* ── Tutorial Section ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setShowTutorial(!showTutorial)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h2 className="font-display font-semibold text-sm">Como funcionam as automações?</h2>
                <p className="text-xs text-muted-foreground">Aprenda a criar regras que trabalham por você</p>
              </div>
            </div>
            {showTutorial ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>

          <AnimatePresence>
            {showTutorial && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {TUTORIAL_STEPS.map((step, idx) => (
                      <div key={idx} className="rounded-lg bg-muted/30 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{step.icon}</span>
                          <span className="text-xs font-bold text-muted-foreground">PASSO {idx + 1}</span>
                        </div>
                        <h3 className="font-display font-semibold text-sm mb-1">{step.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-display font-semibold text-sm mb-1">Dica Pro</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Combine múltiplas ações na mesma regra! Por exemplo: quando um paciente ficar inativo,
                          envie uma notificação motivacional para ele <strong>e</strong> um alerta para você ao mesmo tempo.
                          Use os templates abaixo para começar rapidamente.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/20 p-4">
                    <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" /> Exemplos práticos do dia a dia
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <span className="text-base">📉</span>
                        <p><strong className="text-foreground">Aderência caiu:</strong> Paciente não completou checklist por 3 dias → Envia mensagem motivacional + alerta para você revisar o plano.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-base">👻</span>
                        <p><strong className="text-foreground">Paciente sumiu:</strong> Sem atividade por 7 dias → Notificação de reengajamento automática + tarefa de follow-up criada.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-base">📋</span>
                        <p><strong className="text-foreground">Plano vencido:</strong> Plano alimentar sem atualização por 30 dias → Alerta para renovar com base na evolução do paciente.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-fit ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
            {isAdmin && (
              <TabsTrigger value="protocol" className="gap-2">
                <Lock className="w-4 h-4" /> Protocolo FJ
              </TabsTrigger>
            )}
            <TabsTrigger value="templates" className="gap-2"><Zap className="w-4 h-4" /> Templates</TabsTrigger>
            <TabsTrigger value="rules" className="gap-2"><Bot className="w-4 h-4" /> Regras ({rules.length})</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><Clock className="w-4 h-4" /> Histórico</TabsTrigger>
          </TabsList>

          {/* ── PROTOCOL TAB (Admin Only) ── */}
          {isAdmin && (
            <TabsContent value="protocol" className="mt-4">
              <ProtocolMasterDocumentation />
            </TabsContent>
          )}

          {/* ── TEMPLATES TAB ── */}
          <TabsContent value="templates" className="mt-4">
            <div className="mb-4">
              <p className="text-muted-foreground text-sm">
                Clique em um template para criar a regra automaticamente. Você pode editar ou desativar depois.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AUTOMATION_TEMPLATES.map((template, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="glass rounded-xl p-5 hover:border-primary/40 transition-all group cursor-pointer flex flex-col"
                  onClick={() => createFromTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{template.icon}</span>
                    <Badge variant="secondary" className={categoryColors[template.category] || ""}>
                      {template.category}
                    </Badge>
                  </div>
                  <h3 className="font-display font-semibold text-sm mb-1">{template.name}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed flex-1 mb-3">{template.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {TRIGGER_TYPES.find(t => t.value === template.trigger_type)?.label}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {template.cooldown_hours}h
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.actions.map(a => (
                      <Badge key={a} variant="outline" className="text-[10px] px-2 py-0">
                        {ACTION_TYPES.find(at => at.value === a)?.label}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Usar Template
                  </Button>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ── RULES TAB ── */}
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
                  <p className="text-xs text-muted-foreground mt-1">Use os templates ou crie uma regra personalizada</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={() => setActiveTab("templates")}>
                    <Zap className="w-4 h-4" /> Ver Templates
                  </Button>
                </CardContent>
              </Card>
            ) : rules.map(rule => (
              <Card key={rule.id} className="glass shadow-card">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-sm">{rule.name}</h3>
                        <Badge variant={rule.is_active ? "default" : "secondary"} className={rule.is_active ? "bg-primary/10 text-primary border-0" : ""}>
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

          {/* ── HISTORY TAB ── */}
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
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
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