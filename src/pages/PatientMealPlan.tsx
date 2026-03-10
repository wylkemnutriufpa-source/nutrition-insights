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
  Utensils, Coffee, Apple, Cookie, Moon, Sun, Flame,
  Trophy, Beef, Wheat, Droplets, AlertCircle, MinusCircle,
  BarChart3, TrendingUp
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MealType = Database["public"]["Enums"]["meal_type"];
type AdherenceStatus = "followed" | "partial" | "not_followed";

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
  adherence_status: AdherenceStatus;
}

interface MealPlan {
  id: string;
  title: string;
  start_date: string;
}

interface WeeklyMetrics {
  total: number;
  followed: number;
  partial: number;
  not_followed: number;
  unmarked: number;
  byMealType: Record<string, { total: number; followed: number; partial: number; not_followed: number }>;
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

const ADHERENCE_OPTIONS: { status: AdherenceStatus; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { status: "followed", label: "Seguido", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20" },
  { status: "partial", label: "Parcial", icon: <MinusCircle className="w-4 h-4" />, color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" },
  { status: "not_followed", label: "Não seguido", icon: <AlertCircle className="w-4 h-4" />, color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20" },
];

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
}

export default function PatientMealPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: planData } = await supabase
      .from("meal_plans")
      .select("id, title, start_date")
      .eq("patient_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!planData) { setLoading(false); return; }
    setPlan(planData);

    const { data: itemsData } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planData.id)
      .eq("day_of_week", dayOfWeek)
      .order("created_at");

    setItems(itemsData || []);

    const { data: completionsData } = await (supabase
      .from("meal_item_completions" as any) as any)
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .eq("date", date);

    setCompletions(completionsData || []);

    // Fetch weekly metrics
    const week = getWeekRange(date);
    const { data: weekCompletions } = await (supabase
      .from("meal_item_completions" as any) as any)
      .select("*, meal_plan_items!meal_item_completions_meal_plan_item_id_fkey(meal_type)")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .gte("date", week.start)
      .lte("date", week.end);

    // Get all items for all days of week to calculate total expected
    const { data: allItems } = await supabase
      .from("meal_plan_items")
      .select("id, meal_type, day_of_week")
      .eq("meal_plan_id", planData.id);

    if (allItems) {
      const totalExpected = allItems.length; // per week (items per day * 7 approx)
      const wc = weekCompletions || [];
      const metrics: WeeklyMetrics = {
        total: totalExpected,
        followed: wc.filter((c: any) => c.adherence_status === "followed").length,
        partial: wc.filter((c: any) => c.adherence_status === "partial").length,
        not_followed: wc.filter((c: any) => c.adherence_status === "not_followed").length,
        unmarked: totalExpected - wc.length,
        byMealType: {},
      };

      MEAL_TYPES.forEach(mt => {
        const typeItems = wc.filter((c: any) => c.meal_plan_items?.meal_type === mt.key);
        const typeTotal = allItems.filter(i => i.meal_type === mt.key).length;
        metrics.byMealType[mt.key] = {
          total: typeTotal,
          followed: typeItems.filter((c: any) => c.adherence_status === "followed").length,
          partial: typeItems.filter((c: any) => c.adherence_status === "partial").length,
          not_followed: typeItems.filter((c: any) => c.adherence_status === "not_followed").length,
        };
      });
      setWeeklyMetrics(metrics);
    }

    setLoading(false);
  }, [user, date, dayOfWeek]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user || !plan) return;
    const channel = supabase
      .channel("meal-completions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_item_completions", filter: `patient_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, plan, fetchData]);

  const setAdherence = async (item: MealPlanItem, status: AdherenceStatus) => {
    if (!user || !plan) return;

    const existing = completions.find(c => c.meal_plan_item_id === item.id);

    // If clicking the same status, remove it
    if (existing && existing.adherence_status === status) {
      await (supabase.from("meal_item_completions" as any) as any)
        .delete()
        .eq("id", existing.id);
      setCompletions(completions.filter(c => c.id !== existing.id));
      return;
    }

    if (existing) {
      await (supabase.from("meal_item_completions" as any) as any)
        .update({
          adherence_status: status,
          completed: status === "followed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      setCompletions(completions.map(c => c.id === existing.id
        ? { ...c, adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString() }
        : c));
    } else {
      const newId = crypto.randomUUID();
      await (supabase.from("meal_item_completions" as any) as any)
        .insert({
          patient_id: user.id,
          meal_plan_item_id: item.id,
          meal_plan_id: plan.id,
          date,
          adherence_status: status,
          completed: status === "followed",
          completed_at: new Date().toISOString(),
        });
      setCompletions([...completions, { id: newId, meal_plan_item_id: item.id, adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString() }]);
    }

    if (status === "followed") {
      toast.success("✅ Refeição seguida! +5 XP");
    } else if (status === "partial") {
      toast("⚠️ Parcialmente seguida", { description: "Tente seguir 100% na próxima!" });
    }

    // Check all completed
    const updatedCompletions = existing
      ? completions.map(c => c.meal_plan_item_id === item.id ? { ...c, adherence_status: status } : c)
      : [...completions, { id: "", meal_plan_item_id: item.id, adherence_status: status, completed: status === "followed", completed_at: "" }];

    if (updatedCompletions.length === items.length && items.length > 0) {
      const allFollowed = updatedCompletions.every(c => c.adherence_status === "followed");
      if (allFollowed) {
        confetti();
        toast.success("🎉 Todas as refeições seguidas! +50 XP");
      }
    }
  };

  const getItemStatus = (itemId: string): AdherenceStatus | null => {
    const c = completions.find(c => c.meal_plan_item_id === itemId);
    return c ? c.adherence_status : null;
  };

  const getCompletionTime = (itemId: string) => {
    return completions.find(c => c.meal_plan_item_id === itemId)?.completed_at;
  };

  // Calculate daily adherence
  const markedCount = completions.length;
  const followedCount = completions.filter(c => c.adherence_status === "followed").length;
  const partialCount = completions.filter(c => c.adherence_status === "partial").length;
  // Weighted: followed=100%, partial=50%, not_followed=0%
  const dailyAdherence = items.length > 0
    ? ((followedCount * 100 + partialCount * 50) / (items.length * 100)) * 100
    : 0;

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  const groupedItems = MEAL_TYPES.map(mt => ({
    ...mt,
    items: items.filter(i => i.meal_type === mt.key),
  })).filter(g => g.items.length > 0);

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

  const weekAdherence = weeklyMetrics
    ? weeklyMetrics.total > 0
      ? Math.round(((weeklyMetrics.followed * 100 + weeklyMetrics.partial * 50) / (weeklyMetrics.total * 100)) * 100)
      : 0
    : 0;

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

        {/* Daily Adherence Card */}
        <motion.div className="glass rounded-2xl p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold">Aderência do Dia</span>
            </div>
            <span className="text-lg font-bold text-primary">{Math.round(dailyAdherence)}%</span>
          </div>
          <Progress value={dailyAdherence} className="h-3" />
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {followedCount}</span>
              <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-amber-500" /> {partialCount}</span>
              <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> {completions.filter(c => c.adherence_status === "not_followed").length}</span>
            </div>
            <span>{markedCount}/{items.length} marcadas</span>
          </div>
          {dailyAdherence === 100 && items.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-1 text-primary font-medium mt-2 text-xs">
              <Trophy className="w-3.5 h-3.5" /> Dia perfeito!
            </motion.div>
          )}
        </motion.div>

        {/* Weekly Metrics Toggle */}
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowMetrics(!showMetrics)}>
          <BarChart3 className="w-4 h-4 mr-2" />
          {showMetrics ? "Ocultar métricas semanais" : "Ver métricas semanais"}
          <TrendingUp className="w-4 h-4 ml-2" />
        </Button>

        <AnimatePresence>
          {showMetrics && weeklyMetrics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-sm">Aderência Semanal</span>
                  <Badge variant={weekAdherence >= 70 ? "default" : "destructive"}>{weekAdherence}%</Badge>
                </div>

                {/* Overall bars */}
                <div className="space-y-2">
                  <MetricBar label="Seguido" count={weeklyMetrics.followed} total={weeklyMetrics.total} color="bg-emerald-500" />
                  <MetricBar label="Parcial" count={weeklyMetrics.partial} total={weeklyMetrics.total} color="bg-amber-500" />
                  <MetricBar label="Não seguido" count={weeklyMetrics.not_followed} total={weeklyMetrics.total} color="bg-red-500" />
                  <MetricBar label="Não marcado" count={weeklyMetrics.unmarked} total={weeklyMetrics.total} color="bg-muted-foreground/30" />
                </div>

                {/* By meal type */}
                <div className="border-t border-border/50 pt-3">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Por tipo de refeição</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MEAL_TYPES.map(mt => {
                      const m = weeklyMetrics.byMealType[mt.key];
                      if (!m || m.total === 0) return null;
                      const pct = m.total > 0 ? Math.round(((m.followed * 100 + m.partial * 50) / (m.total * 100)) * 100) : 0;
                      return (
                        <div key={mt.key} className="glass rounded-lg p-2 flex items-center gap-2">
                          <div className="text-primary">{mt.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] truncate">{mt.label}</p>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Meals with 3-level adherence */}
        <div className="space-y-6">
          {groupedItems.map(({ key, label, icon, time, items: mealItems }) => {
            const mealFollowed = mealItems.filter(i => getItemStatus(i.id) === "followed").length;
            const mealPartial = mealItems.filter(i => getItemStatus(i.id) === "partial").length;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
                    <div>
                      <h3 className="font-display font-semibold text-sm">{label}</h3>
                      <p className="text-[10px] text-muted-foreground">{time}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {mealFollowed > 0 && <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px]">{mealFollowed}✓</Badge>}
                    {mealPartial > 0 && <Badge className="bg-amber-500/20 text-amber-600 text-[10px]">{mealPartial}~</Badge>}
                  </div>
                </div>

                <div className="space-y-2">
                  <AnimatePresence>
                    {mealItems.map((mealItem) => {
                      const status = getItemStatus(mealItem.id);
                      const completedAt = getCompletionTime(mealItem.id);
                      const statusColor = status === "followed" ? "border-emerald-500/30 bg-emerald-500/5"
                        : status === "partial" ? "border-amber-500/30 bg-amber-500/5"
                        : status === "not_followed" ? "border-red-500/30 bg-red-500/5"
                        : "";

                      return (
                        <motion.div
                          key={mealItem.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`glass rounded-xl p-4 transition-all ${statusColor}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {status === "followed" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                : status === "partial" ? <MinusCircle className="w-5 h-5 text-amber-500" />
                                : status === "not_followed" ? <AlertCircle className="w-5 h-5 text-red-500" />
                                : <Circle className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${status === "followed" ? "line-through text-muted-foreground" : ""}`}>
                                {mealItem.title}
                              </p>
                              {mealItem.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mealItem.description}</p>
                              )}
                              {(mealItem.calories_target || mealItem.protein_target) && (
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                  {mealItem.calories_target && <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {mealItem.calories_target} kcal</span>}
                                  {mealItem.protein_target && <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-red-400" /> {mealItem.protein_target}g</span>}
                                  {mealItem.carbs_target && <span className="flex items-center gap-1"><Wheat className="w-3 h-3 text-amber-400" /> {mealItem.carbs_target}g</span>}
                                </div>
                              )}

                              {/* Adherence buttons */}
                              <div className="flex gap-1.5 mt-3">
                                {ADHERENCE_OPTIONS.map(opt => (
                                  <button
                                    key={opt.status}
                                    onClick={() => setAdherence(mealItem, opt.status)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                                      status === opt.status
                                        ? `${opt.bgColor} ${opt.color} ring-1 ring-current`
                                        : "border-border/50 text-muted-foreground hover:border-border"
                                    }`}
                                  >
                                    {opt.icon}
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {completedAt && status && (
                              <span className={`text-[10px] font-medium ${
                                status === "followed" ? "text-emerald-500" : status === "partial" ? "text-amber-500" : "text-red-500"
                              }`}>
                                {new Date(completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom tip */}
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Marque cada refeição como <span className="text-emerald-500 font-medium">seguida</span>, <span className="text-amber-500 font-medium">parcial</span> ou <span className="text-red-500 font-medium">não seguida</span> para acompanhar sua aderência
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-24">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold w-8 text-right">{count}</span>
    </div>
  );
}
