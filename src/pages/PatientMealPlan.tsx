import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import confetti from "@/lib/confetti";
import {
  Utensils, Flame, Zap, Eye, Timer,
  CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Star,
  CheckCircle2, MinusCircle, AlertCircle, Circle, FileDown
} from "lucide-react";
import { generatePremiumMealPlanPDF } from "@/lib/pdfExportPremium";
import { MealDetailModal } from "@/components/patient/MealDetailModal";
import MealSubstitutionModal from "@/components/patient/MealSubstitutionModal";
import type { FoodItem } from "@/components/meals/FoodAutocomplete";
import {
  MacroSummary, AdherenceCard, DateNavigator, MealGroup,
  MEAL_TYPES, DAYS,
  type MealPlanItem, type MealCompletion, type AdherenceStatus, type MealDetailData,
} from "@/components/patient/MealPlanDailyView";

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface MealPlan {
  id: string;
  title: string;
  start_date: string;
}

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

function XPPopup({ show, points }: { show: boolean; points: number }) {
  if (!show) return null;
  return (
    <motion.div
      className="fixed top-20 right-6 z-50 pointer-events-none"
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 backdrop-blur-sm">
        <Zap className="w-5 h-5" />
        <span className="font-display font-bold text-lg">+{points} XP</span>
      </div>
    </motion.div>
  );
}

