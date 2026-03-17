import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import confetti from "@/lib/confetti";
import {
  CheckCircle2, Circle, Calendar, ChevronLeft, ChevronRight,
  Utensils, Coffee, Apple, Cookie, Moon, Sun, Flame,
  Trophy, Beef, Wheat, Droplets, AlertCircle, MinusCircle,
  BarChart3, TrendingUp, CalendarDays, CalendarRange, Star
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { MealDetailModal, type MealDetailData } from "@/components/patient/MealDetailModal";
import { MealDetailProvider, useMealDetail } from "@/components/patient/MealDetailContext";

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
  metadata?: Record<string, any> | null;
}

interface MealCompletion {
  id: string;
  meal_plan_item_id: string;
  completed: boolean;
  completed_at: string | null;
  adherence_status: AdherenceStatus;
  date?: string;
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
const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ADHERENCE_OPTIONS: { status: AdherenceStatus; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { status: "followed", label: "Seguido", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20" },
  { status: "partial", label: "Parcial", icon: <MinusCircle className="w-4 h-4" />, color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" },
  { status: "not_followed", label: "Não seguido", icon: <AlertCircle className="w-4 h-4" />, color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20" },
];

function getWeekDates(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const nd = new Date(d);
    nd.setDate(d.getDate() - day + i);
    dates.push(nd.toISOString().split("T")[0]);
  }
  return dates;
}

function getMotivationalMessage(pct: number): { emoji: string; message: string; color: string } {
  if (pct >= 100) return { emoji: "🏆", message: "Perfeito! Você seguiu 100% do plano hoje! Continue assim!", color: "text-emerald-500" };
  if (pct >= 85) return { emoji: "🔥", message: `Incrível! Você seguiu ${Math.round(pct)}% do plano hoje! Quase perfeito!`, color: "text-emerald-500" };
  if (pct >= 70) return { emoji: "💪", message: `Muito bom! ${Math.round(pct)}% do plano seguido. Continue firme!`, color: "text-primary" };
  if (pct >= 50) return { emoji: "👍", message: `Bom esforço! ${Math.round(pct)}% seguido. Amanhã pode ser melhor!`, color: "text-amber-500" };
  if (pct > 0) return { emoji: "🌱", message: `${Math.round(pct)}% seguido hoje. Cada passo conta, não desista!`, color: "text-amber-500" };
  return { emoji: "⏳", message: "Marque suas refeições para acompanhar sua evolução!", color: "text-muted-foreground" };
}

export default function PatientMealPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [allItems, setAllItems] = useState<MealPlanItem[]>([]);
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [weekCompletions, setWeekCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [selectedMeal, setSelectedMeal] = useState<MealDetailData | null>(null);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];
  const weekDates = getWeekDates(date);

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
      .maybeSingle();

    if (!planData) { setLoading(false); return; }
    setPlan(planData);

    // Fetch ALL items for all days
    const { data: allItemsData } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planData.id)
      .order("created_at");

    setAllItems(allItemsData || []);
    setItems((allItemsData || []).filter(i => i.day_of_week === dayOfWeek));

    // Fetch daily completions
    const { data: completionsData } = await (supabase
      .from("meal_item_completions" as any) as any)
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .eq("date", date);

    setCompletions(completionsData || []);

    // Fetch week completions
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const { data: weekData } = await (supabase
      .from("meal_item_completions" as any) as any)
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);

    setWeekCompletions(weekData || []);
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

  const setAdherence = async (item: MealPlanItem, status: AdherenceStatus, forDate?: string) => {
    if (!user || !plan) return;
    const targetDate = forDate || date;

    const relevantCompletions = forDate
      ? weekCompletions.filter(c => (c as any).date === forDate)
      : completions;

    const existing = relevantCompletions.find(c => c.meal_plan_item_id === item.id);

    if (existing && existing.adherence_status === status) {
      await (supabase.from("meal_item_completions" as any) as any)
        .delete()
        .eq("id", existing.id);
      if (!forDate) setCompletions(completions.filter(c => c.id !== existing.id));
      fetchData();
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
    } else {
      await (supabase.from("meal_item_completions" as any) as any)
        .insert({
          patient_id: user.id,
          meal_plan_item_id: item.id,
          meal_plan_id: plan.id,
          date: targetDate,
          adherence_status: status,
          completed: status === "followed",
          completed_at: new Date().toISOString(),
        });
    }

    if (status === "followed") {
      toast.success("✅ Refeição seguida! Ótimo trabalho!");
    } else if (status === "partial") {
      toast("⚠️ Parcialmente seguida", { description: "Tente seguir 100% na próxima!" });
    }

    fetchData();
  };

