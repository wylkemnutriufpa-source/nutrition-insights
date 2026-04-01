/**
 * Inline daily meal plan for basic-mode patient dashboard.
 * Shows today's meals directly without navigating to /my-diet.
 * Includes toggle to view weekly plan.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Utensils, CheckCircle2, MinusCircle, AlertCircle, Circle,
  CalendarRange, ChevronLeft, ChevronRight, Smartphone,
  Flame, Timer, Star, ArrowRight,
} from "lucide-react";
import {
  MacroSummary, AdherenceCard, DateNavigator, MealGroup,
  MEAL_TYPES, DAYS,
  type MealPlanItem, type MealCompletion, type AdherenceStatus,
} from "@/components/patient/MealPlanDailyView";
import { MealDetailModal } from "@/components/patient/MealDetailModal";
import type { MealDetailData } from "@/components/patient/MealPlanDailyView";

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

function RotatePhoneHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 mb-4"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Smartphone className="w-5 h-5 text-primary rotate-90" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Melhor visualização</p>
        <p className="text-[11px] text-muted-foreground">Para ver o plano semanal completo, vire o celular na horizontal 📱</p>
      </div>
      <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 flex-shrink-0" onClick={onDismiss}>
        Entendi
      </Button>
    </motion.div>
  );
}

export default function DailyMealPlanInline() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [allItems, setAllItems] = useState<MealPlanItem[]>([]);
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [weekCompletions, setWeekCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showWeekly, setShowWeekly] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<MealDetailData | null>(null);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];
  const weekDates = useMemo(() => getWeekDates(date), [date]);

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

    const { data: completionsData } = await supabase
      .from("meal_item_completions")
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .eq("date", date);

    setCompletions((completionsData || []) as unknown as MealCompletion[]);

    const weekStart = getWeekDates(date)[0];
    const weekEnd = getWeekDates(date)[6];
    const { data: weekData } = await supabase
      .from("meal_item_completions")
      .select("*")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);

    setWeekCompletions((weekData || []) as unknown as MealCompletion[]);
    setLoading(false);
  }, [user, date, dayOfWeek]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setAdherence = useCallback(async (item: MealPlanItem, status: AdherenceStatus, forDate?: string) => {
    if (!user || !plan) return;
    const targetDate = forDate || date;

    const targetDateObj = new Date(targetDate + "T23:59:59");
    const now = new Date();
    const hoursDiff = (now.getTime() - targetDateObj.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      toast.error("⏰ Prazo expirado!");
      return;
    }
    if (targetDate > now.toISOString().split("T")[0]) {
      toast.error("📅 Não é possível marcar dias futuros.");
      return;
    }

    const relevantCompletions = forDate
      ? weekCompletions.filter(c => (c as any).date === forDate)
      : completions;
    const existing = relevantCompletions.find(c => c.meal_plan_item_id === item.id);

    if (existing && existing.adherence_status === status) {
      await supabase.from("meal_item_completions").delete().eq("id", existing.id);
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
      toast.success("✅ Refeição seguida! +10 XP");
    }
    fetchData();
  }, [user, plan, date, completions, weekCompletions, fetchData]);

  const changeDate = useCallback((offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  }, [date]);

  const groupedItems = useMemo(() =>
    MEAL_TYPES.map(mt => ({
      ...mt,
      items: items.filter(i => i.meal_type === mt.key),
    })).filter(g => g.items.length > 0),
  [items]);

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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No plan
  if (!plan || allItems.length === 0) {
    return (
      <Card className="p-8 text-center border-border/50">
        <Utensils className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold text-base mb-1">Nenhum plano alimentar ativo</h3>
        <p className="text-sm text-muted-foreground">Seu nutricionista precisa criar um plano para você.</p>
      </Card>
    );
  }

  // ─── WEEKLY VIEW ───
  if (showWeekly) {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setShowWeekly(false)}>
            <ChevronLeft className="w-4 h-4" /> Voltar ao dia
          </Button>
          <h3 className="font-display font-bold text-base">Plano Semanal</h3>
          <div className="w-20" />
        </div>

        <AnimatePresence>
          {isMobile && showRotateHint && (
            <RotatePhoneHint onDismiss={() => setShowRotateHint(false)} />
          )}
        </AnimatePresence>

        {/* Week nav */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 7); setDate(d.toISOString().split("T")[0]); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {new Date(weekDates[0] + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} — {new Date(weekDates[6] + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 7); setDate(d.toISOString().split("T")[0]); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDates.map((wd, idx) => {
            const { pct, total, done } = getWeekDayAdherence(wd, idx);
            const today = wd === new Date().toISOString().split("T")[0];
            return (
              <motion.button key={wd} onClick={() => { setDate(wd); setShowWeekly(false); }}
                className={`rounded-xl border border-border/50 bg-card p-2.5 text-center transition-all hover:border-primary/30 ${today ? "ring-2 ring-primary/40" : ""}`}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              >
                <p className="text-[10px] font-semibold text-muted-foreground">{DAYS_SHORT[idx]}</p>
                <p className="text-xs font-bold mt-0.5">{new Date(wd + "T12:00:00").getDate()}</p>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : pct > 0 ? "bg-red-500" : "bg-muted-foreground/20"}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[9px] font-bold mt-1 text-muted-foreground">{Math.round(pct)}%</p>
              </motion.button>
            );
          })}
        </div>

        {/* Weekly summary */}
        {(() => {
          const weekTotal = weekDates.reduce((acc, _wd, idx) => acc + allItems.filter(i => i.day_of_week === idx).length, 0);
          const weekFollowed = weekCompletions.filter(c => c.adherence_status === "followed").length;
          const weekPartial = weekCompletions.filter(c => c.adherence_status === "partial").length;
          const weekPct = weekTotal > 0 ? ((weekFollowed * 100 + weekPartial * 50) / (weekTotal * 100)) * 100 : 0;
          return (
            <Card className="p-4 border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Aderência Semanal</span>
                </div>
                <Badge variant={weekPct >= 70 ? "default" : "destructive"} className="text-xs">{Math.round(weekPct)}%</Badge>
              </div>
              <Progress value={weekPct} className="h-2.5" />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {weekFollowed}</span>
                  <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-amber-500" /> {weekPartial}</span>
                </div>
                <span>{weekCompletions.length}/{weekTotal} marcadas</span>
              </div>
            </Card>
          );
        })()}

        {/* Day details */}
        <div className="space-y-3">
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
              <Card key={wd} className={`overflow-hidden border-border/50 ${today ? "ring-1 ring-primary/30" : ""}`}>
                <div className="flex items-center justify-between p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{DAYS[dayIdx]}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(wd + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    </span>
                    {today && <Badge variant="default" className="text-[9px] h-5">Hoje</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold">{Math.round(pct)}%</span>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {grouped.map(({ key, label, icon, items: mealItems }) => (
                    <div key={key}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-primary text-sm">{icon}</span>
                        <span className="text-xs font-semibold">{label}</span>
                      </div>
                      <div className="space-y-1 pl-6">
                        {mealItems.map(item => {
                          const dayComps = weekCompletions.filter(c => (c as any).date === wd);
                          const comp = dayComps.find(c => c.meal_plan_item_id === item.id);
                          const status = comp?.adherence_status || null;
                          return (
                            <div key={item.id} className="flex items-center gap-2">
                              <button onClick={() => setAdherence(item, "followed", wd)} className="shrink-0">
                                {status === "followed" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  : status === "partial" ? <MinusCircle className="w-3.5 h-3.5 text-amber-500" />
                                  : status === "not_followed" ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                  : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                              </button>
                              <span className={`text-xs flex-1 ${status === "followed" ? "line-through text-muted-foreground" : ""}`}>
                                {item.title}
                              </span>
                              <div className="flex gap-0.5">
                                {([
                                  { s: "followed" as const, icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-500" },
                                  { s: "partial" as const, icon: <MinusCircle className="w-3 h-3" />, color: "text-amber-500" },
                                  { s: "not_followed" as const, icon: <AlertCircle className="w-3 h-3" />, color: "text-red-500" },
                                ]).map(opt => (
                                  <button key={opt.s} onClick={() => setAdherence(item, opt.s, wd)}
                                    className={`p-0.5 rounded transition-all ${status === opt.s ? `${opt.color} opacity-100` : "opacity-20 hover:opacity-60"}`}
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
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── DAILY VIEW (default) ───
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            Plano do Dia
          </h2>
          <p className="text-xs text-muted-foreground">{plan.title}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowWeekly(true)}
        >
          <CalendarRange className="w-3.5 h-3.5" />
          Ver Semana
        </Button>
      </div>

      {/* Date Nav */}
      <DateNavigator date={date} dayOfWeek={dayOfWeek} isToday={isToday} onChangeDate={changeDate} />

      {/* Adherence */}
      <AdherenceCard
        dailyAdherence={dailyAdherence}
        followedCount={followedCount}
        partialCount={partialCount}
        notFollowedCount={notFollowedCount}
        completionsCount={completions.length}
        totalItems={items.length}
        allMarked={allMarked}
      />

      {/* Macros */}
      <MacroSummary items={items} />

      {/* Emotional feedback */}
      {isToday && dailyAdherence > 0 && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10 text-center"
        >
          <p className="text-xs text-muted-foreground">
            {dailyAdherence >= 80 ? "✨ Seu corpo já está respondendo. Continue nesse ritmo!"
              : dailyAdherence >= 50 ? "💪 Bom progresso! Cada refeição seguida faz diferença."
              : "🌱 O primeiro passo é o mais importante. Siga em frente!"}
          </p>
        </motion.div>
      )}

      {/* Meals */}
      <div className="space-y-5">
        {groupedItems.map(({ key, label, icon, time, items: mealItems }) => (
          <MealGroup
            key={key}
            mealType={{ key, label, icon, time }}
            items={mealItems}
            completions={completions}
            justCompleted={null}
            focusMode={false}
            onSetAdherence={setAdherence}
            onOpenDetail={setSelectedMeal}
            onOpenSubstitution={() => {}}
          />
        ))}
      </div>

      {/* Tip */}
      <Card className="p-3 text-center border-border/50">
        <p className="text-[11px] text-muted-foreground">
          💡 Marque cada refeição como <span className="text-emerald-500 font-medium">seguida</span>, <span className="text-amber-500 font-medium">parcial</span> ou <span className="text-red-500 font-medium">não seguida</span>
        </p>
      </Card>

      <MealDetailModal
        open={!!selectedMeal}
        onOpenChange={(open) => { if (!open) setSelectedMeal(null); }}
        meal={selectedMeal}
      />
    </div>
  );
}
