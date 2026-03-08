import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CheckCircle2, Circle, Flame, Trophy, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "@/lib/confetti";

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

export default function Checklist() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("checklist_tasks")
      .select("*")
      .eq("patient_id", user.id)
      .eq("date", date)
      .order("category")
      .order("created_at");
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [user, date]);

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
      }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, date]);

  const toggleTask = async (task: ChecklistTask) => {
    const newCompleted = !task.completed;
    const { error } = await supabase
      .from("checklist_tasks")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) { toast.error(error.message); return; }

    // Check if all done
    const updated = tasks.map((t) => t.id === task.id ? { ...t, completed: newCompleted } : t);
    setTasks(updated);
    if (newCompleted && updated.every((t) => t.completed)) {
      confetti();
      toast.success("🎉 Todas as tarefas concluídas! +50 XP");
      // Update player stats
      const { data: stats } = await supabase.from("player_stats").select("*").eq("user_id", user!.id).single();
      if (stats) {
        await supabase.from("player_stats").update({
          total_xp: stats.total_xp + 50,
          level: Math.floor((stats.total_xp + 50) / 100) + 1,
        }).eq("user_id", user!.id);
      }
    } else if (newCompleted) {
      toast.success(`${task.icon} Tarefa concluída! +10 XP`);
      const { data: stats } = await supabase.from("player_stats").select("*").eq("user_id", user!.id).single();
      if (stats) {
        await supabase.from("player_stats").update({
          total_xp: stats.total_xp + 10,
          level: Math.floor((stats.total_xp + 10) / 100) + 1,
        }).eq("user_id", user!.id);
      }
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const isToday = date === new Date().toISOString().split("T")[0];

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  // Group by category
  const grouped = tasks.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, ChecklistTask[]>);

  const categoryLabels: Record<string, string> = {
    habit: "🔄 Hábitos",
    nutrition: "🥗 Nutrição",
    exercise: "💪 Exercício",
    supplement: "💊 Suplementos",
    mindset: "🧠 Mindset",
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Checklist Diário</h1>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {isToday ? "Hoje" : new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeDate(1)} disabled={isToday}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <motion.div
          className="glass rounded-2xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold">Progresso</span>
            </div>
            <span className="text-sm font-medium text-primary">{completedCount}/{tasks.length}</span>
          </div>
          <Progress value={progress} className="h-3" />
          {progress === 100 && tasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 mt-3 text-success text-sm font-medium"
            >
              <Trophy className="w-4 h-4" /> Dia completo! 🎉
            </motion.div>
          )}
        </motion.div>

        {/* Tasks */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhuma tarefa para hoje</h3>
            <p className="text-muted-foreground text-sm">
              Seu nutricionista precisa ativar um protocolo para gerar suas tarefas.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, categoryTasks]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {categoryLabels[category] || category}
                </h3>
                <div className="space-y-2">
                  <AnimatePresence>
                    {categoryTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`glass rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${
                          task.completed ? "opacity-60" : "hover:border-primary/30"
                        }`}
                        onClick={() => toggleTask(task)}
                      >
                        <motion.div whileTap={{ scale: 0.8 }}>
                          {task.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-success" />
                          ) : (
                            <Circle className="w-6 h-6 text-muted-foreground" />
                          )}
                        </motion.div>
                        <span className="text-xl">{task.icon}</span>
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                        {task.completed && task.completed_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(task.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
