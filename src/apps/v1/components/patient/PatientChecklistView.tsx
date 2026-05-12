import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Circle, Flame, Trophy, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, Calendar, TrendingUp, BarChart3
} from "lucide-react";

interface ChecklistTask {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  category: string;
  completed: boolean;
  completed_at: string | null;
  date: string;
}

const CATEGORY_ICONS = ["🍎", "🏃", "🥗", "💧", "😴", "☀️", "💊", "📝", "🚫", "🧘", "🥦", "🚶", "📵", "🤸", "⏳", "✅", "🎯", "💪", "🧠", "🫖"];
const CATEGORIES = [
  { value: "habit", label: "🔄 Hábito" },
  { value: "nutrition", label: "🥗 Nutrição" },
  { value: "exercise", label: "💪 Exercício" },
  { value: "supplement", label: "💊 Suplemento" },
  { value: "mindset", label: "🧠 Mindset" },
  { value: "hydration", label: "💧 Hidratação" },
];

const categoryLabels: Record<string, string> = {
  habit: "🔄 Hábitos",
  nutrition: "🥗 Nutrição",
  exercise: "💪 Exercício",
  supplement: "💊 Suplementos",
  mindset: "🧠 Mindset",
  hydration: "💧 Hidratação",
};

interface Props {
  patientId: string;
  /** If true, nutri can edit/add/delete tasks */
  editable?: boolean;
}

export default function PatientChecklistView({ patientId, editable = true }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ChecklistTask | null>(null);
  const [form, setForm] = useState({ title: "", icon: "✅", category: "habit", description: "" });
  const [weekStats, setWeekStats] = useState<{ date: string; total: number; completed: number }[]>([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("checklist_tasks")
      .select("*")
      .eq("patient_id", patientId)
      .eq("date", date)
      .order("category")
      .order("created_at");
    setTasks(data || []);
    setLoading(false);
  }, [patientId, date]);

  // Fetch week adherence stats
  const fetchWeekStats = useCallback(async () => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    const { data } = await supabase
      .from("checklist_tasks")
      .select("date, completed")
      .eq("patient_id", patientId)
      .in("date", dates);

    if (data) {
      const grouped = dates.map(d => {
        const dayTasks = data.filter(t => t.date === d);
        return {
          date: d,
          total: dayTasks.length,
          completed: dayTasks.filter(t => t.completed).length,
        };
      });
      setWeekStats(grouped);
    }
  }, [patientId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchWeekStats(); }, [fetchWeekStats]);

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const isToday = date === new Date().toISOString().split("T")[0];

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  const grouped = tasks.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, ChecklistTask[]>);

  const handleSaveTask = async () => {
    if (!user || !form.title.trim()) return;
    if (editingTask) {
      const { error } = await supabase.from("checklist_tasks")
        .update({ title: form.title, icon: form.icon, category: form.category, description: form.description || null })
        .eq("id", editingTask.id);
      if (error) toast.error(error.message);
      else toast.success("Tarefa atualizada!");
    } else {
      const { error } = await supabase.from("checklist_tasks").insert({
        patient_id: patientId,
        title: form.title,
        icon: form.icon,
        category: form.category,
        description: form.description || null,
        date,
        completed: false,
        ...getTenantIdForInsert(tenantId),
      } as any);
      if (error) toast.error(error.message);
      else toast.success("Tarefa adicionada!");
    }
    setAddOpen(false);
    setEditingTask(null);
    setForm({ title: "", icon: "✅", category: "habit", description: "" });
    fetchTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from("checklist_tasks").delete().eq("id", taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success("Tarefa removida");
  };

  // Week adherence average
  const weekAvg = weekStats.length > 0
    ? Math.round(weekStats.reduce((sum, d) => sum + (d.total > 0 ? (d.completed / d.total) * 100 : 0), 0) / weekStats.filter(d => d.total > 0).length || 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Week Adherence Bar */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-primary" /> Adesão Semanal
          </h3>
          <Badge variant={weekAvg >= 70 ? "default" : weekAvg >= 40 ? "secondary" : "destructive"}>
            {weekAvg}% média
          </Badge>
        </div>
        <div className="flex items-end gap-1 h-12">
          {weekStats.map((d) => {
            const pct = d.total > 0 ? (d.completed / d.total) * 100 : 0;
            const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-muted rounded-sm relative" style={{ height: "32px" }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-sm transition-all ${
                      pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-warning" : pct > 0 ? "bg-destructive/60" : "bg-muted"
                    }`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {isToday ? "Hoje" : new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">{Math.round(progress)}% • {completedCount}/{tasks.length}</span>
          {editable && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => {
              setEditingTask(null);
              setForm({ title: "", icon: "✅", category: "habit", description: "" });
              setAddOpen(true);
            }}>
              <Plus className="w-3 h-3" /> Tarefa
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />
      {progress === 100 && tasks.length > 0 && (
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <Trophy className="w-4 h-4" /> Dia completo! 🎉
        </div>
      )}

      {/* Tasks */}
      {loading ? (
        <div className="flex items-center justify-center h-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma tarefa para este dia</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categoryTasks]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground">{categoryLabels[category] || category}</h4>
                <span className="text-[10px] text-muted-foreground">
                  {categoryTasks.filter(t => t.completed).length}/{categoryTasks.length}
                </span>
              </div>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {categoryTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`rounded-lg border p-3 flex items-center gap-3 transition-all ${
                        task.completed ? "opacity-50 bg-primary/5 border-primary/20" : "bg-card border-border"
                      }`}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm flex-shrink-0">{task.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                        {task.description && <p className="text-[10px] text-muted-foreground">{task.description}</p>}
                      </div>
                      {task.completed && task.completed_at && (
                        <span className="text-[10px] text-primary flex-shrink-0">
                          {new Date(task.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {editable && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingTask(task);
                              setForm({ title: task.title, icon: task.icon, category: task.category, description: task.description || "" });
                              setAddOpen(true);
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
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
            <DialogTitle className="font-display">{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Título *</label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Beber 2L de água" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes opcionais" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm(p => ({ ...p, icon }))}
                    className={`text-xl p-1.5 rounded-lg border transition-all ${form.icon === icon ? "border-primary bg-primary/10 scale-110" : "border-transparent hover:bg-muted"}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveTask} className="w-full gradient-primary" disabled={!form.title.trim()}>
              {editingTask ? "Salvar Alterações" : "Adicionar Tarefa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
