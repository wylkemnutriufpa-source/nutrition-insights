import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { safeAccess } from "@/lib/safeRender";
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
/** 
 * Resolve a human-readable portion string from the item data hierarchy. 
 * Patient App should NEVER recalibrate this. It just shows what's in the snapshot.
 */
const formatDisplayPortion = (item: any): string => {
  if (!item) return '';
  const meta = item.edit_metadata || item.metadata || {};
  
  // SOBERANIA V3: Se o item já tem os campos de exibição hidratados no snapshot, use-os.
  if (item.display_quantity && item.display_unit) return `${item.display_quantity} ${item.display_unit}`;
  if (item.display_quantity) return `${item.display_quantity}`;
  
  // Fallback para metadados (Editor Pro)
  const dQty = meta.display_quantity;
  const dUnit = meta.display_unit || meta.portionLabel || meta.portionUnit || '';
  if (dQty) return `${dQty} ${dUnit}`.trim();
  
  // Fallback para gramagem clínica
  const mass = item.clinical_mass_g || item.grams || meta.clinical_mass_g;
  if (mass) return `${mass}g`;
  
  // Último recurso: descrição
  if (item.description) return item.description;
  return '';
};

import type { FoodItem } from "@/components/meals/FoodAutocomplete";
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
  DAY_ORDER,
  assertHierarchyIntegrity,
  type DisplayMealPlanItem
} from "@/lib/mealPlanDisplay";

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

  // HARD GUARD SOBERANO: Bloqueio imediato de contaminação de contexto Pro -> Patient
  useEffect(() => {
    const isPro = isNutritionist || isPersonal || isAdmin;
    if (isPro && !isPatient) {
      console.warn("[SECURITY] Bloqueio imediato PatientMealPlan: Perfil Profissional detectado em rota de paciente.");
      navigate("/dashboard", { replace: true });
    }
  }, [isPatient, isNutritionist, isPersonal, isAdmin, navigate]);

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
  const [selectedSlot, setSelectedSlot] = useState<{ type: string; items: MealPlanItem[] } | null>(null);
  const [activeSubstitutions, setActiveSubstitutions] = useState<Record<string, { foodName: string; originalTitle: string }>>({});
  const [focusMode, setFocusMode] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showOthersModal, setShowOthersModal] = useState(false);
  const [xpPopup, setXpPopup] = useState<{ show: boolean; points: number }>({ show: false, points: 0 });
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const xpTimerRef = useRef<number | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { isStreakAtRisk, isNearCompletion, identityStatus } = useEngagement();
  const [previewData, setPreviewData] = useState<PremiumMealPlanPDFData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

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

    try {
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
      const snapshot = planData.snapshot as any;
      const hasSnapshot = !!snapshot && (Array.isArray(snapshot.days) || Array.isArray(snapshot.meals));

      // --- SNAPSHOT SOBERANO: PRE-RESOLUÇÃO DE IMAGENS ---
      // Para evitar hydration tardia e imagens piscando, resolvemos tudo agora.
      const imagePaths: string[] = [];
      const extractPaths = (node: any) => {
        if (!node) return;
        if (node.image_url && !node.image_url.startsWith('http')) imagePaths.push(node.image_url);
        if (node.meals) node.meals.forEach(extractPaths);
        if (node.items) node.items.forEach(extractPaths);
        if (node.days) node.days.forEach(extractPaths);
        if (node.substitutions) node.substitutions.forEach(extractPaths);
      };
      
      if (hasSnapshot) extractPaths(snapshot);
      else if (planData.items) planData.items.forEach(extractPaths);

      const signedUrlsMap = new Map<string, string>();
      if (imagePaths.length > 0) {
        const { data: urls } = await supabase.storage
          .from("meal-images")
          .createSignedUrls(imagePaths, 3600);
        
        urls?.forEach((u, i) => {
          if (u.signedUrl) signedUrlsMap.set(imagePaths[i], u.signedUrl);
        });
      }

      const hydrateItem = (item: any, dayOfWeek: number, mealType: string): MealPlanItem => {
        const kcal = item.meta_calorias ?? item.kcal ?? item.macros?.kcal ?? 0;
        const protein = item.meta_proteinas ?? item.protein ?? item.macros?.protein_g ?? 0;
        const carbs = item.meta_carboidratos ?? item.carbs ?? item.macros?.carbs_g ?? 0;
        const fat = item.meta_gorduras ?? item.fat ?? item.macros?.fat_g ?? 0;
        
        const rawImg = item.image_url || item.imageUrl || (item.metadata?.image_url);
        const resolvedImg = signedUrlsMap.get(rawImg) || rawImg;

        return {
          ...item,
          id: item.id || item.instanceId,
          title: item.title || item.name,
          description: item.description || item.instructions,
          tipo_refeicao: mealType,
          day_of_week: dayOfWeek,
          meta_calorias: kcal,
          meta_proteinas: protein,
          meta_carboidratos: carbs,
          meta_gorduras: fat,
          image_url: resolvedImg,
          display_quantity: item.display_quantity || item.quantity || item.metadata?.display_quantity,
          display_unit: item.display_unit || item.portionUnitLabel || item.metadata?.display_unit,
          editor_version: planData.editor_version
        };
      };

      let flatItems: MealPlanItem[] = [];
      const currentDow = new Date(date + "T12:00:00").getDay();

      if (hasSnapshot) {
        // --- ADAPTABILIDADE V3 SOBERANA ---
        // O Patient App agora é resiliente a variações na estrutura do snapshot.
        // Tenta processar 'days', 'meals' ou 'items' de forma hierárquica ou flat.
        
        const days = Array.isArray(snapshot.days) ? snapshot.days : [];
        const mealsAtRoot = Array.isArray(snapshot.meals) ? snapshot.meals : [];
        const itemsAtRoot = Array.isArray(snapshot.items) ? snapshot.items : [];

        if (days.length > 0) {
          days.forEach((day: any) => {
            const dow = day.day_of_week ?? currentDow;
            (day.meals || []).forEach((meal: any) => {
              const mealType = meal.tipo_refeicao || meal.type || meal.name;
              (meal.items || []).filter(Boolean).forEach((item: any) => {
                const hydrated = hydrateItem(item, dow, mealType);
                flatItems.push(hydrated);
                
                if (item.substitutions) {
                  item.substitutions.forEach((sub: any) => {
                    flatItems.push({
                      ...hydrateItem(sub, dow, mealType),
                      is_primary: false,
                      is_substitution: true,
                      substitution_group_id: hydrated.id
                    });
                  });
                }
              });
            });
          });
        } else if (mealsAtRoot.length > 0) {
          mealsAtRoot.forEach((meal: any) => {
            const dow = meal.day_of_week ?? currentDow;
            const mealType = meal.tipo_refeicao || meal.type || meal.name;
            (meal.items || []).filter(Boolean).forEach((item: any) => {
              const hydrated = hydrateItem(item, dow, mealType);
              flatItems.push(hydrated);
              
              if (item.substitutions) {
                item.substitutions.forEach((sub: any) => {
                  flatItems.push({
                    ...hydrateItem(sub, dow, mealType),
                    is_primary: false,
                    is_substitution: true,
                    substitution_group_id: hydrated.id
                  });
                });
              }
            });
          });
        } else if (itemsAtRoot.length > 0) {
          itemsAtRoot.filter(Boolean).forEach((item: any) => {
            const dow = item.day_of_week ?? currentDow;
            const mealType = item.tipo_refeicao || item.type || item.mealType || "Almoço";
            const hydrated = hydrateItem(item, dow, mealType);
            flatItems.push(hydrated);
          });
        }
      } else {
        flatItems = (planData.items || []).filter(Boolean).map((i: any) => hydrateItem(i, i.day_of_week, i.tipo_refeicao));
      }

      setPlan({
        id: planData.id,
        title: planData.title,
        start_date: planData.start_date,
        totals_status: planData.totals_status || 'ok',
        plan_mode: planData.plan_mode,
        editor_version: planData.editor_version,
        total_meta_calorias: planData.total_meta_calorias || snapshot?.total_meta_calorias,
        total_meta_proteinas: planData.total_meta_proteinas || snapshot?.total_meta_proteinas,
        total_meta_carboidratos: planData.total_meta_carboidratos || snapshot?.total_meta_carboidratos,
        total_meta_gorduras: planData.total_meta_gorduras || snapshot?.total_meta_gorduras,
      } as any);

      setAllItems(flatItems);
      
      const dailyItems = buildDailyDisplayItems(flatItems as any, currentDow);
      setItems(dailyItems as MealPlanItem[]);

      // Parallel fetch for social/completion data
      const [subsResponse, completionsResponse, weekResponse] = await Promise.all([
        supabase.from("patient_meal_substitutions" as any).select("*").eq("patient_id", user.id).eq("meal_plan_id", planData.id),
        supabase.from("meal_item_completions").select("*").eq("patient_id", user.id).eq("meal_plan_id", planData.id).eq("date", date),
        supabase.from("meal_item_completions").select("*").eq("patient_id", user.id).eq("meal_plan_id", planData.id).gte("date", weekDates[0]).lte("date", weekDates[6])
      ]);

      if (subsResponse.data) {
        const subsMap: Record<string, any> = {};
        subsResponse.data.forEach((s: any) => { subsMap[s.meal_plan_item_id] = { foodName: s.substituted_food, originalTitle: s.original_food }; });
        setActiveSubstitutions(subsMap);
      }

      setCompletions((completionsResponse.data || []) as any);
      setWeekCompletions((weekResponse.data || []) as any);

    } catch (err: any) {
      console.error("[PatientApp] Fetch Error:", err);
      toast.error("Erro ao carregar dados do plano.");
    } finally {
      setLoading(false);
    }
  }, [user, date, weekDates]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

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
        setShowCelebration(true);
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

      const { data: planFull } = await supabase.from("meal_plans").select("nutritionist_id, total_meta_calorias, total_meta_proteinas, total_meta_carboidratos, total_meta_gorduras, description").eq("id", plan.id).maybeSingle();
      if (planFull?.nutritionist_id) {
        const { data: nutProfile } = await supabase.from("profiles").select("full_name").eq("user_id", planFull.nutritionist_id).maybeSingle();
        if (nutProfile?.full_name) nutritionistName = nutProfile.full_name;
      }

      try {
        const { data: anamnesisData } = await supabase.from("patient_anamnesis" as any).select("goal").eq("patient_id", user.id).limit(1).maybeSingle();
        if ((anamnesisData as any)?.goal) goal = String((anamnesisData as any).goal);
      } catch { /* ignore */ }

      // --- FASE 2: RENDER PASSIVO (SOBERANIA V3) ---
      let pdfItems: MealPlanItem[] = [];
      let primaryTotals: any = { calories: 0, protein: 0, carbs: 0, fat: 0 };

      if (plan.editor_version === 'v3') {
        pdfItems = allItems; // No V3, allItems já estão filtrados/estruturados pelo snapshot
        primaryTotals = {
          calories: plan.total_meta_calorias,
          protein: plan.total_meta_proteinas,
          carbs: plan.total_meta_carboidratos,
          fat: plan.total_meta_gorduras,
        };
      } else {
        pdfItems = buildPdfItemsForDailyPlan(allItems as any, new Date(date + "T12:00:00").getDay()) as MealPlanItem[];
        primaryTotals = calculatePrimaryTotals(pdfItems as any);
      }

      const data: PremiumMealPlanPDFData = {
        planTitle: plan.title || "Plano Alimentar",
        patientName,
        nutritionistName,
        startDate: new Date(plan.start_date).toLocaleDateString("pt-BR"),
        planMode: "single_day",
        items: pdfItems.map(i => {
          // --- SOBERANIA V3: RESPEITO ABSOLUTO AOS DADOS HIDRATADOS ---
          const displayQuantity = i.display_quantity || (i as any).edit_metadata?.display_quantity;
          const displayUnit = i.display_unit || (i as any).edit_metadata?.display_unit || (i as any).edit_metadata?.portionLabel || "";
          const clinicalMass = i.clinical_mass_g || (i as any).grams;
          
          let resolvedDescription = i.description || "";
          
          // Prioridade para dados de porção estruturados
          if (displayQuantity) {
            resolvedDescription = `${displayQuantity} ${displayUnit}`.trim();
          } else if (clinicalMass) {
            resolvedDescription = `${clinicalMass}g`;
          }

          return {
            mealType: i.tipo_refeicao || "Almoço",
            title: i.title || "Refeição",
            description: resolvedDescription || undefined,
            meta_calorias: i.meta_calorias || undefined,
            meta_proteinas: i.meta_proteinas || undefined,
            meta_carboidratos: i.meta_carboidratos || undefined,
            meta_gorduras: i.meta_gorduras || undefined,
            day_of_week: i.day_of_week ?? undefined,
            is_primary: i.is_primary !== false,
            substitution_group_id: (i as any).substitution_group_id || (i as any).blockId || null,
          };
        }),
        targetCalories: Math.round(primaryTotals.calories) || planFull?.total_meta_calorias || undefined,
        targetProtein: Math.round(primaryTotals.protein) || planFull?.total_meta_proteinas || undefined,
        targetCarbs: Math.round(primaryTotals.carbs) || planFull?.total_meta_carboidratos || undefined,
        targetFat: Math.round(primaryTotals.fat) || planFull?.total_meta_gorduras || undefined,
        goal,
        notes: planFull?.description || undefined,
      };

      setPreviewData(data);
      setShowPreview(true);
    } catch {
      toast.error("Erro ao preparar visualização");
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
      items: overlayedItems.filter(i => i.tipo_refeicao === mt.key),
    })).filter(g => g.items.length > 0),
  [overlayedItems]);

  const weeklyDisplayDays = useMemo(() => {
    return buildWeeklyDisplayDays(allItems as any);
  }, [allItems]);

  // Memoized daily adherence
  const visibleCompletions = useMemo(() => {
    const visibleIds = new Set(items.map((item) => item.id));
    return completions.filter((completion) => visibleIds.has(completion.meal_plan_item_id));
  }, [completions, items]);

  const { followedCount, partialCount, notFollowedCount, dailyAdherence, allMarked } = useMemo(() => {
    const followed = visibleCompletions.filter(c => c.adherence_status === "followed").length;
    const partial = visibleCompletions.filter(c => c.adherence_status === "partial").length;
    const notFollowed = visibleCompletions.filter(c => c.adherence_status === "not_followed").length;
    const adherence = items.length > 0 ? ((followed * 100 + partial * 50) / (items.length * 100)) * 100 : 0;
    return { followedCount: followed, partialCount: partial, notFollowedCount: notFollowed, dailyAdherence: adherence, allMarked: visibleCompletions.length >= items.length && items.length > 0 };
  }, [visibleCompletions, items]);

  const getWeekDayAdherence = useCallback((dayDate: string, dayIdx: number) => {
    let dayItems: MealPlanItem[] = [];
    if (plan?.editor_version === 'v3') {
      dayItems = allItems.filter(item => item.day_of_week === dayIdx);
    } else {
      dayItems = buildDailyDisplayItems(allItems as any, dayIdx) as MealPlanItem[];
    }
    
    const dayComps = weekCompletions.filter(c => (c as any).date === dayDate);
    if (dayItems.length === 0) return { pct: 0, total: 0, done: 0 };
    const followed = dayComps.filter(c => c.adherence_status === "followed").length;
    const partial = dayComps.filter(c => c.adherence_status === "partial").length;
    const pct = ((followed * 100 + partial * 50) / (dayItems.length * 100)) * 100;
    return { pct, total: dayItems.length, done: dayComps.length };
  }, [allItems, weekCompletions, plan?.editor_version]);

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
        {isToday && <PatientRetentionAlerts />}
        
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCelebration(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md cursor-pointer"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center p-8"
              >
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-2">Dia Completo! ✔️</h2>
                <p className="text-muted-foreground mb-8">Você manteve a consistência e venceu mais um dia.</p>
                <Button onClick={() => setShowCelebration(false)} className="rounded-full px-8">
                  Continuar evoluindo
                </Button>
              </motion.div>
            </motion.div>
          )}

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

          {/* Visualização diária/semanal — substituições não entram na soma de macros */}
          <div className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1">
              <Button
                type="button"
                variant={viewMode === "daily" ? "default" : "ghost"}
                className="h-10 rounded-xl text-xs font-bold"
                onClick={() => setViewMode("daily")}
              >
                Modo diário
              </Button>
              <Button
                type="button"
                variant={viewMode === "weekly" ? "default" : "ghost"}
                className="h-10 rounded-xl text-xs font-bold"
                onClick={() => setViewMode("weekly")}
              >
                Modo semanal
              </Button>
            </div>

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

            <MacroSummary 
              items={items} 
              totalsStatus={plan?.totals_status} 
              targets={{
                calories: plan?.total_meta_calorias,
                protein: plan?.total_meta_proteinas,
                carbs: plan?.total_meta_carboidratos,
                fat: plan?.total_meta_gorduras,
              }}
            />

            {viewMode === "daily" ? (
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
                      onOpenSlot={(type, items) => setSelectedSlot({ type, items })}
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
            ) : (
              <div className="space-y-5">
                {weeklyDisplayDays.map(({ day, items: dayItems }) => {
                  const dayDate = weekDates[day === 0 ? 0 : day] || date;
                  const groupedDayItems = MEAL_TYPES.map(mt => ({
                    ...mt,
                    items: (dayItems as MealPlanItem[]).filter(i => i.tipo_refeicao === mt.key),
                  })).filter(g => g.items.length > 0);

                  if (groupedDayItems.length === 0) return null;

                  return (
                    <section key={day} className="rounded-2xl border border-border/60 bg-card/60 p-3 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-display font-bold text-sm">{DAYS[day]}</h3>
                          <p className="text-[10px] text-muted-foreground">Plano montado com substituições equivalentes</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                          Mesmas metas
                        </Badge>
                      </div>
                      {groupedDayItems.map(({ key, label, icon, time, items: mealItems }) => (
                        <MealGroup
                          key={`${day}-${key}`}
                          mealType={{ key, label, icon, time }}
                          items={mealItems}
                          completions={weekCompletions.filter(c => (c as any).date === dayDate)}
                          justCompleted={justCompleted}
                          focusMode={focusMode}
                          onSetAdherence={(item, status) => setAdherence(item, status, dayDate)}
                          onOpenDetail={setSelectedMeal}
                          onOpenSubstitution={setSubstitutionItem}
                          // 🛡️ SOBERANIA V3: No modo semanal, "desacoplamos" a visualização 
                          // para mostrar a lista de itens de cada dia individualmente,
                          // conforme solicitado (as substituições ficam dentro de cada item).
                          onOpenSlot={undefined}
                        />
                      ))}
                    </section>
                  );
                })}
              </div>
            )}


            <div className="glass rounded-xl p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                💡 Marque cada refeição como <span className="text-emerald-500 font-medium">seguida</span>, <span className="text-amber-500 font-medium">parcial</span> ou <span className="text-red-500 font-medium">não seguida</span>.
              </p>
              <p className="text-[10px] text-muted-foreground/80">
                Não gostou de algum item? Toque para ver substituições com macros equivalentes.
              </p>
            </div>
          </div>

          <MealSlotModal
            open={!!selectedSlot}
            onOpenChange={(open) => { if (!open) setSelectedSlot(null); }}
            mealType={selectedSlot?.type || ""}
            items={selectedSlot?.items || []}
            completions={completions}
            onSetAdherence={setAdherence}
            onOpenDetail={setSelectedMeal}
            onOpenSubstitution={setSubstitutionItem}
          />

          {selectedMeal && (
            <MealDetailModal
              open={!!selectedMeal}
              onOpenChange={(open) => { if (!open) setSelectedMeal(null); }}
              meal={selectedMeal}
            />
          )}

          <MealSubstitutionModal
            open={!!substitutionItem}
            onOpenChange={(open) => { if (!open) setSubstitutionItem(null); }}
            mealTitle={substitutionItem ? (items.find(i => i.id === substitutionItem.id)?.title || substitutionItem.title) : ""}
            mealPlanItemId={substitutionItem?.id || ""}
            mealPlanId={plan?.id || ""}
            patientId={user?.id || ""}
            mealSlot={(substitutionItem as any)?.tipo_refeicao}
            options={safeAccess(substitutionItem, 'metadata.substitution_options', [])}
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
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-none rounded-3xl">
              <DialogHeader className="p-6 bg-white border-b shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="font-display text-2xl font-bold flex items-center gap-2">
                      <FileDown className="w-6 h-6 text-primary" />
                      Visualização do Plano Premium
                    </DialogTitle>
                    <p className="text-muted-foreground text-sm mt-1">
                      Confira as informações antes de gerar o documento final.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setShowPreview(false)} className="rounded-full px-6">
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => {
                        if (previewData) generatePremiumMealPlanPDF(previewData);
                        setShowPreview(false);
                      }} 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-8 shadow-lg shadow-primary/20"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Confirmar e Imprimir
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100/50">
                <div className="bg-white shadow-2xl rounded-2xl mx-auto max-w-[800px] min-h-full overflow-hidden">
                  {previewData && (
                    <iframe
                      srcDoc={buildPremiumMealPlanHTML(previewData)}
                      className="w-full h-[calc(90vh-140px)] border-none"
                      title="PDF Preview"
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}
