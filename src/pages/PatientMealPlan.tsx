import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "@/lib/confetti";
import {
  CheckCircle2, Circle, Calendar, ChevronLeft, ChevronRight,
  Utensils, Coffee, Apple, Sandwich, Moon, Cookie, Sun, Flame,
  Trophy, Beef, Wheat, Droplets
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MealType = Database["public"]["Enums"]["meal_type"];

interface MealPlanItem {
  id: string;
  title: string;
  description: string | null;
  meal_type: MealType;
  day_of_week: number | null;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
}

interface MealCompletion {
  id: string;
  meal_plan_item_id: string;
  completed: boolean;
  completed_at: string | null;
}

interface MealPlan {
  id: string;
  title: string;
  start_date: string;
}

const MEAL_TYPES: { key: MealType; label: string; icon: React.ReactNode; time: string }[] = [
  { key: "breakfast", label: "Café da Manhã", icon: <Coffee className="w-5 h-5" />, time: "06:00 - 09:00" },
  { key: "morning_snack", label: "Lanche da Manhã", icon: <Apple className="w-5 h-5" />, time: "10:00 - 11:00" },
  { key: "lunch", label: "Almoço", icon: <Utensils className="w-5 h-5" />, time: "12:00 - 14:00" },
  { key: "afternoon_snack", label: "Lanche da Tarde", icon: <Cookie className="w-5 h-5" />, time: "15:00 - 17:00" },
  { key: "dinner", label: "Jantar", icon: <Moon className="w-5 h-5" />, time: "18:00 - 20:00" },
  { key: "evening_snack", label: "Ceia", icon: <Sun className="w-5 h-5" />, time: "21:00 - 22:00" },
];

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function PatientMealPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get active meal plan for patient
    const { data: planData } = await supabase
      .from("meal_plans")
      .select("id, title, start_date")
      .eq("patient_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!planData) {
      setLoading(false);
      return;
    }

    setPlan(planData);

    // Get items for today's day of week
    const { data: itemsData } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planData.id)
      .eq("day_of_week", dayOfWeek)
      .order("created_at");

    setItems(itemsData || []);

    // Get completions for today
    const { data: completionsData } = await (supabase
      .from("meal_item_completions" as any) as any)
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .eq("date", date);

    setCompletions(completionsData || []);
    setLoading(false);
  }, [user, date, dayOfWeek]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !plan) return;
    const channel = supabase
      .channel("meal-completions-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "meal_item_completions",
        filter: `patient_id=eq.${user.id}`,
      }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, plan, fetchData]);

  const toggleItem = async (item: MealPlanItem) => {
    if (!user || !plan) return;

    const existing = completions.find(c => c.meal_plan_item_id === item.id);
    const newCompleted = !existing?.completed;

    if (existing) {
      await (supabase.from("meal_item_completions" as any) as any)
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq("id", existing.id);
    } else {
      await (supabase.from("meal_item_completions" as any) as any)
        .insert({
          patient_id: user.id,
          meal_plan_item_id: item.id,
          meal_plan_id: plan.id,
          date,
          completed: true,
          completed_at: new Date().toISOString(),
        });
    }

    // Update local state
    const updated = existing
      ? completions.map(c => c.id === existing.id ? { ...c, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : c)
      : [...completions, { id: crypto.randomUUID(), meal_plan_item_id: item.id, completed: true, completed_at: new Date().toISOString() }];
    setCompletions(updated);

    // Check completion
    const completedCount = updated.filter(c => c.completed).length;
    if (newCompleted && completedCount === items.length && items.length > 0) {
      confetti();
      toast.success("🎉 Todas as refeições do dia concluídas! +50 XP");
      // Update XP
      const { data: stats } = await supabase.from("player_stats").select("*").eq("user_id", user.id).single();
      if (stats) {
        await supabase.from("player_stats").update({
          total_xp: stats.total_xp + 50,
          level: Math.floor((stats.total_xp + 50) / 100) + 1,
        }).eq("user_id", user.id);
      }
    } else if (newCompleted) {
      toast.success("✅ Refeição registrada! +5 XP");
      const { data: stats } = await supabase.from("player_stats").select("*").eq("user_id", user.id).single();
      if (stats) {
        await supabase.from("player_stats").update({
          total_xp: stats.total_xp + 5,
          level: Math.floor((stats.total_xp + 5) / 100) + 1,
        }).eq("user_id", user.id);
      }
    }
  };

  const isItemCompleted = (itemId: string) => {
    return completions.find(c => c.meal_plan_item_id === itemId)?.completed || false;
  };

  const getCompletionTime = (itemId: string) => {
    return completions.find(c => c.meal_plan_item_id === itemId)?.completed_at;
  };

  const completedCount = completions.filter(c => c.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  // Group items by meal type
  const groupedItems = MEAL_TYPES.map(mt => ({
    ...mt,
    items: items.filter(i => i.meal_type === mt.key),
  })).filter(g => g.items.length > 0);

  // Calculate day totals
  const dayTotals = {
    calories: items.reduce((s, i) => s + (i.calories_target || 0), 0),
    protein: items.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
    carbs: items.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0),
    fat: items.reduce((s, i) => s + (Number(i.fat_target) || 0), 0),
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!plan || items.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-12 text-center">
            <Utensils className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhum plano alimentar ativo</h3>
            <p className="text-muted-foreground text-sm">
              Seu nutricionista precisa criar um plano alimentar para você.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Meu Plano Alimentar</h1>
          <p className="text-muted-foreground text-sm">{plan.title}</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {isToday ? "Hoje" : new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
              </span>
              <Badge variant="outline" className="ml-1">{DAYS[dayOfWeek]}</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeDate(1)} disabled={isToday}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        <motion.div
          className="glass rounded-2xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold">Aderência do Dia</span>
            </div>
            <span className="text-lg font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>{completedCount} de {items.length} refeições</span>
            {progress === 100 && items.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 text-primary font-medium"
              >
                <Trophy className="w-3 h-3" /> Dia completo!
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Day Totals */}
        <div className="grid grid-cols-4 gap-2">
          <div className="glass rounded-xl p-3 text-center">
            <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
            <p className="text-xs text-muted-foreground">Calorias</p>
            <p className="font-display font-bold text-sm">{dayTotals.calories}</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <Beef className="w-4 h-4 mx-auto text-red-500 mb-1" />
            <p className="text-xs text-muted-foreground">Proteína</p>
            <p className="font-display font-bold text-sm">{dayTotals.protein.toFixed(0)}g</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <Wheat className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <p className="text-xs text-muted-foreground">Carbs</p>
            <p className="font-display font-bold text-sm">{dayTotals.carbs.toFixed(0)}g</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <Droplets className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-xs text-muted-foreground">Gordura</p>
            <p className="font-display font-bold text-sm">{dayTotals.fat.toFixed(0)}g</p>
          </div>
        </div>

        {/* Meals */}
        <div className="space-y-6">
          {groupedItems.map(({ key, label, icon, time, items: mealItems }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm">{label}</h3>
                    <p className="text-[10px] text-muted-foreground">{time}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {mealItems.filter(i => isItemCompleted(i.id)).length}/{mealItems.length}
                </Badge>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {mealItems.map((item) => {
                    const completed = isItemCompleted(item.id);
                    const completedAt = getCompletionTime(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`glass rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-all ${
                          completed ? "opacity-70 bg-primary/5 border-primary/20" : "hover:border-primary/30"
                        }`}
                        onClick={() => toggleItem(item)}
                      >
                        <motion.div whileTap={{ scale: 0.8 }} className="mt-0.5">
                          {completed ? (
                            <CheckCircle2 className="w-6 h-6 text-primary" />
                          ) : (
                            <Circle className="w-6 h-6 text-muted-foreground" />
                          )}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${completed ? "line-through text-muted-foreground" : ""}`}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                          )}
                          {(item.calories_target || item.protein_target) && (
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                              {item.calories_target && (
                                <span className="flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-orange-400" /> {item.calories_target} kcal
                                </span>
                              )}
                              {item.protein_target && (
                                <span className="flex items-center gap-1">
                                  <Beef className="w-3 h-3 text-red-400" /> {item.protein_target}g prot
                                </span>
                              )}
                              {item.carbs_target && (
                                <span className="flex items-center gap-1">
                                  <Wheat className="w-3 h-3 text-amber-400" /> {item.carbs_target}g carb
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {completed && completedAt && (
                          <span className="text-[10px] text-primary font-medium">
                            ✓ {new Date(completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tip */}
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Marque cada alimento após consumir para acompanhar sua aderência à dieta
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
