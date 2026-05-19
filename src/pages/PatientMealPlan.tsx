import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { safeAccess } from "@/lib/safeRender";
import { normalizeMealPlan } from "@/lib/legacy/mealPlanNormalizer";
import { useNavigate } from "react-router-dom";
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
  CalendarDays, Star, ChevronDown, ChevronUp, Trophy,
  CheckCircle2, MinusCircle, AlertCircle, Circle, FileDown, Calendar
} from "lucide-react";
import { generatePremiumMealPlanPDF, buildPremiumMealPlanHTML, type PremiumMealPlanPDFData } from "@/lib/pdfExportPremium";
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

import {
  MacroSummary, AdherenceCard, DateNavigator, MealGroup,
  MEAL_TYPES, DAYS, MealSlotCard,
  type MealPlanItem, type MealCompletion, type AdherenceStatus, type MealDetailData,
} from "@/components/patient/MealPlanDailyView";
import { MealSlotModal } from "@/components/patient/MealSlotModal";
import { useEngagement } from "@/hooks/useEngagement";
import { PatientRetentionAlerts } from "@/components/dashboard/PatientRetentionAlerts";
import {
  buildDailyDisplayItems,
  buildPdfItemsForDailyPlan,
  buildWeeklyDisplayDays,
  calculatePrimaryTotals,
} from "@/lib/legacy/mealPlanDisplay";

