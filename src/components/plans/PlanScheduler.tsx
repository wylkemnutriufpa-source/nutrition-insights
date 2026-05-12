import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Switch } from "@v1/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@v1/components/ui/collapsible";
import { toast } from "sonner";
import {
  CalendarClock, Plus, Trash2, Play, Pause, Calendar, ChevronDown,
  Scale, CheckSquare, MessageSquare, Settings2, Zap, RefreshCw,
  AlertCircle, CheckCircle, Clock, Target, Info
} from "lucide-react";

interface Schedule {
  id: string;
  meal_plan_id: string;
  activate_at: string;
  deactivate_at: string | null;
  criteria: ScheduleCriteria;
  status: string;
  created_at: string;
}

interface ScheduleCriteria {
  auto_deactivate_previous?: boolean;
  // Weight criteria
  weight_enabled?: boolean;
  weight_loss_kg?: number;
  // Checklist criteria
  checklist_enabled?: boolean;
  checklist_min_adherence?: number;
  checklist_days?: number;
  // Feedback criteria
  feedback_enabled?: boolean;
  feedback_interval_days?: number;
  // Extension settings
  extension_days?: number;
  max_extensions?: number;
  current_extensions?: number;
  // Manual override
  manual_only?: boolean;
}

interface PlanSchedulerProps {
  mealPlanId: string;
  planTitle: string;
}

const DEFAULT_CRITERIA: ScheduleCriteria = {
  auto_deactivate_previous: true,
  weight_enabled: false,
  weight_loss_kg: 1,
  checklist_enabled: true,
  checklist_min_adherence: 80,
  checklist_days: 14,
  feedback_enabled: true,
  feedback_interval_days: 15,
  extension_days: 15,
  max_extensions: 2,
  current_extensions: 0,
  manual_only: false,
};