  const getItemStatus = (itemId: string, forDate?: string): AdherenceStatus | null => {
    const list = forDate
      ? weekCompletions.filter(c => (c as any).date === forDate)
      : completions;
    const c = list.find(c => c.meal_plan_item_id === itemId);
    return c ? c.adherence_status : null;
  };

  const getCompletionTime = (itemId: string) => {
    return completions.find(c => c.meal_plan_item_id === itemId)?.completed_at;
  };

  // Daily adherence
  const followedCount = completions.filter(c => c.adherence_status === "followed").length;
  const partialCount = completions.filter(c => c.adherence_status === "partial").length;
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

  // Weekly adherence per day
  const getWeekDayAdherence = (dayDate: string, dayIdx: number) => {
    const dayItems = allItems.filter(i => i.day_of_week === dayIdx);
    const dayComps = weekCompletions.filter(c => (c as any).date === dayDate);
    if (dayItems.length === 0) return { pct: 0, total: 0, done: 0 };
    const followed = dayComps.filter(c => c.adherence_status === "followed").length;
    const partial = dayComps.filter(c => c.adherence_status === "partial").length;
    const pct = ((followed * 100 + partial * 50) / (dayItems.length * 100)) * 100;
    return { pct, total: dayItems.length, done: dayComps.length };
  };