interface MealPlan {
  id: string;
  title: string;
  start_date: string;
  totals_status?: string;
  plan_mode?: string;
  editor_version?: string;
  snapshot?: any;
  total_meta_calorias?: number;
  total_meta_proteinas?: number;
  total_meta_carboidratos?: number;
  total_meta_gorduras?: number;
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
  const { user, isAdmin, isNutritionist, isPersonal, isPatient } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const isPro = isNutritionist || isPersonal || isAdmin;
    if (isPro && !isPatient) {
      navigate("/dashboard", { replace: true });
    }
  }, [isPatient, isNutritionist, isPersonal, isAdmin, navigate]);

  const { isBasic } = useExperienceUI();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [allItems, setAllItems] = useState<MealPlanItem[]>([]);
  const [mealMacros, setMealMacros] = useState<Record<string, any>>({});
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [weekCompletions, setWeekCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMeal, setSelectedMeal] = useState<MealDetailData | null>(null);
  const [substitutionItem, setSubstitutionItem] = useState<MealPlanItem | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ type: string; items: MealPlanItem[] } | null>(null);
  const [activeSubstitutions, setActiveSubstitutions] = useState<Record<string, { foodName: string; originalTitle: string; substituted_calories?: number; substituted_protein?: number }>>({});
  const [focusMode, setFocusMode] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showOthersModal, setShowOthersModal] = useState(false);
  const [xpPopup, setXpPopup] = useState<{ show: boolean; points: number }>({ show: false, points: 0 });
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const xpTimerRef = useRef<number | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previewData, setPreviewData] = useState<PremiumMealPlanPDFData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (isBasic) {
      const today = new Date().toISOString().split("T")[0];
      if (date !== today) setDate(today);
    }
  }, [isBasic]);

  const weekDates = useMemo(() => getWeekDates(date), [date]);

  const journeyDay = plan?.start_date ? Math.max(1, Math.ceil((new Date().getTime() - new Date(plan.start_date).getTime()) / 86400000)) : 1;
  const followedStreak = completions.filter(c => c.adherence_status === "followed").length;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("resolve_patient_meal_plan", { p_patient_id: user.id, p_date: date });
      if (error || !result) {
        setPlan(null); setItems([]); setAllItems([]); setCompletions([]); setWeekCompletions([]); setLoading(false);
        return;
      }
      
      const planData = result as any;
      const snapshot = planData.snapshot;
      const isV3 = snapshot && (snapshot.snapshot_version === 'v3' || Array.isArray(snapshot.days));

      if (!isV3) {
        console.error("[CRITICAL] Plano Legado Detectado. O sistema V3 exige Soberania de Snapshot.");
        toast.error("Este plano precisa ser re-publicado para compatibilidade V3.");
        setLoading(false);
        return;
      }

      // 🛡️ SOBERANIA V3: O App é um RENDERIZADOR BURRO.
      // Extração direta do snapshot sem re-interpretação.
      const allSnapshotItems: MealPlanItem[] = [];
      const macrosMap: Record<string, any> = {};

      snapshot.days.forEach((day: any) => {
        day.meals.forEach((meal: any) => {
          // Chave única por dia e tipo de refeição
          const mKey = `${day.day_of_week}_${meal.name.toLowerCase()}`;
          if (meal.macros) {
            macrosMap[mKey] = meal.macros;
          }

          meal.items.forEach((item: any) => {
            const mapped: MealPlanItem = {
              id: item.id,
              title: item.title,
              description: item.quantity_display || '',
              tipo_refeicao: meal.name as any,
              day_of_week: day.day_of_week ?? 0,
              meta_calorias: item.macros?.kcal ?? 0,
              meta_proteinas: item.macros?.protein_g ?? 0,
              meta_carboidratos: item.macros?.carbs_g ?? 0,
              meta_gorduras: item.macros?.fat_g ?? 0,
              image_url: item.visual?.image_url || null,
              imageUrl: item.visual?.image_url || null,
              is_primary: true,
              display_quantity: item.quantity_display,
              clinical_mass_g: item.clinical_mass_g,
              metadata: {
                image_url: item.visual?.image_url || null,
                substitution_options: (item.substitutions || []).map((s: any) => ({
                  id: s.id,
                  title: s.title,
                  meta_calorias: s.macros?.kcal ?? 0,
                  meta_proteinas: s.macros?.protein_g ?? 0,
                  meta_carboidratos: s.macros?.carbs_g ?? 0,
                  meta_gorduras: s.macros?.fat_g ?? 0,
                  image_url: s.visual?.image_url || null
                })),
                substitution_count: (item.substitutions || []).length
              }
            } as any;
            allSnapshotItems.push(mapped);
          });
        });
      });
      
      setMealMacros(macrosMap);


      const planMeta = {
        id: planData.id,
        title: planData.title,
        start_date: planData.start_date,
        totals_status: 'ok',
        plan_mode: planData.plan_mode,
        editor_version: 'v3',
        snapshot: snapshot,
        total_meta_calorias: snapshot.targets?.kcal ?? 0,
        total_meta_proteinas: snapshot.targets?.protein_g ?? 0,
        total_meta_carboidratos: snapshot.targets?.carbs_g ?? 0,
        total_meta_gorduras: snapshot.targets?.fat_g ?? 0,
      };

      setPlan(planMeta as any);
      setAllItems(allSnapshotItems);
      // Filtragem por dia é puramente visual
      setItems(allSnapshotItems.filter(i => i.day_of_week === dayOfWeek));

      const [subsResponse, completionsResponse, weekResponse] = await Promise.all([
        supabase.from("patient_meal_substitutions" as any).select("*").eq("patient_id", user.id).eq("meal_plan_id", planData.id),
        supabase.from("meal_item_completions").select("*").eq("patient_id", user.id).eq("meal_plan_id", planData.id).eq("date", date),
        supabase.from("meal_item_completions").select("*").eq("patient_id", user.id).eq("meal_plan_id", planData.id).gte("date", weekDates[0]).lte("date", weekDates[6])
      ]);
      if (subsResponse.data) {
        const subsMap: Record<string, any> = {};
        subsResponse.data.forEach((s: any) => { 
          subsMap[s.meal_plan_item_id] = { 
            foodName: s.substituted_food, 
            originalTitle: s.original_food,
            substituted_calories: s.substituted_calories,
            substituted_protein: s.substituted_protein
          }; 
        });
        setActiveSubstitutions(subsMap);
      }
      setCompletions((completionsResponse.data || []) as any);
      setWeekCompletions((weekResponse.data || []) as any);
    } catch (err) { console.error("[PatientApp] Fetch Error:", err); toast.error("Erro ao carregar dados."); }
    finally { setLoading(false); }
  }, [user, date, weekDates, dayOfWeek]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setAdherence = useCallback(async (item: MealPlanItem, status: AdherenceStatus, forDate?: string) => {
    if (!user || !plan) return;
    const targetDate = forDate || date;
    const todayStr = new Date().toISOString().split("T")[0];
    if (targetDate > todayStr) { toast.error("📅 Não é possível marcar futuro."); return; }
    const relevantCompletions = forDate ? weekCompletions.filter(c => (c as any).date === forDate) : completions;
    const existing = relevantCompletions.find(c => c.meal_plan_item_id === item.id);
    if (existing && existing.adherence_status === status) {
      await supabase.from("meal_item_completions").delete().eq("id", existing.id);
      fetchData(); return;
    }
    if (existing) {
      await supabase.from("meal_item_completions").update({ adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("meal_item_completions").insert({ patient_id: user.id, meal_plan_item_id: item.id, meal_plan_id: plan.id, date: targetDate, adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString() });
    }
    if (status === "followed") { setJustCompleted(item.id); setXpPopup({ show: true, points: 10 }); setTimeout(() => { setXpPopup({ show: false, points: 0 }); setJustCompleted(null); }, 2000); }
    fetchData();
  }, [user, plan, date, completions, weekCompletions, fetchData]);

  const changeDate = useCallback((offset: number) => {
    const d = new Date(date + "T12:00:00");
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
      const { data: myProfile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      const pdfItems = allItems;
      const data: PremiumMealPlanPDFData = {
        planTitle: plan.title || "Plano Alimentar", patientName: myProfile?.full_name || "Paciente",
        nutritionistName: "Nutricionista", startDate: new Date(plan.start_date).toLocaleDateString("pt-BR"),
        planMode: "single_day",
        items: pdfItems.map(i => ({ mealType: i.tipo_refeicao || "Refeição", title: i.title || "Item", description: i.description || undefined, meta_calorias: i.meta_calorias || undefined, meta_proteinas: i.meta_proteinas || undefined, meta_carboidratos: i.meta_carboidratos || undefined, meta_gorduras: i.meta_gorduras || undefined, day_of_week: i.day_of_week ?? undefined, is_primary: i.is_primary !== false })),
        targetCalories: plan.total_meta_calorias || undefined,
      };
      setPreviewData(data); setShowPreview(true);
    } catch { toast.error("Erro ao gerar PDF"); }
    finally { setExportingPDF(false); }
  }, [user, plan, allItems, dayOfWeek]);

  const overlayedItems = useMemo(() =>
    items.map(item => {
      const sub = activeSubstitutions[item.id];
      if (!sub) return item;
      
      // 🛡️ SOBERANIA V3: Substituições devem ser purificadas para manter a integridade visual/técnica
      return { 
        ...item, 
        title: sub.foodName, 
        description: `Substituição de: ${sub.originalTitle}${item.description ? ` • ${item.description}` : ""}`, 
        image_url: item.image_url || (item as any).imageUrl || item.metadata?.image_url, 
        imageUrl: item.image_url || (item as any).imageUrl || item.metadata?.image_url,
        // Reset macros se forem divergentes e não estiverem no snapshot do sub (Prevenção de Erro)
        meta_calorias: sub.substituted_calories || item.meta_calorias,
        meta_proteinas: sub.substituted_protein || item.meta_proteinas
      };
    }), [items, activeSubstitutions]);

  const groupedItems = useMemo(() =>
    MEAL_TYPES.map(mt => {
      const mKey = `${dayOfWeek}_${mt.key.toLowerCase()}`;
      return {
        ...mt,
        macros: mealMacros[mKey],
        items: overlayedItems.filter(i => String(i.tipo_refeicao).toLowerCase() === mt.key.toLowerCase())
      };
    }).filter(g => g.items.length > 0),
  [overlayedItems, mealMacros, dayOfWeek]);

  const weeklyDisplayDays = useMemo(() => {
    // 🛡️ SOBERANIA V3: Para planos V3, agrupar por day_of_week diretamente
    if (plan?.editor_version === 'v3') {
      const days = [1, 2, 3, 4, 5, 6, 0];
      return days.map(day => ({
        day,
        items: allItems.filter(i => i.day_of_week === day)
      }));
    }
    // Legado: usar o engine existente
    return buildWeeklyDisplayDays(allItems as any);
  }, [allItems, plan?.editor_version]);

  const { followedCount, partialCount, notFollowedCount, dailyAdherence, allMarked } = useMemo(() => {
    const visibleIds = new Set(items.map(i => i.id));
    const dayComps = completions.filter(c => visibleIds.has(c.meal_plan_item_id));
    const f = dayComps.filter(c => c.adherence_status === "followed").length;
    const p = dayComps.filter(c => c.adherence_status === "partial").length;
    const nf = dayComps.filter(c => c.adherence_status === "not_followed").length;
    const adh = items.length > 0 ? ((f * 100 + p * 50) / (items.length * 100)) * 100 : 0;
    return { followedCount: f, partialCount: p, notFollowedCount: nf, dailyAdherence: adh, allMarked: dayComps.length >= items.length && items.length > 0 };
  }, [completions, items]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;
  if (!plan || allItems.length === 0) return <DashboardLayout><div className="max-w-2xl mx-auto py-12 px-4 text-center"><Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-bold text-lg">Nenhum plano ativo</h3><Button onClick={fetchData} variant="outline" className="mt-4">Atualizar</Button></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10">
        {isToday && <PatientRetentionAlerts />}
        <XPPopup show={xpPopup.show} points={xpPopup.points} />
        <div className="text-center"><h1 className="font-display text-2xl font-bold">{isBasic ? "Sua dieta de hoje" : "Meu Plano Alimentar"}</h1><p className="text-muted-foreground text-sm">{plan.title}</p></div>
        <div className="flex justify-center gap-2"><Button variant={viewMode === "daily" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("daily")}>Diário</Button><Button variant={viewMode === "weekly" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("weekly")}>Semanal</Button><Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exportingPDF}><FileDown className="w-4 h-4 mr-1" /> PDF</Button></div>

        {viewMode === "daily" ? (
          <>
            <DateNavigator date={date} dayOfWeek={dayOfWeek} isToday={isToday} onChangeDate={changeDate} />
            <AdherenceCard dailyAdherence={dailyAdherence} followedCount={followedCount} partialCount={partialCount} notFollowedCount={notFollowedCount} completionsCount={completions.length} totalItems={items.length} allMarked={allMarked} />
            <MacroSummary items={items} targets={{ calories: plan.total_meta_calorias, protein: plan.total_meta_proteinas, carbs: plan.total_meta_carboidratos, fat: plan.total_meta_gorduras }} />
            <div className="space-y-6">
              {groupedItems.map(({ key, label, icon, time, items: mealItems, macros }) => (
                <MealGroup key={key} mealType={{ key, label, icon, time }} items={mealItems} completions={completions} onSetAdherence={setAdherence} onOpenDetail={setSelectedMeal} onOpenSubstitution={setSubstitutionItem} onOpenSlot={(type, items) => setSelectedSlot({ type, items })} justCompleted={justCompleted} focusMode={focusMode} macros={macros} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-6">{weeklyDisplayDays.map(({ day, items: dayItems }) => {
            const dayDate = weekDates[day === 0 ? 0 : day] || date;
            const groupedDayItems = MEAL_TYPES.map(mt => ({ ...mt, items: (dayItems as MealPlanItem[]).filter(i => String(i.tipo_refeicao).toLowerCase() === mt.key.toLowerCase()) })).filter(g => g.items.length > 0);
            if (groupedDayItems.length === 0) return null;
            return (
              <section key={day} className="rounded-2xl border p-4 space-y-4 bg-card/50">
                <h3 className="font-bold">{DAYS[day]}</h3>
                {groupedDayItems.map(({ key, label, icon, time, items: mealItems }) => (
                  <MealGroup key={`${day}-${key}`} mealType={{ key, label, icon, time }} items={mealItems} completions={weekCompletions.filter(c => (c as any).date === dayDate)} onSetAdherence={(item, status) => setAdherence(item, status, dayDate)} onOpenDetail={setSelectedMeal} onOpenSubstitution={setSubstitutionItem} justCompleted={justCompleted} focusMode={focusMode} />
                ))}
              </section>
            );
          })}</div>
        )}

        {selectedMeal && (<MealDetailModal open={!!selectedMeal} onOpenChange={(open) => !open && setSelectedMeal(null)} meal={{ ...selectedMeal, itemId: selectedMeal.itemId || (selectedMeal as any).id, image_url: selectedMeal.image_url || (selectedMeal as any).imageUrl }} />)}
        {substitutionItem && (<MealSubstitutionModal open={!!substitutionItem} onOpenChange={(open) => !open && setSubstitutionItem(null)} mealTitle={substitutionItem.title} mealPlanItemId={substitutionItem.id} mealPlanId={plan.id} patientId={user.id} mealSlot={(substitutionItem as any).tipo_refeicao} options={safeAccess(substitutionItem, 'metadata.substitution_options', [])} onSubstitute={(food, originalTitle) => { setActiveSubstitutions(prev => ({ ...prev, [substitutionItem.id]: { foodName: food.name, originalTitle } })); setSubstitutionItem(null); }} />)}
        <MealSlotModal open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)} mealType={selectedSlot?.type || ""} items={selectedSlot?.items || []} completions={completions} onSetAdherence={setAdherence} onOpenDetail={setSelectedMeal} onOpenSubstitution={setSubstitutionItem} />
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-none rounded-3xl">
          <DialogHeader className="p-6 bg-white border-b shrink-0"><DialogTitle className="font-display text-2xl font-bold flex items-center gap-2"><FileDown className="w-6 h-6 text-primary" /> Visualização do Plano</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-auto p-4 bg-slate-100/50"><div className="bg-white shadow-2xl rounded-2xl mx-auto max-w-[800px] min-h-full overflow-hidden">{previewData && (<iframe srcDoc={buildPremiumMealPlanHTML(previewData)} className="w-full h-[calc(90vh-140px)] border-none" title="PDF Preview" />)}</div></div>
          <div className="p-4 border-t bg-white flex justify-end gap-3"><Button variant="outline" onClick={() => setShowPreview(false)}>Fechar</Button><Button onClick={() => { if (previewData) generatePremiumMealPlanPDF(previewData); setShowPreview(false); }}>Confirmar e Imprimir</Button></div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
