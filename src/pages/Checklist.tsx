import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenantContext";
import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CheckCircle2, Circle, Flame, Trophy, Calendar, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import confetti from "@/lib/confetti";
import { usePatientPoints } from "@/hooks/usePatientPoints";
import { useTranslation } from "react-i18next";
import ShareProgressButton from "@/components/social/ShareProgressButton";
import { useChecklistTasks, useToggleChecklistTask, type ChecklistTask } from "@/hooks/queries/useChecklistQuery";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys";

const DEFAULT_TASKS = [
  { title: "Seguir café da manhã do plano", icon: "☕", category: "nutrition", description: "Café da manhã conforme plano alimentar" },
  { title: "Seguir almoço do plano", icon: "🥗", category: "nutrition", description: "Almoço conforme plano alimentar" },
  { title: "Seguir jantar do plano", icon: "🍽️", category: "nutrition", description: "Jantar conforme plano alimentar" },
  { title: "Fazer lanches saudáveis entre refeições", icon: "🥜", category: "nutrition", description: "Escolher opções nutritivas nos intervalos" },
  { title: "Evitar ultraprocessados hoje", icon: "🚫", category: "nutrition", description: "Preferir alimentos naturais e integrais" },
  { title: "Consumir proteína suficiente", icon: "🥩", category: "nutrition", description: "Atingir meta proteica nas refeições" },
  { title: "Beber pelo menos 2L de água", icon: "💧", category: "hydration", description: "Distribuir ao longo do dia" },
  { title: "Tomar água ao acordar", icon: "🌅", category: "hydration", description: "Hidratar o corpo logo pela manhã" },
  { title: "Comer frutas hoje", icon: "🍎", category: "food_quality", description: "Ao menos 2 porções de frutas variadas" },
  { title: "Comer vegetais ou salada hoje", icon: "🥦", category: "food_quality", description: "Incluir em almoço e/ou jantar" },
  { title: "Incluir fibras nas refeições", icon: "🌾", category: "food_quality", description: "Grãos integrais, sementes ou aveia" },
  { title: "Praticar atividade física ou caminhar", icon: "🏃", category: "movement", description: "30-60 min de atividade moderada" },
  { title: "Caminhar ao menos 6.000 passos", icon: "🚶", category: "movement", description: "Use o celular para contar os passos" },
  { title: "Fazer alongamento (5-10 min)", icon: "🤸", category: "movement", description: "Acordar o corpo ou relaxar após treino" },
  { title: "Evitar beliscar fora do plano", icon: "🍪", category: "eating_behavior", description: "Respeitar intervalos entre refeições" },
  { title: "Respeitar sinais de fome e saciedade", icon: "⏳", category: "eating_behavior", description: "Comer devagar e prestar atenção ao corpo" },
  { title: "Dormir pelo menos 7 horas", icon: "😴", category: "lifestyle", description: "Priorizar qualidade do sono" },
  { title: "Evitar telas 1h antes de dormir", icon: "📵", category: "lifestyle", description: "Melhora a qualidade do sono" },
  { title: "Tomar sol por 15 minutos", icon: "☀️", category: "lifestyle", description: "Vitamina D natural — prefira manhã cedo" },
  { title: "Tomar suplementos prescritos", icon: "💊", category: "supplement", description: "No horário indicado pelo nutricionista" },
  { title: "Fazer 5 min de respiração ou meditação", icon: "🧘", category: "mindset", description: "Reduz cortisol e melhora foco" },
  { title: "Registrar as refeições no app", icon: "📝", category: "monitoring", description: "Acompanhe sua evolução diariamente" },
  { title: "Registrar nível de energia hoje", icon: "⚡", category: "monitoring", description: "Como se sentiu ao longo do dia" },
  { title: "Alcançar pelo menos 80% de aderência", icon: "🎯", category: "consistency", description: "Meta diária de consistência no plano" },
];

const CATEGORY_ICONS = ["☕", "🥗", "🍽️", "🚫", "🥩", "💧", "🍎", "🥦", "🏃", "🍪", "⏳", "😴", "📊", "⚡", "🎯", "✅", "💪", "🧠", "🫖", "📝"];
const CATEGORIES = [
  { value: "nutrition", label: "🥗 Nutrição" },
  { value: "hydration", label: "💧 Hidratação" },
  { value: "food_quality", label: "🍎 Qualidade Alimentar" },
  { value: "movement", label: "🏃 Movimento" },
  { value: "eating_behavior", label: "⏳ Comportamento Alimentar" },
  { value: "lifestyle", label: "😴 Estilo de Vida" },
  { value: "monitoring", label: "📊 Monitoramento" },
  { value: "consistency", label: "🎯 Consistência" },
  { value: "habit", label: "🔄 Hábito" },
  { value: "exercise", label: "💪 Exercício" },
  { value: "supplement", label: "💊 Suplemento" },
  { value: "mindset", label: "🧠 Mindset" },
];