function StreakBadge({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-500"
    >
      <Flame className="w-3.5 h-3.5" />
      <span className="text-xs font-bold">{count} seguidas!</span>
    </motion.div>
  );
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
  const [substitutionItem, setSubstitutionItem] = useState<MealPlanItem | null>(null);
  const [activeSubstitutions, setActiveSubstitutions] = useState<Record<string, { foodName: string; originalTitle: string }>>({});
  const [focusMode, setFocusMode] = useState(false);
  const [xpPopup, setXpPopup] = useState<{ show: boolean; points: number }>({ show: false, points: 0 });
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const xpTimerRef = useRef<number | null>(null);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];
  const weekDates = useMemo(() => getWeekDates(date), [date]);

  const journeyDay = plan ? Math.max(1, Math.ceil((new Date().getTime() - new Date(plan.start_date).getTime()) / 86400000)) : 1;
  const followedStreak = completions.filter(c => c.adherence_status === "followed").length;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: planData } = await supabase
      .from("meal_plans")
      .select("id, title, start_date")
      .eq("patient_id", user.id)
      .eq("is_active", true)
      .eq("plan_status", "published_to_patient")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!planData) { setLoading(false); return; }
    setPlan(planData);

    const { data: allItemsData } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planData.id)
      .order("created_at");

    setAllItems(allItemsData || []);
    setItems((allItemsData || []).filter(i => i.day_of_week === dayOfWeek));

    // Fetch active substitutions for this plan
    const { data: subsData } = await supabase
      .from("patient_meal_substitutions" as any)
      .select("meal_plan_item_id, original_food, substituted_food")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .order("created_at", { ascending: false });

    if (subsData && subsData.length > 0) {
      const subsMap: Record<string, { foodName: string; originalTitle: string }> = {};
      for (const s of subsData as any[]) {
        // Keep only the latest substitution per item
        if (!subsMap[s.meal_plan_item_id]) {
          subsMap[s.meal_plan_item_id] = { foodName: s.substituted_food, originalTitle: s.original_food };
        }
      }
      setActiveSubstitutions(subsMap);
    } else {
      setActiveSubstitutions({});
    }

    const { data: completionsData } = await supabase
      .from("meal_item_completions")
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .eq("date", date);

    setCompletions((completionsData || []) as unknown as MealCompletion[]);

    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const { data: weekData } = await supabase
      .from("meal_item_completions")
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);

    setWeekCompletions((weekData || []) as unknown as MealCompletion[]);
    setLoading(false);
  }, [user, date, dayOfWeek, weekDates]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user || !plan) return;
    const channel = supabase
      .channel("meal-completions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_item_completions", filter: `patient_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, plan, fetchData]);

  const setAdherence = useCallback(async (item: MealPlanItem, status: AdherenceStatus, forDate?: string) => {
    if (!user || !plan) return;
    const targetDate = forDate || date;

    const targetDateObj = new Date(targetDate + "T23:59:59");
    const now = new Date();
    const hoursDiff = (now.getTime() - targetDateObj.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      toast.error("⏰ Prazo expirado! Só é possível editar refeições até 24h após o dia.");
      return;
    }
    const todayStr = now.toISOString().split("T")[0];
    if (targetDate > todayStr) {
      toast.error("📅 Não é possível marcar refeições de dias futuros.");
      return;
    }

    const relevantCompletions = forDate
      ? weekCompletions.filter(c => (c as any).date === forDate)
      : completions;

    const existing = relevantCompletions.find(c => c.meal_plan_item_id === item.id);

    if (existing && existing.adherence_status === status) {
      await supabase.from("meal_item_completions").delete().eq("id", existing.id);
      if (!forDate) setCompletions(prev => prev.filter(c => c.id !== existing.id));
      fetchData();
      return;
    }

    if (existing) {
      await supabase.from("meal_item_completions").update({
        adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("meal_item_completions").insert({
        patient_id: user.id, meal_plan_item_id: item.id, meal_plan_id: plan.id,
        date: targetDate, adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString(),
      });
    }

    if (status === "followed") {
      if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
      setJustCompleted(item.id);
      setXpPopup({ show: true, points: 10 });
      xpTimerRef.current = window.setTimeout(() => {
        setXpPopup({ show: false, points: 0 });
        setJustCompleted(null);
      }, 2000);

      const newFollowedCount = completions.filter(c => c.adherence_status === "followed").length + 1;
      if (newFollowedCount >= items.length) {
        confetti();
        toast.success("🏆 Dia perfeito! Todas as refeições seguidas!");
      } else {
        toast.success("✅ Refeição seguida! +10 XP");
      }
    } else if (status === "partial") {
      toast("⚠️ Parcialmente seguida", { description: "Tente seguir 100% na próxima!" });
    }

    fetchData();
  }, [user, plan, date, completions, weekCompletions, items, fetchData]);

  const changeDate = useCallback((offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  }, [date]);

  // Apply substitution overlays to displayed items (without mutating plan data)
  const overlayedItems = useMemo(() =>
    items.map(item => {
      const sub = activeSubstitutions[item.id];
      if (!sub) return item;
      return {
        ...item,
        title: `${sub.foodName}`,
        description: `Substituição de: ${sub.originalTitle}${item.description ? ` • ${item.description}` : ""}`,
      };
    }),
  [items, activeSubstitutions]);

  // Memoized grouped items
  const groupedItems = useMemo(() =>
    MEAL_TYPES.map(mt => ({
      ...mt,
      items: overlayedItems.filter(i => i.meal_type === mt.key),
    })).filter(g => g.items.length > 0),
  [overlayedItems]);

  // Memoized daily adherence
  const { followedCount, partialCount, notFollowedCount, dailyAdherence, allMarked } = useMemo(() => {
    const followed = completions.filter(c => c.adherence_status === "followed").length;
    const partial = completions.filter(c => c.adherence_status === "partial").length;
    const notFollowed = completions.filter(c => c.adherence_status === "not_followed").length;
    const adherence = items.length > 0 ? ((followed * 100 + partial * 50) / (items.length * 100)) * 100 : 0;
    return { followedCount: followed, partialCount: partial, notFollowedCount: notFollowed, dailyAdherence: adherence, allMarked: completions.length >= items.length && items.length > 0 };
  }, [completions, items]);

  const getWeekDayAdherence = useCallback((dayDate: string, dayIdx: number) => {
    const dayItems = allItems.filter(i => i.day_of_week === dayIdx);
    const dayComps = weekCompletions.filter(c => (c as any).date === dayDate);
    if (dayItems.length === 0) return { pct: 0, total: 0, done: 0 };
    const followed = dayComps.filter(c => c.adherence_status === "followed").length;
    const partial = dayComps.filter(c => c.adherence_status === "partial").length;
    const pct = ((followed * 100 + partial * 50) / (dayItems.length * 100)) * 100;
    return { pct, total: dayItems.length, done: dayComps.length };
  }, [allItems, weekCompletions]);

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
            <p className="text-muted-foreground text-sm">Seu nutricionista precisa criar um plano alimentar para você.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={`max-w-2xl mx-auto space-y-5 transition-all duration-500 ${focusMode ? "pt-2" : ""}`}>
        <AnimatePresence>
          {xpPopup.show && <XPPopup show={xpPopup.show} points={xpPopup.points} />}
        </AnimatePresence>

        {focusMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-10 pointer-events-none" />
        )}

        <div className={`relative ${focusMode ? "z-20" : ""}`}>
          {/* Header */}
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Meu Plano Alimentar</h1>
            <p className="text-muted-foreground text-sm">{plan.title}</p>
          </div>

          {/* Journey Timeline */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Timer className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">Dia {journeyDay} da Jornada</span>
              </div>
              <StreakBadge count={followedStreak} />
            </div>
            <Button
              variant={focusMode ? "default" : "outline"}
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className="gap-1.5 text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              {focusMode ? "Sair do foco" : "Modo foco"}
            </Button>
          </div>

          {/* Emotional State */}
          {isToday && dailyAdherence > 0 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 text-center"
            >
              <p className="text-xs text-muted-foreground">
                {dailyAdherence >= 80 ? "✨ Seu corpo já está respondendo. Continue nesse ritmo!"
                  : dailyAdherence >= 50 ? "💪 Bom progresso! Cada refeição seguida faz diferença."
                  : "🌱 O primeiro passo é o mais importante. Siga em frente!"}
              </p>
            </motion.div>
          )}

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "daily" | "weekly")} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="daily" className="gap-1.5"><CalendarDays className="w-4 h-4" /> Visão Diária</TabsTrigger>
              <TabsTrigger value="weekly" className="gap-1.5"><CalendarRange className="w-4 h-4" /> Visão Semanal</TabsTrigger>
            </TabsList>

            {/* DAILY VIEW */}
            <TabsContent value="daily" className="space-y-5 mt-4">
              <DateNavigator date={date} dayOfWeek={dayOfWeek} isToday={isToday} onChangeDate={changeDate} />

              <AdherenceCard
                dailyAdherence={dailyAdherence}
                followedCount={followedCount}
                partialCount={partialCount}
                notFollowedCount={notFollowedCount}
                completionsCount={completions.length}
                totalItems={items.length}
                allMarked={allMarked}
              />

              <MacroSummary items={items} />

              <div className="space-y-6">
                {groupedItems.map(({ key, label, icon, time, items: mealItems }) => (
                  <MealGroup
                    key={key}
                    mealType={{ key, label, icon, time }}
                    items={mealItems}
                    completions={completions}
                    justCompleted={justCompleted}
                    focusMode={focusMode}
                    onSetAdherence={setAdherence}
                    onOpenDetail={setSelectedMeal}
                    onOpenSubstitution={setSubstitutionItem}
                  />
                ))}
              </div>

              <div className="glass rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  💡 Marque cada refeição como <span className="text-emerald-500 font-medium">seguida</span>, <span className="text-amber-500 font-medium">parcial</span> ou <span className="text-red-500 font-medium">não seguida</span>
                </p>
              </div>
            </TabsContent>

            {/* WEEKLY VIEW */}
            <TabsContent value="weekly" className="space-y-5 mt-4">
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

              {/* Weekly Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {weekDates.map((wd, idx) => {
                  const { pct, total, done } = getWeekDayAdherence(wd, idx);
                  const today = wd === new Date().toISOString().split("T")[0];
                  return (
                    <motion.button key={wd} onClick={() => { setDate(wd); setViewMode("daily"); }}
                      className={`glass rounded-xl p-2.5 text-center transition-all hover:border-primary/30 ${today ? "ring-2 ring-primary/40" : ""}`}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    >
                      <p className="text-[10px] font-semibold text-muted-foreground">{DAYS_SHORT[idx]}</p>
                      <p className="text-xs font-bold mt-0.5">{new Date(wd + "T12:00:00").getDate()}</p>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                        <div className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : pct > 0 ? "bg-red-500" : "bg-muted-foreground/20"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[9px] font-bold mt-1 text-muted-foreground">{Math.round(pct)}%</p>
                      <p className="text-[8px] text-muted-foreground">{done}/{total}</p>
                    </motion.button>
                  );
                })}
              </div>

              {/* Weekly Summary */}
              {(() => {
                const weekTotal = weekDates.reduce((acc, _wd, idx) => {
                  return acc + allItems.filter(i => i.day_of_week === idx).length;
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
                      <Badge variant={weekPct >= 70 ? "default" : "destructive"} className="text-sm">{Math.round(weekPct)}%</Badge>
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

              {/* Weekly Detailed */}
              <div className="space-y-4">
                {weekDates.map((wd, dayIdx) => {
                  const dayItems = allItems.filter(i => i.day_of_week === dayIdx);
                  if (dayItems.length === 0) return null;
                  const { pct } = getWeekDayAdherence(wd, dayIdx);
                  const today = wd === new Date().toISOString().split("T")[0];

                  const grouped = MEAL_TYPES.map(mt => ({
                    ...mt,
                    items: dayItems.filter(i => i.meal_type === mt.key),
                  })).filter(g => g.items.length > 0);

                  return (
                    <motion.div key={wd}
                      className={`glass rounded-2xl overflow-hidden ${today ? "ring-1 ring-primary/30" : ""}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
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
                            <div className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${pct}%` }} />
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
                                const dayComps = weekCompletions.filter(c => (c as any).date === wd);
                                const comp = dayComps.find(c => c.meal_plan_item_id === item.id);
                                const status = comp?.adherence_status || null;
                                return (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <button onClick={() => setAdherence(item, "followed", wd)} className="shrink-0">
                                      {status === "followed" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        : status === "partial" ? <MinusCircle className="w-4 h-4 text-amber-500" />
                                        : status === "not_followed" ? <AlertCircle className="w-4 h-4 text-red-500" />
                                        : <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />}
                                    </button>
                                    <span className={`text-xs flex-1 cursor-pointer hover:text-primary transition-colors ${status === "followed" ? "line-through text-muted-foreground" : ""}`}
                                      onClick={() => setSelectedMeal({ ...item, metadata: item.metadata })}
                                    >
                                      {item.title}
                                    </span>
                                    <div className="flex gap-0.5">
                                      {[
                                        { s: "followed" as const, icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-500" },
                                        { s: "partial" as const, icon: <MinusCircle className="w-3 h-3" />, color: "text-amber-500" },
                                        { s: "not_followed" as const, icon: <AlertCircle className="w-3 h-3" />, color: "text-red-500" },
                                      ].map(opt => (
                                        <button key={opt.s} onClick={() => setAdherence(item, opt.s, wd)}
                                          className={`p-0.5 rounded transition-all ${status === opt.s ? `${opt.color} opacity-100` : "opacity-20 hover:opacity-60"}`}
                                          title={opt.s}
                                        >
                                          {opt.icon}
                                        </button>
                                      ))}
                                    </div>
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

          <MealDetailModal
            open={!!selectedMeal}
            onOpenChange={(open) => { if (!open) setSelectedMeal(null); }}
            meal={selectedMeal}
          />

          <MealSubstitutionModal
            open={!!substitutionItem}
            onOpenChange={(open) => { if (!open) setSubstitutionItem(null); }}
            mealTitle={substitutionItem ? (items.find(i => i.id === substitutionItem.id)?.title || substitutionItem.title) : ""}
            mealPlanItemId={substitutionItem?.id || ""}
            mealPlanId={plan?.id || ""}
            patientId={user?.id || ""}
            onSubstitute={(food: FoodItem, originalTitle: string) => {
              // Update overlay map — plan data stays untouched
              if (substitutionItem) {
                setActiveSubstitutions(prev => ({
                  ...prev,
                  [substitutionItem.id]: { foodName: food.name, originalTitle },
                }));
              }
              setSubstitutionItem(null);
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
