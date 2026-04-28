/**
 * Inline daily meal plan for basic-mode patient dashboard.
 * Shows today's meals directly without navigating to /my-diet.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Utensils,
  Flame,
} from "lucide-react";
import {
  MacroSummary, AdherenceCard, DateNavigator, MealGroup,
  MEAL_TYPES,
  type MealPlanItem, type MealCompletion, type AdherenceStatus,
} from "@/components/patient/MealPlanDailyView";
import { MealDetailModal } from "@/components/patient/MealDetailModal";

import type { MealDetailData } from "@/components/patient/MealPlanDailyView";

interface MealPlan {
  id: string;
  title: string;
  start_date: string;
  totals_status?: string;
  plan_mode?: "weekly" | "single_day" | null;
}

export default function DailyMealPlanInline() {
  const { user } = useAuth();
  const { showMacros, isBasic } = useExperienceUI();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMeal, setSelectedMeal] = useState<MealDetailData | null>(null);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const { data: planData } = await supabase
        .from("meal_plans")
        .select("id, title, start_date, totals_status, plan_mode")
        .eq("patient_id", user.id)
        .eq("is_active", true)
        .eq("plan_status", "published_to_patient")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!planData) { 
        setPlan(null);
        setItems([]);
        setLoading(false); 
        setIsRefreshing(false);
        return; 
      }
      setPlan(planData as MealPlan);

      const { data: itemsData } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", planData.id)
        .order("created_at");

      const currentItems = (itemsData || []) as MealPlanItem[];
      // Modelo GLOBAL: mostra apenas itens marcados como primários para o dia atual simplificado
      setItems(currentItems.filter(i => (i as any).is_primary));

      const { data: completionsData } = await supabase
        .from("meal_item_completions")
        .select("*")
        .eq("patient_id", user.id)
        .eq("meal_plan_id", planData.id)
        .eq("date", date);

      setCompletions((completionsData || []) as unknown as MealCompletion[]);
    } catch (error) {
      console.error("Error fetching meal plan data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, date]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const setAdherence = useCallback(async (item: MealPlanItem, status: AdherenceStatus) => {
    if (!user || !plan) return;
    
    const targetDateObj = new Date(date + "T23:59:59");
    const now = new Date();
    const hoursDiff = (now.getTime() - targetDateObj.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      toast.error("⏰ Prazo expirado!");
      return;
    }
    if (date > now.toISOString().split("T")[0]) {
      toast.error("📅 Não é possível marcar dias futuros.");
      return;
    }

    const existing = completions.find(c => c.meal_plan_item_id === item.id);

    if (existing && existing.adherence_status === status) {
      setCompletions(prev => prev.filter(c => c.id !== existing.id));
      const { error } = await supabase.from("meal_item_completions").delete().eq("id", existing.id);
      if (error) {
        toast.error("Erro ao remover marcação");
        fetchData(true);
      }
      return;
    }

    if (existing) {
      const updated = { ...existing, adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString() };
      setCompletions(prev => prev.map(c => c.id === existing.id ? updated : c));
      const { error } = await supabase.from("meal_item_completions").update({
        adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString(),
      }).eq("id", existing.id);
      if (error) {
        toast.error("Erro ao atualizar marcação");
        fetchData(true);
      }
    } else {
      const tempId = crypto.randomUUID();
      const newItem = {
        id: tempId,
        patient_id: user.id,
        meal_plan_item_id: item.id,
        meal_plan_id: plan.id,
        date: date,
        adherence_status: status,
        completed: status === "followed",
        completed_at: new Date().toISOString(),
      } as unknown as MealCompletion;

      setCompletions(prev => [...prev, newItem]);
      const { data, error } = await supabase.from("meal_item_completions").insert({
        patient_id: user.id, meal_plan_item_id: item.id, meal_plan_id: plan.id,
        date: date, adherence_status: status, completed: status === "followed", completed_at: new Date().toISOString(),
      }).select().single();

      if (error) {
        toast.error("Erro ao salvar marcação");
        fetchData(true);
      } else if (data) {
        setCompletions(prev => prev.map(c => c.id === tempId ? (data as unknown as MealCompletion) : c));
      }
    }

      if (status === "followed" && !isBasic) {
        toast.success("✅ Refeição seguida! +10 XP");
      } else if (status === "followed") {
        toast.success("✅ Refeição seguida!");
      }
  }, [user, plan, date, completions, fetchData]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan || items.length === 0) {
    return (
      <Card className="p-8 text-center border-border/50">
        <Utensils className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold text-base mb-1">Nenhum plano alimentar ativo</h3>
        <p className="text-sm text-muted-foreground">Seu nutricionista precisa criar um plano para você.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {!isBasic && (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" />
                Plano Alimentar
              </h2>
              {isRefreshing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-3 h-3 border-2 border-primary/40 border-t-transparent rounded-full animate-spin"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{plan.title}</p>
          </div>
        </div>
      )}

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
      {showMacros && <MacroSummary items={items} totalsStatus={plan?.totals_status} />}

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
          />
        ))}
      </div>

      {/* Tip - Hide in basic mode */}
      {!isBasic && (
        <Card className="p-3 text-center border-border/50 bg-muted/5">
          <p className="text-[10px] text-muted-foreground italic">
            💡 Clique na refeição para ver detalhes ou marcar como seguida.
          </p>
        </Card>
      )}

      <MealDetailModal
        open={!!selectedMeal}
        onOpenChange={(open) => { if (!open) setSelectedMeal(null); }}
        meal={selectedMeal}
      />
    </div>
  );
}