export default function Checklist() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { awardPoints } = usePatientPoints();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toggleMutation = useToggleChecklistTask();

  const getLocalDate = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getLocalDate());
  const [editingTask, setEditingTask] = useState<ChecklistTask | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", icon: "✅", category: "habit", description: "" });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { data: tasks = [], isLoading: loading } = useChecklistTasks(date);

  // Auto-seed default tasks if empty today
  useEffect(() => {
    const isToday = date === getLocalDate();
    if (!loading && tasks.length === 0 && isToday && user && !seeding) {
      seedDefaultTasks();
    }
  }, [loading, tasks.length, date, user]);

  const seedDefaultTasks = async () => {
    if (!user) return;
    setSeeding(true);
    const inserts = DEFAULT_TASKS.map(t => ({
      patient_id: user.id,
      title: t.title,
      icon: t.icon,
      category: t.category,
      description: t.description,
      date,
      completed: false,
    }));
    const { error } = await supabase.from("checklist_tasks").insert(inserts as any);
    if (!error) {
      toast.success(t("checklist.seedSuccess"));
      queryClient.invalidateQueries({ queryKey: queryKeys.checklist.tasks(user.id, date) });
    }
    setSeeding(false);
  };

  const resetToDefaults = async () => {
    if (!user) return;
    setResetting(true);
    await supabase.from("checklist_tasks").delete().eq("patient_id", user.id).eq("date", date);
    const inserts = DEFAULT_TASKS.map(t => ({
      patient_id: user.id,
      title: t.title,
      icon: t.icon,
      category: t.category,
      description: t.description,
      date,
      completed: false,
    }));
    const { error } = await supabase.from("checklist_tasks").insert(inserts as any);
    if (!error) {
      toast.success(t("checklist.resetSuccess"));
    } else {
      toast.error(error.message);
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.checklist.tasks(user.id, date) });
    setResetting(false);
  };

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("checklist-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "checklist_tasks",
        filter: `patient_id=eq.${user.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: queryKeys.checklist.tasks(user.id, date) }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, date, queryClient]);

  const toggleTask = async (task: ChecklistTask) => {
    toggleMutation.mutate({ task, date });

    const newCompleted = !task.completed;
    if (newCompleted) {
      const updated = tasks.map((t) => t.id === task.id ? { ...t, completed: true } : t);
      
      if (updated.every((t) => t.completed)) {
        confetti();
        toast.success(t("checklist.allCompleted"));
        awardPoints("streak_bonus", { date, reason: "all_tasks_completed" });
      }

      // XP updates handled by DB triggers
    }
  };

  const handleSaveTask = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    if (editingTask) {
      const { error } = await supabase.from("checklist_tasks")
        .update({ title: form.title, icon: form.icon, category: form.category, description: form.description || null })
        .eq("id", editingTask.id);
      if (error) toast.error(error.message);
      else toast.success(t("checklist.taskUpdated"));
    } else {
      const { error } = await supabase.from("checklist_tasks").insert({
        patient_id: user.id,
        title: form.title,
        icon: form.icon,
        category: form.category,
        description: form.description || null,
        date,
        completed: false,
      } as any);
      if (error) toast.error(error.message);
      else toast.success(t("checklist.taskAdded"));
    }
    setSaving(false);
    setAddOpen(false);
    setEditingTask(null);
    setForm({ title: "", icon: "✅", category: "habit", description: "" });
    queryClient.invalidateQueries({ queryKey: queryKeys.checklist.tasks(user.id, date) });
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from("checklist_tasks").delete().eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: queryKeys.checklist.tasks(user!.id, date) });
    toast.success(t("checklist.taskRemoved"));
  };

  const openEdit = (task: ChecklistTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setForm({ title: task.title, icon: task.icon, category: task.category, description: task.description || "" });
    setAddOpen(true);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const isToday = date === getLocalDate();

  const changeDate = (offset: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setDate(getLocalDate(d));
  };

  const grouped = tasks.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, ChecklistTask[]>);

  const categoryLabels: Record<string, string> = {
    nutrition: "🥗 Nutrição",
    hydration: "💧 Hidratação",
    food_quality: "🍎 Qualidade Alimentar",
    movement: "🏃 Movimento",
    eating_behavior: "⏳ Comportamento Alimentar",
    lifestyle: "😴 Estilo de Vida",
    monitoring: "📊 Monitoramento",
    consistency: "🎯 Consistência",
    habit: "🔄 Hábitos",
    exercise: "💪 Exercício",
    supplement: "💊 Suplementos",
    mindset: "🧠 Mindset",
  };

  const categoryOrder = ["nutrition", "hydration", "food_quality", "movement", "eating_behavior", "lifestyle", "monitoring", "consistency", "habit", "exercise", "supplement", "mindset"];
  const sortedCategories = Object.entries(grouped).sort(([a], [b]) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const shareRef = useRef<HTMLDivElement>(null);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6" ref={shareRef}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">{t("checklist.title")}</h1>
            <div className="flex items-center gap-2 sm:gap-4 mt-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeDate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">
                  {isToday ? t("common.today") : new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeDate(1)} disabled={isToday}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isToday && tasks.length > 0 && tasks.length < 15 && (
              <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={resetting} className="gap-1 text-xs">
                {resetting ? t("common.resetting") : t("common.resetDefault")}
              </Button>
            )}
            <Button
              className="gradient-primary gap-2 shadow-glow"
              size="sm"
              onClick={() => { setEditingTask(null); setForm({ title: "", icon: "✅", category: "habit", description: "" }); setAddOpen(true); }}
            >
              <Plus className="w-4 h-4" /> {t("common.newTask")}
            </Button>
            <ShareProgressButton captureRef={shareRef} context="checklist" />
          </div>
        </div>

        {/* Progress */}
        <motion.div className="glass rounded-2xl p-4 sm:p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold">{t("checklist.dayProgress")}</span>
            </div>
            <span className="text-sm font-bold text-primary">{Math.round(progress)}% • {completedCount}/{tasks.length}</span>
          </div>
          <Progress value={progress} className="h-3" />
          {progress === 100 && tasks.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 mt-3 text-primary text-sm font-medium">
              <Trophy className="w-4 h-4" /> {t("checklist.dayComplete")}
            </motion.div>
          )}
        </motion.div>

        {/* Tasks */}
        {loading || seeding ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="glass rounded-xl p-4 flex items-center gap-4 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">{t("checklist.noTasks")}</h3>
            <p className="text-muted-foreground text-sm mb-4">{t("checklist.noTasksDescription")}</p>
            <Button variant="outline" onClick={() => { setDate(getLocalDate()); }} className="gap-2">
              <Calendar className="w-4 h-4" /> {t("common.goToToday")}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCategories.map(([category, categoryTasks]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {t(`checklist.categories.${category}`, { defaultValue: categoryLabels[category] || category })}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {categoryTasks.filter(t => t.completed).length}/{categoryTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {categoryTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`glass rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all active:scale-[0.98] ${
                          task.completed ? "opacity-60 bg-primary/5 border-primary/20" : "hover:border-primary/30"
                        }`}
                      >
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => toggleTask(task)}
                          className="flex-shrink-0 touch-manipulation"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-primary" />
                          ) : (
                            <Circle className="w-6 h-6 text-muted-foreground" />
                          )}
                        </motion.button>

                        <button className="text-xl flex-shrink-0 touch-manipulation" onClick={() => toggleTask(task)}>{task.icon}</button>

                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleTask(task)}>
                          <p className={`font-medium text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>

                        {task.completed && task.completed_at && (
                          <span className="text-[10px] text-primary hidden sm:inline">
                            {new Date(task.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                            onClick={(e) => openEdit(task, e)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{editingTask ? t("checklist.editTask") : t("common.newTask")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("common.title")} *</label>
                <Input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Beber 2L de água"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("checklist.descriptionOptional")}</label>
                <Input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detalhe opcional..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("checklist.icon")}</label>
                  <Select value={form.icon} onValueChange={v => setForm(p => ({ ...p, icon: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_ICONS.map(ic => (
                        <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("checklist.category")}</label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full gradient-primary" onClick={handleSaveTask} disabled={saving || !form.title.trim()}>
                {saving ? t("checklist.saving") : editingTask ? t("common.save") : t("checklist.addTask")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
