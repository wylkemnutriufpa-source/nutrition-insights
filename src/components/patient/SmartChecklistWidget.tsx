import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { getSmartChecklist, completeSmartTask, generateSmartChecklist } from "@/lib/smartChecklistEngine";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles, Droplets, UtensilsCrossed, Brain, Dumbbell, Sun, Heart } from "lucide-react";
import { toast } from "sonner";
import { safeNum } from "@/lib/formatMacros";

const CATEGORY_ICONS: Record<string, any> = {
  hydration: Droplets,
  digestive: Heart,
  behavioral: Brain,
  performance: Dumbbell,
  micronutrients: Sun,
  metabolic: Sparkles,
  general: CheckCircle2,
};

const CATEGORY_EMOJI: Record<string, string> = {
  hydration: "💧",
  digestive: "🫁",
  behavioral: "🧠",
  performance: "💪",
  micronutrients: "☀️",
  metabolic: "🔥",
  general: "✅",
};

interface SmartTask {
  id: string;
  task_code: string;
  task_title: string;
  task_description: string;
  task_category: string;
  priority_score: number;
  is_completed: boolean;
  emotional_feedback: string | null;
}

export default function SmartChecklistWidget() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<SmartTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!user?.id) return;

    // Generate if needed, then load
    await generateSmartChecklist(user.id);
    const data = await getSmartChecklist(user.id);
    setTasks(data as SmartTask[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  const handleComplete = async (taskId: string) => {
    const success = await completeSmartTask(taskId);
    if (success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: true } : t));
      setShowFeedback(taskId);
      toast.success("Tarefa concluída! 👏");
      setTimeout(() => setShowFeedback(null), 3000);
    }
  };

  const handleFeedback = async (taskId: string, feedback: string) => {
    await completeSmartTask(taskId, feedback);
    setShowFeedback(null);
  };

  if (loading) return null;

  const todayTasks = tasks.filter(t => !t.is_completed).slice(0, 8);
  const completedToday = tasks.filter(t => t.is_completed).length;
  const totalToday = safeNum(tasks?.length);
  const progressPercent = totalToday > 0 ? Math.round((safeNum(completedToday) / totalToday) * 100) : 0;

  if (totalToday === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Checklist Inteligente
        </h3>
        <span className="text-xs text-muted-foreground font-medium">
          {completedToday}/{totalToday} concluídas
        </span>
      </div>

      <Progress value={progressPercent} className="h-2" />

      {/* Horizontal scroll for tasks */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        <AnimatePresence>
          {todayTasks.map((task) => {
            const emoji = CATEGORY_EMOJI[task.task_category] || "✅";
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex-shrink-0 snap-start w-56"
              >
                <div className="rounded-xl border border-border/50 bg-card p-3 h-full flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs leading-tight">{task.task_title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.task_description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7 mt-auto"
                    onClick={() => handleComplete(task.id)}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Concluir
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Completed animation */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-center py-2"
        >
          <p className="text-sm font-medium text-primary">
            Excelente consistência! 👏🔥
          </p>
          <div className="flex gap-2 justify-center mt-2">
            {["😊 Bem", "😐 Normal", "😔 Difícil"].map(opt => (
              <Button
                key={opt}
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={() => handleFeedback(showFeedback, opt.split(" ")[1])}
              >
                {opt}
              </Button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