  const motivational = getMotivationalMessage(dailyAdherence);
  const allMarked = completions.length >= items.length && items.length > 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!plan || allItems.length === 0) {
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
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Meu Plano Alimentar</h1>
          <p className="text-muted-foreground text-sm">{plan.title}</p>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "daily" | "weekly")} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="daily" className="gap-1.5">
              <CalendarDays className="w-4 h-4" /> Visão Diária
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1.5">
              <CalendarRange className="w-4 h-4" /> Visão Semanal
            </TabsTrigger>
          </TabsList>

          {/* ========== DAILY VIEW ========== */}
          <TabsContent value="daily" className="space-y-5 mt-4">
            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-4">
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
                <span>{completions.length}/{items.length} marcadas</span>
              </div>

              {/* Motivational Message */}
              {(completions.length > 0 || allMarked) && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-3 rounded-xl bg-secondary/50 border border-border/50 text-center`}
                >
                  <p className={`text-sm font-medium ${motivational.color}`}>
                    {motivational.emoji} {motivational.message}
                  </p>
                </motion.div>
              )}

              {dailyAdherence === 100 && items.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-1 text-primary font-medium mt-2 text-xs">
                  <Trophy className="w-3.5 h-3.5" /> Dia perfeito! 🎉
                </motion.div>
              )}
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
                              <div
                                className="flex items-start gap-3 cursor-pointer"
                                onClick={() => setSelectedMeal({ ...mealItem, metadata: (mealItem as any).metadata })}
                              >
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
                💡 Marque cada refeição como <span className="text-emerald-500 font-medium">seguida</span>, <span className="text-amber-500 font-medium">parcial</span> ou <span className="text-red-500 font-medium">não seguida</span>
              </p>
            </div>
          </TabsContent>

          {/* ========== WEEKLY VIEW ========== */}
          <TabsContent value="weekly" className="space-y-5 mt-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 7); setDate(d.toISOString().split("T")[0]); }}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">
                  {new Date(weekDates[0] + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} — {new Date(weekDates[6] + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 7); setDate(d.toISOString().split("T")[0]); }}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Weekly Overview Cards */}
            <div className="grid grid-cols-7 gap-1.5">
              {weekDates.map((wd, idx) => {
                const { pct, total, done } = getWeekDayAdherence(wd, idx);
                const today = wd === new Date().toISOString().split("T")[0];
                return (
                  <motion.button
                    key={wd}
                    onClick={() => { setDate(wd); setViewMode("daily"); }}
                    className={`glass rounded-xl p-2.5 text-center transition-all hover:border-primary/30 ${today ? "ring-2 ring-primary/40" : ""}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <p className="text-[10px] font-semibold text-muted-foreground">{DAYS_SHORT[idx]}</p>
                    <p className="text-xs font-bold mt-0.5">{new Date(wd + "T12:00:00").getDate()}</p>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : pct > 0 ? "bg-red-500" : "bg-muted-foreground/20"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[9px] font-bold mt-1 text-muted-foreground">{Math.round(pct)}%</p>
                    <p className="text-[8px] text-muted-foreground">{done}/{total}</p>
                  </motion.button>
                );
              })}
            </div>

            {/* Weekly Adherence Summary */}
            {(() => {
              const weekTotal = weekDates.reduce((acc, wd, idx) => {
                const dayItems = allItems.filter(i => i.day_of_week === idx);
                return acc + dayItems.length;
              }, 0);
              const weekFollowed = weekCompletions.filter(c => c.adherence_status === "followed").length;
              const weekPartial = weekCompletions.filter(c => c.adherence_status === "partial").length;
              const weekPct = weekTotal > 0 ? ((weekFollowed * 100 + weekPartial * 50) / (weekTotal * 100)) * 100 : 0;

              return (
                <motion.div className="glass rounded-2xl p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      <span className="font-display font-semibold">Aderência Semanal</span>
                    </div>
                    <Badge variant={weekPct >= 70 ? "default" : "destructive"} className="text-sm">
                      {Math.round(weekPct)}%
                    </Badge>
                  </div>
                  <Progress value={weekPct} className="h-3" />
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {weekFollowed}</span>
                      <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-amber-500" /> {weekPartial}</span>
                      <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> {weekCompletions.filter(c => c.adherence_status === "not_followed").length}</span>
                    </div>
                    <span>{weekCompletions.length}/{weekTotal} marcadas</span>
                  </div>
                </motion.div>
              );
            })()}

            {/* Weekly Detailed - Per day, per meal type */}
            <div className="space-y-4">
              {weekDates.map((wd, dayIdx) => {
                const dayItems = allItems.filter(i => i.day_of_week === dayIdx);
                if (dayItems.length === 0) return null;
                const dayComps = weekCompletions.filter(c => (c as any).date === wd);
                const { pct } = getWeekDayAdherence(wd, dayIdx);
                const today = wd === new Date().toISOString().split("T")[0];

                const grouped = MEAL_TYPES.map(mt => ({
                  ...mt,
                  items: dayItems.filter(i => i.meal_type === mt.key),
                })).filter(g => g.items.length > 0);

                return (
                  <motion.div
                    key={wd}
                    className={`glass rounded-2xl overflow-hidden ${today ? "ring-1 ring-primary/30" : ""}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dayIdx * 0.05 }}
                  >
                    <div className="flex items-center justify-between p-4 bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm">{DAYS[dayIdx]}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(wd + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                        </span>
                        {today && <Badge variant="default" className="text-[9px] h-5">Hoje</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{Math.round(pct)}%</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {grouped.map(({ key, label, icon, items: mealItems }) => (
                        <div key={key}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-primary">{icon}</span>
                            <span className="text-xs font-semibold">{label}</span>
                          </div>
                          <div className="space-y-1 pl-7">
                            {mealItems.map(item => {
                              const status = getItemStatus(item.id, wd);
                              return (
                                <div key={item.id} className="flex items-center gap-2">
                                  <button
                                    onClick={() => setAdherence(item, status === "followed" ? "followed" : "followed", wd)}
                                    className="shrink-0"
                                  >
                                    {status === "followed"
                                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      : status === "partial"
                                      ? <MinusCircle className="w-4 h-4 text-amber-500" />
                                      : status === "not_followed"
                                      ? <AlertCircle className="w-4 h-4 text-red-500" />
                                      : <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                                    }
                                  </button>
                                  <span
                                    className={`text-xs flex-1 cursor-pointer hover:text-primary transition-colors ${status === "followed" ? "line-through text-muted-foreground" : ""}`}
                                    onClick={() => setSelectedMeal({ ...item, metadata: item.metadata })}
                                  >
                                    {item.title}
                                  </span>
                                  {!status && (
                                    <div className="flex gap-0.5">
                                      {ADHERENCE_OPTIONS.map(opt => (
                                        <button
                                          key={opt.status}
                                          onClick={() => setAdherence(item, opt.status, wd)}
                                          className={`p-1 rounded transition-all ${opt.color} opacity-40 hover:opacity-100`}
                                          title={opt.label}
                                        >
                                          {opt.icon}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {status && (
                                    <div className="flex gap-0.5">
                                      {ADHERENCE_OPTIONS.map(opt => (
                                        <button
                                          key={opt.status}
                                          onClick={() => setAdherence(item, opt.status, wd)}
                                          className={`p-0.5 rounded transition-all ${status === opt.status ? `${opt.color} opacity-100` : "opacity-20 hover:opacity-60"}`}
                                          title={opt.label}
                                        >
                                          {React.cloneElement(opt.icon as React.ReactElement, { className: "w-3 h-3" })}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Meal Detail Modal */}
        <MealDetailModal
          open={!!selectedMeal}
          onOpenChange={(open) => { if (!open) setSelectedMeal(null); }}
          meal={selectedMeal}
        />
      </div>
    </DashboardLayout>
  );
}
