import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Badge } from "@v1/components/ui/badge";
import { Skeleton } from "@v1/components/ui/skeleton";
import { CheckCircle2, Circle, SkipForward, Sparkles, ListChecks, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { DOMAIN_CONFIG } from "@v1/lib/clinicalFlags";

interface BehavioralTask {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  priority: number;
  status: string;
  source_flag: string | null;
  template_code: string | null;
  due_date: string | null;
  generated_by: string;
}

interface Props {
  patientId?: string;
  editable?: boolean;
  compact?: boolean;
}

const MAX_VISIBLE_PRIORITY = 5;

export default function BehavioralTasksWidget({ patientId, editable = true, compact = false }: Props) {
  const { user } = useAuth();
  const targetId = patientId || user?.id;
  const [tasks, setTasks] = useState<BehavioralTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecondary, setShowSecondary] = useState(false);

  const fetchTasks = async () => {
    if (!targetId) return;
    const { data } = await supabase
      .from("patient_behavioral_tasks")
      .select("*")
      .eq("patient_id", targetId)
      .in("status", ["pending", "completed"])
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    setTasks((data as BehavioralTask[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [targetId]);

  const toggleTask = async (taskId: string, currentStatus: string) => {
    if (!editable) return;
    const newStatus = currentStatus === "pending" ? "completed" : "pending";
    const { error } = await supabase
      .from("patient_behavioral_tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) { toast.error("Erro ao atualizar tarefa"); return; }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (newStatus === "completed") toast.success("Tarefa concluída! 🎉");
  };

  const skipTask = async (taskId: string) => {
    const { error } = await supabase
      .from("patient_behavioral_tasks")
      .update({ status: "skipped", updated_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) { toast.error("Erro ao pular tarefa"); return; }
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    );
  }

  const pending = tasks.filter(t => t.status === "pending");
  const completed = tasks.filter(t => t.status === "completed");
  const completedPct = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  if (tasks.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
        <ListChecks className="w-5 h-5 shrink-0" />
        <span>Nenhuma tarefa comportamental gerada ainda. Complete a anamnese para personalizar seu checklist.</span>
      </div>
    );
  }

  // Split into priority (top N) and secondary
  const priorityTasks = pending.slice(0, MAX_VISIBLE_PRIORITY);
  const secondaryTasks = pending.slice(MAX_VISIBLE_PRIORITY);
  const heroTask = priorityTasks[0];

  // In compact mode show only priority tasks
  const displayPrimary = compact ? priorityTasks.slice(0, 4) : priorityTasks;

  const flagCategory = (flag: string | null) => {
    if (!flag) return "geral";
    if (flag.includes("water") || flag.includes("hydra")) return "hidratacao";
    if (flag.includes("gastri") || flag.includes("constip") || flag.includes("reflux") || flag.includes("lactose")) return "digestivo";
    if (flag.includes("sleep") || flag.includes("caffein") || flag.includes("sono")) return "sono";
    if (flag.includes("sun") || flag.includes("vitamin") || flag.includes("ferrit")) return "micronutrientes";
    if (flag.includes("training") || flag.includes("strength")) return "performance";
    if (flag.includes("emotional") || flag.includes("anxiety") || flag.includes("binge") || flag.includes("compuls")) return "comportamental";
    if (flag.includes("insulin") || flag.includes("weight") || flag.includes("muscle")) return "metabolico";
    return "geral";
  };

  const renderTask = (task: BehavioralTask, idx: number, isHero = false) => {
    const cat = flagCategory(task.source_flag);
    const config = DOMAIN_CONFIG[cat] || DOMAIN_CONFIG.geral;
    const isDone = task.status === "completed";

    return (
      <motion.div
        key={task.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: idx * 0.04, duration: 0.35 }}
        className={`group flex items-center gap-3 rounded-xl border transition-all ${
          isHero && !isDone
            ? "p-4 border-primary/30 bg-primary/5 shadow-sm"
            : isDone
              ? "p-3 border-primary/20 bg-primary/5 opacity-70"
              : "p-3 border-border bg-card hover:border-primary/30 hover:bg-primary/5"
        }`}
      >
        <button
          onClick={() => toggleTask(task.id, task.status)}
          className="shrink-0 transition-transform active:scale-90"
          disabled={!editable}
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <Circle className={`w-5 h-5 ${isHero ? "text-primary" : "text-muted-foreground"} group-hover:text-primary transition-colors`} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{config.icon}</span>
            <p className={`text-sm font-medium truncate ${isDone ? "line-through text-muted-foreground" : ""} ${isHero && !isDone ? "font-semibold" : ""}`}>
              {task.title}
            </p>
          </div>
          {task.description && !compact && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 pl-6">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10px] py-0">
            {task.frequency === "daily" ? "Diária" : task.frequency === "weekly" ? "Semanal" : task.frequency}
          </Badge>
          {editable && !isDone && (
            <button
              onClick={() => skipTask(task.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
              title="Pular"
            >
              <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          {completed.length}/{tasks.length} tarefas
        </span>
        <span className="font-display font-bold text-primary">{completedPct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${completedPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Priority tasks */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displayPrimary.map((task, idx) => renderTask(task, idx, idx === 0))}
          {completed.slice(0, compact ? 0 : 3).map((task, idx) => renderTask(task, idx + displayPrimary.length))}
        </AnimatePresence>
      </div>

      {/* Secondary tasks expandable */}
      {secondaryTasks.length > 0 && !compact && (
        <div className="space-y-2">
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSecondary ? "rotate-180" : ""}`} />
            {showSecondary ? "Ocultar" : `+${secondaryTasks.length} tarefas adicionais`}
          </button>
          <AnimatePresence>
            {showSecondary && secondaryTasks.map((task, idx) => renderTask(task, idx))}
          </AnimatePresence>
        </div>
      )}

      {compact && pending.length > 4 && (
        <p className="text-xs text-center text-muted-foreground">
          +{pending.length - 4} tarefas restantes
        </p>
      )}
    </div>
  );
}