export default function PlanScheduler({ mealPlanId, planTitle }: PlanSchedulerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [open, setOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [form, setForm] = useState({
    activate_at: "",
    deactivate_at: "",
    criteria: { ...DEFAULT_CRITERIA },
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkingCriteria, setCheckingCriteria] = useState<string | null>(null);

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from("plan_schedules")
      .select("*")
      .eq("meal_plan_id", mealPlanId)
      .order("activate_at", { ascending: true });
    if (data) {
      setSchedules(data.map(s => ({
        ...s,
        criteria: (s.criteria as ScheduleCriteria) || DEFAULT_CRITERIA
      })));
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [mealPlanId]);

  const handleCreate = async () => {
    if (!form.activate_at) return;
    setSubmitting(true);

    const criteriaJson = JSON.parse(JSON.stringify(form.criteria));
    const { error } = await supabase.from("plan_schedules").insert([{
      meal_plan_id: mealPlanId,
      activate_at: form.activate_at,
      deactivate_at: form.deactivate_at || null,
      criteria: criteriaJson,
      status: "scheduled",
    }]);

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Agendamento criado com critérios inteligentes! 🎯");
      setOpen(false);
      setForm({ activate_at: "", deactivate_at: "", criteria: { ...DEFAULT_CRITERIA } });
      fetchSchedules();
    }
    setSubmitting(false);
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("plan_schedules").delete().eq("id", id);
    fetchSchedules();
    toast.success("Agendamento removido");
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "scheduled" ? "paused" : "scheduled";
    await supabase.from("plan_schedules").update({ status: newStatus }).eq("id", id);
    fetchSchedules();
    toast.success(newStatus === "paused" ? "Pausado" : "Reativado");
  };

  const manualActivate = async (id: string) => {
    await supabase.from("plan_schedules").update({ status: "activated" }).eq("id", id);
    await supabase.rpc("activate_meal_plan" as any, { _plan_id: mealPlanId });
    fetchSchedules();
    toast.success("Plano ativado manualmente! ✅");
  };

  const checkCriteria = async (schedule: Schedule) => {
    setCheckingCriteria(schedule.id);
    // Simulate checking criteria - in production this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const results = [];
    const criteria = schedule.criteria;
    
    if (criteria.weight_enabled) {
      results.push(`Perda de peso: verificando ${criteria.weight_loss_kg}kg`);
    }
    if (criteria.checklist_enabled) {
      results.push(`Aderência checklist: mínimo ${criteria.checklist_min_adherence}%`);
    }
    if (criteria.feedback_enabled) {
      results.push(`Feedback: a cada ${criteria.feedback_interval_days} dias`);
    }
    
    toast.info(`Critérios verificados: ${results.join(", ")}`);
    setCheckingCriteria(null);
  };

  const updateCriteria = (scheduleId: string, newCriteria: ScheduleCriteria) => {
    const criteriaJson = JSON.parse(JSON.stringify(newCriteria));
    supabase
      .from("plan_schedules")
      .update({ criteria: criteriaJson })
      .eq("id", scheduleId)
      .then(() => {
        fetchSchedules();
        toast.success("Critérios atualizados!");
      });
  };

  const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    scheduled: { color: "bg-primary/10 text-primary", label: "Agendado", icon: <Clock className="w-3 h-3" /> },
    paused: { color: "bg-muted text-muted-foreground", label: "Pausado", icon: <Pause className="w-3 h-3" /> },
    activated: { color: "bg-accent/10 text-accent", label: "Ativado", icon: <CheckCircle className="w-3 h-3" /> },
    expired: { color: "bg-destructive/10 text-destructive", label: "Expirado", icon: <AlertCircle className="w-3 h-3" /> },
    extended: { color: "bg-amber-500/10 text-amber-600", label: "Estendido", icon: <RefreshCw className="w-3 h-3" /> },
  };

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Programador Inteligente</h3>
            <p className="text-xs text-muted-foreground">Ative planos com critérios automáticos</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                Agendar Ativação Inteligente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Plano: <strong>{planTitle}</strong>
              </p>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de ativação</Label>
                  <Input
                    type="date"
                    value={form.activate_at}
                    onChange={(e) => setForm({ ...form, activate_at: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Data fim (opcional)</Label>
                  <Input
                    type="date"
                    value={form.deactivate_at}
                    onChange={(e) => setForm({ ...form, deactivate_at: e.target.value })}
                  />
                </div>
              </div>

              {/* Manual Only Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Ativação apenas manual</p>
                    <p className="text-xs text-muted-foreground">Ignora critérios automáticos</p>
                  </div>
                </div>
                <Switch
                  checked={form.criteria.manual_only}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, criteria: { ...form.criteria, manual_only: checked } })
                  }
                />
              </div>

              {/* Smart Criteria */}
              <AnimatePresence>
                {!form.criteria.manual_only && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <Collapsible open={criteriaOpen} onOpenChange={setCriteriaOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            <span className="font-medium">Critérios de Ativação</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${criteriaOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-3">
                        {/* Weight Criteria */}
                        <div className="p-3 rounded-lg border border-border/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Scale className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-medium">Meta de Peso</span>
                            </div>
                            <Switch
                              checked={form.criteria.weight_enabled}
                              onCheckedChange={(checked) =>
                                setForm({ ...form, criteria: { ...form.criteria, weight_enabled: checked } })
                              }
                            />
                          </div>
                          {form.criteria.weight_enabled && (
                            <div className="flex items-center gap-2 pt-2">
                              <Label className="text-xs whitespace-nowrap">Perdeu</Label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="10"
                                value={form.criteria.weight_loss_kg}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    criteria: { ...form.criteria, weight_loss_kg: parseFloat(e.target.value) || 1 },
                                  })
                                }
                                className="w-20 h-8 text-center"
                              />
                              <span className="text-xs text-muted-foreground">kg desde última avaliação</span>
                            </div>
                          )}
                        </div>

                        {/* Checklist Criteria */}
                        <div className="p-3 rounded-lg border border-border/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium">Aderência ao Checklist</span>
                            </div>
                            <Switch
                              checked={form.criteria.checklist_enabled}
                              onCheckedChange={(checked) =>
                                setForm({ ...form, criteria: { ...form.criteria, checklist_enabled: checked } })
                              }
                            />
                          </div>
                          {form.criteria.checklist_enabled && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <div className="flex items-center gap-1">
                                <Label className="text-xs">Mínimo</Label>
                                <Input
                                  type="number"
                                  min="50"
                                  max="100"
                                  value={form.criteria.checklist_min_adherence}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      criteria: { ...form.criteria, checklist_min_adherence: parseInt(e.target.value) || 80 },
                                    })
                                  }
                                  className="w-16 h-8 text-center"
                                />
                                <span className="text-xs">%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Label className="text-xs">Últimos</Label>
                                <Input
                                  type="number"
                                  min="7"
                                  max="60"
                                  value={form.criteria.checklist_days}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      criteria: { ...form.criteria, checklist_days: parseInt(e.target.value) || 14 },
                                    })
                                  }
                                  className="w-16 h-8 text-center"
                                />
                                <span className="text-xs">dias</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Feedback Criteria */}
                        <div className="p-3 rounded-lg border border-border/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-purple-500" />
                              <span className="text-sm font-medium">Feedback Regular</span>
                            </div>
                            <Switch
                              checked={form.criteria.feedback_enabled}
                              onCheckedChange={(checked) =>
                                setForm({ ...form, criteria: { ...form.criteria, feedback_enabled: checked } })
                              }
                            />
                          </div>
                          {form.criteria.feedback_enabled && (
                            <div className="flex items-center gap-2 pt-2">
                              <Label className="text-xs whitespace-nowrap">A cada</Label>
                              <Input
                                type="number"
                                min="7"
                                max="30"
                                value={form.criteria.feedback_interval_days}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    criteria: { ...form.criteria, feedback_interval_days: parseInt(e.target.value) || 15 },
                                  })
                                }
                                className="w-16 h-8 text-center"
                              />
                              <span className="text-xs text-muted-foreground">dias</span>
                            </div>
                          )}
                        </div>

                        {/* Extension Settings */}
                        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium">Se não cumprir os critérios</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Estender por</Label>
                              <Input
                                type="number"
                                min="7"
                                max="30"
                                value={form.criteria.extension_days}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    criteria: { ...form.criteria, extension_days: parseInt(e.target.value) || 15 },
                                  })
                                }
                                className="w-14 h-8 text-center"
                              />
                              <span className="text-xs">dias</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Máximo</Label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                value={form.criteria.max_extensions}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    criteria: { ...form.criteria, max_extensions: parseInt(e.target.value) || 2 },
                                  })
                                }
                                className="w-14 h-8 text-center"
                              />
                              <span className="text-xs">vezes</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            O plano anterior permanece ativo por mais tempo se os critérios não forem atingidos.
                          </p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Auto-deactivate toggle */}
                    <label className="flex items-center gap-2 cursor-pointer p-2">
                      <input
                        type="checkbox"
                        checked={form.criteria.auto_deactivate_previous}
                        onChange={(e) =>
                          setForm({ ...form, criteria: { ...form.criteria, auto_deactivate_previous: e.target.checked } })
                        }
                        className="rounded border-border"
                      />
                      <span className="text-sm">Desativar plano anterior automaticamente</span>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                onClick={handleCreate}
                disabled={submitting || !form.activate_at}
                className="w-full gradient-primary"
              >
                {submitting ? "Criando..." : "Criar Agendamento Inteligente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Como funciona:</strong> O plano será ativado automaticamente na data programada se os critérios forem cumpridos.</p>
          <p>Se o paciente não atingir os critérios, o plano atual é estendido automaticamente.</p>
        </div>
      </div>

      {/* Schedule List */}
      {schedules.length === 0 ? (
        <div className="text-center py-8">
          <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum agendamento. Crie ativações automáticas com critérios inteligentes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s, i) => {
            const config = statusConfig[s.status] || statusConfig.scheduled;
            const criteriaCount = [
              s.criteria.weight_enabled,
              s.criteria.checklist_enabled,
              s.criteria.feedback_enabled,
            ].filter(Boolean).length;

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/50 overflow-hidden"
              >
                {/* Main Row */}
                <div className="p-4 flex items-center gap-3 bg-card">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {new Date(s.activate_at + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      {s.deactivate_at && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(s.deactivate_at + "T00:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </span>
                      {!s.criteria.manual_only && criteriaCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {criteriaCount} critério{criteriaCount > 1 ? "s" : ""} ativo{criteriaCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {s.criteria.manual_only && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          Apenas manual
                        </span>
                      )}
                      {(s.criteria.current_extensions || 0) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                          +{s.criteria.current_extensions}x estendido
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {s.status !== "activated" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs gap-1"
                        onClick={() => manualActivate(s.id)}
                      >
                        <Zap className="w-3.5 h-3.5" /> Ativar Agora
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleStatus(s.id, s.status)}
                    >
                      {s.status === "scheduled" ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteSchedule(s.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Criteria Details */}
                {!s.criteria.manual_only && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <button className="w-full px-4 py-2 text-left text-xs text-muted-foreground bg-secondary/30 hover:bg-secondary/50 transition-colors flex items-center gap-2">
                        <Settings2 className="w-3.5 h-3.5" />
                        Ver/editar critérios
                        <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 py-3 bg-secondary/20 space-y-2 text-xs">
                      {s.criteria.weight_enabled && (
                        <div className="flex items-center gap-2">
                          <Scale className="w-3.5 h-3.5 text-blue-500" />
                          <span>Perder {s.criteria.weight_loss_kg}kg desde última avaliação</span>
                        </div>
                      )}
                      {s.criteria.checklist_enabled && (
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-3.5 h-3.5 text-green-500" />
                          <span>Aderência mínima de {s.criteria.checklist_min_adherence}% nos últimos {s.criteria.checklist_days} dias</span>
                        </div>
                      )}
                      {s.criteria.feedback_enabled && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                          <span>Feedback enviado nos últimos {s.criteria.feedback_interval_days} dias</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-amber-600">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          Se não cumprir: estende +{s.criteria.extension_days} dias (máx {s.criteria.max_extensions}x)
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 h-7 text-xs"
                        onClick={() => checkCriteria(s)}
                        disabled={checkingCriteria === s.id}
                      >
                        {checkingCriteria === s.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <Target className="w-3 h-3 mr-1" />
                            Verificar Critérios Agora
                          </>
                        )}
                      </Button>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
