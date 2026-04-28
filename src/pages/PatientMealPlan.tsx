import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import confetti from "@/lib/confetti";
import {
  Utensils, Flame, Zap, Eye, Timer, RefreshCw,
  CalendarDays, Star, ChevronDown, ChevronUp,
  CheckCircle2, MinusCircle, AlertCircle, Circle, FileDown, Calendar
} from "lucide-react";
import { generatePremiumMealPlanPDF } from "@/lib/pdfExportPremium";
import { MealDetailModal } from "@/components/patient/MealDetailModal";
import MealSubstitutionModal from "@/components/patient/MealSubstitutionModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";

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
  totals_status?: string;
  plan_mode?: string;
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
  const { isBasic } = useExperienceUI();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [allItems, setAllItems] = useState<MealPlanItem[]>([]);
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [weekCompletions, setWeekCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMeal, setSelectedMeal] = useState<MealDetailData | null>(null);
  const [substitutionItem, setSubstitutionItem] = useState<MealPlanItem | null>(null);
  const [activeSubstitutions, setActiveSubstitutions] = useState<Record<string, { foodName: string; originalTitle: string }>>({});
  const [focusMode, setFocusMode] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showOthersModal, setShowOthersModal] = useState(false);
  const [xpPopup, setXpPopup] = useState<{ show: boolean; points: number }>({ show: false, points: 0 });
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const xpTimerRef = useRef<number | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];

  // Force opening on the current day in basic mode ALWAYS (resets on navigation or mode change)
  useEffect(() => {
    if (isBasic) {
      const today = new Date().toISOString().split("T")[0];
      if (date !== today) {
        setDate(today);
      }
    }
  }, [isBasic]);

  const weekDates = useMemo(() => getWeekDates(date), [date]);


  const journeyDay = plan ? Math.max(1, Math.ceil((new Date().getTime() - new Date(plan.start_date).getTime()) / 86400000)) : 1;
  const followedStreak = completions.filter(c => c.adherence_status === "followed").length;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: result, error } = await supabase.rpc(
      "resolve_patient_meal_plan",
      { p_patient_id: user.id, p_date: date }
    );

    if (error || !result) {
      setPlan(null);
      setItems([]);
      setAllItems([]);
      setCompletions([]);
      setWeekCompletions([]);
      setLoading(false);
      return;
    }

    const planData = result as any;
    setPlan({
      id: planData.id,
      title: planData.title,
      start_date: planData.start_date,
      totals_status: planData.totals_status,
      plan_mode: planData.plan_mode,
    });

    let resolvedItems = Array.isArray(planData.items) ? (planData.items as MealPlanItem[]) : [];
    let resolvedAllItems = resolvedItems;

    // Resiliência: se a RPC retornar o plano mas o dia atual vier sem itens,
    // buscamos o plano completo para evitar o falso estado de "nenhum plano".
    // Isso cobre cenários onde o plano semanal foi salvo apenas com alguns dias
    // preenchidos ou quando há desalinhamento de day_of_week.
    const shouldFetchFullPlanItems = !!planData.id && (resolvedItems.length === 0 || allItems.length === 0);
    if (shouldFetchFullPlanItems) {
      const { data: fullItemsData, error: fullItemsError } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", planData.id);

      if (!fullItemsError && fullItemsData) {
        const fullItems = fullItemsData as unknown as MealPlanItem[];
        resolvedAllItems = fullItems;

        if (resolvedItems.length === 0 && fullItems.length > 0) {
          const currentDow = new Date(date + "T12:00:00").getDay();
          const sameDayItems = fullItems.filter((item) => item.day_of_week === currentDow);
          if (sameDayItems.length > 0) {
            resolvedItems = sameDayItems;
          } else {
            const firstAvailableDay = fullItems.find(
              (item) => item.day_of_week !== null && item.day_of_week !== undefined,
            )?.day_of_week;

            resolvedItems = firstAvailableDay !== undefined
              ? fullItems.filter((item) => item.day_of_week === firstAvailableDay)
              : fullItems;

            console.warn(
              `[PatientMealPlan] Plano ${planData.id} sem itens para day_of_week=${currentDow}. ` +
              `Usando fallback do primeiro dia disponível (${String(firstAvailableDay)}).`,
            );
          }
        }
      }
    }

    setItems(resolvedItems);
    setAllItems(resolvedAllItems);

    const { data: subsData } = await supabase
      .from("patient_meal_substitutions" as any)
      .select("meal_plan_item_id, original_food, substituted_food")
      .eq("patient_id", user.id)
      .eq("meal_plan_id", planData.id)
      .order("created_at", { ascending: false });

    if (subsData && subsData.length > 0) {
      const subsMap: Record<string, { foodName: string; originalTitle: string }> = {};
      for (const s of subsData as any[]) {
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
  }, [user, date, weekDates, allItems.length]);

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
        toast.success("✅ Muito bem! Continue assim.");
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

  const handleDateSelect = useCallback((selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate.toISOString().split("T")[0]);
      setShowOthersModal(false);
    }
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!user || !plan || allItems.length === 0) return;
    setExportingPDF(true);
    try {
      let nutritionistName = "Profissional";
      let patientName = "Paciente";
      let goal = "";

      const { data: myProfile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      if (myProfile?.full_name) patientName = myProfile.full_name;

      // Get nutritionist name from the plan
      const { data: planFull } = await supabase.from("meal_plans").select("nutritionist_id, total_target_calories, total_target_protein, total_target_carbs, total_target_fat, description").eq("id", plan.id).maybeSingle();
      if (planFull?.nutritionist_id) {
        const { data: nutProfile } = await supabase.from("profiles").select("full_name").eq("user_id", planFull.nutritionist_id).maybeSingle();
        if (nutProfile?.full_name) nutritionistName = nutProfile.full_name;
      }

      try {
        const { data: anamnesisData } = await supabase.from("patient_anamnesis" as any).select("goal").eq("patient_id", user.id).limit(1).maybeSingle();
        if ((anamnesisData as any)?.goal) goal = String((anamnesisData as any).goal);
      } catch { /* ignore */ }

      generatePremiumMealPlanPDF({
        planTitle: plan.title || "Plano Alimentar",
        patientName,
        nutritionistName,
        startDate: new Date(plan.start_date).toLocaleDateString("pt-BR"),
        items: allItems.map(i => ({
          mealType: i.meal_type || "lunch",
          title: i.title || "Refeição",
          description: i.description || undefined,
          calories_target: i.calories_target || undefined,
          protein_target: i.protein_target || undefined,
          carbs_target: i.carbs_target || undefined,
          fat_target: i.fat_target || undefined,
          day_of_week: i.day_of_week ?? undefined,
        })),
        targetCalories: planFull?.total_target_calories || undefined,
        targetProtein: planFull?.total_target_protein || undefined,
        targetCarbs: planFull?.total_target_carbs || undefined,
        targetFat: planFull?.total_target_fat || undefined,
        goal,
        notes: planFull?.description || undefined,
      });
      toast.success("PDF gerado! Use Ctrl+P para salvar.");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setExportingPDF(false);
    }
  }, [user, plan, allItems]);

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
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="glass rounded-2xl p-12 text-center border-dashed border-2">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Utensils className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-display font-bold text-xl mb-2">Nenhum plano alimentar ativo</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
              Seu nutricionista ainda não liberou seu plano ou ele expirou. Que tal entrar em contato?
            </p>
            <Button 
              onClick={() => {
                setLoading(true);
                fetchData();
              }} 
              variant="outline" 
              className="gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Tentar atualizar
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className={`max-w-2xl mx-auto space-y-5 transition-all duration-500 overflow-x-hidden pb-10 ${focusMode ? "pt-2" : ""}`}>
        <AnimatePresence>
          {xpPopup.show && <XPPopup show={xpPopup.show} points={xpPopup.points} />}
        </AnimatePresence>

        {focusMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-10 pointer-events-none" />
        )}

        <div className={`relative ${focusMode ? "z-20" : ""}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="font-display text-2xl font-bold">
                {isBasic ? "Sua dieta de hoje" : "Meu Plano Alimentar"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isBasic ? "Siga o guia abaixo para ter resultados" : plan.title}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="gap-1.5 shrink-0"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">{exportingPDF ? "Gerando..." : "Baixar PDF"}</span>
            </Button>
          </div>

          {/* Plan info — escondido no modo básico para clareza */}
          {!isBasic && (
            <>
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
                  <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Plano diário com substituições inteligentes — toque em qualquer refeição para ver alternativas equivalentes.
                  </p>
                </div>
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
            </>
          )}

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

          {/* MODO DIÁRIO ÚNICO — substituições inteligentes substituem a "visão semanal" */}
          <div className="space-y-5 mt-4">
            {isBasic ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20 px-3 py-1">
                    {isToday ? "Hoje" : DAYS[dayOfWeek]}
                  </Badge>
                  {!isToday && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDate(new Date().toISOString().split("T")[0])}
                      className="text-[10px] h-6 px-2 text-muted-foreground hover:text-primary"
                    >
                      Voltar para hoje
                    </Button>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowOthersModal(true)}
                  className="text-xs font-bold rounded-full px-6 py-5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 gap-2 shadow-sm transition-all hover:scale-105 active:scale-95"
                >
                  <Calendar className="w-4 h-4" />
                  Ver outros dias
                </Button>

                <Dialog open={showOthersModal} onOpenChange={setShowOthersModal}>
                  <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-3xl border-none">
                    <DialogHeader className="p-6 pb-0">
                      <DialogTitle className="font-display text-xl font-bold">Selecionar dia</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                      <CalendarComponent
                        mode="single"
                        selected={new Date(date + "T12:00:00")}
                        onSelect={handleDateSelect}
                        locale={ptBR}
                        className="rounded-md border-none shadow-none"
                        disabled={(date) => date > new Date()}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <DateNavigator date={date} dayOfWeek={dayOfWeek} isToday={isToday} onChangeDate={changeDate} />
            )}


            <AdherenceCard
              dailyAdherence={dailyAdherence}
              followedCount={followedCount}
              partialCount={partialCount}
              notFollowedCount={notFollowedCount}
              completionsCount={completions.length}
              totalItems={items.length}
              allMarked={allMarked}
            />

            <MacroSummary items={items} totalsStatus={plan?.totals_status} />

            <div className="space-y-6">
              {groupedItems.length > 0 ? (
                groupedItems.map(({ key, label, icon, time, items: mealItems }) => (
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
                ))
              ) : (
                <div className="glass rounded-2xl p-8 text-center border-dashed border-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Utensils className="w-8 h-8 text-primary/40" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1">Nada planejado para este dia</h3>
                  <p className="text-muted-foreground text-xs max-w-[200px] mx-auto mb-6">
                    Seu nutricionista não definiu refeições para {isToday ? "hoje" : "este dia"}.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDate(new Date().toISOString().split("T")[0])}
                    className="gap-2 text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Ver hoje
                  </Button>
                </div>
              )}
            </div>


            <div className="glass rounded-xl p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                💡 Marque cada refeição como <span className="text-emerald-500 font-medium">seguida</span>, <span className="text-amber-500 font-medium">parcial</span> ou <span className="text-red-500 font-medium">não seguida</span>.
              </p>
              <p className="text-[10px] text-muted-foreground/80">
                Não gostou de algum item? Toque para ver substituições com macros equivalentes.
              </p>
            </div>
          </div>

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
