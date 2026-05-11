import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, RefreshCw, Eye, FileDown, Calendar } from "lucide-react";
import {
  MacroSummary, MealGroup,
  MEAL_TYPES, DAYS,
  type MealPlanItem, type MealCompletion, type MealDetailData,
} from "@/components/patient/MealPlanDailyView";
import {
  buildDailyDisplayItems,
  buildWeeklyDisplayDays,
  calculatePrimaryTotals,
} from "@/lib/mealPlanDisplay";
import { MealDetailModal } from "@/components/patient/MealDetailModal";
import { toast } from "sonner";

interface PatientProfileMealPlanProps {
  patientId: string;
  activeMealPlanId: string | null;
}

export default function PatientProfileMealPlan({ patientId, activeMealPlanId }: PatientProfileMealPlanProps) {
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [allItems, setAllItems] = useState<MealPlanItem[]>([]);
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [selectedMeal, setSelectedMeal] = useState<MealDetailData | null>(null);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    if (!patientId || !activeMealPlanId) return;
    setLoading(true);

    const { data: itemsData, error: itemsError } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", activeMealPlanId);

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      setLoading(false);
      return;
    }

    const allResolvedItems = (itemsData || []) as unknown as MealPlanItem[];
    setAllItems(allResolvedItems);
    
    // Group and filter items for the daily view
    setItems(buildDailyDisplayItems(allResolvedItems as any, dayOfWeek) as MealPlanItem[]);

    const { data: completionsData } = await supabase
      .from("meal_item_completions")
      .select("*")
      .eq("patient_id", patientId)
      .eq("meal_plan_id", activeMealPlanId)
      .eq("date", date);

    setCompletions((completionsData || []) as unknown as MealCompletion[]);
    setLoading(false);
  }, [patientId, activeMealPlanId, date, dayOfWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedItems = useMemo(() =>
    MEAL_TYPES.map(mt => ({
      ...mt,
      items: items.filter(i => i.meal_type === mt.key),
    })).filter(g => g.items.length > 0),
  [items]);

  const weeklyDisplayDays = useMemo(() => buildWeeklyDisplayDays(allItems as any), [allItems]);

  const handleUpdateItem = async (itemId: string, patch: any) => {
    const { error } = await supabase
      .from("meal_plan_items")
      .update(patch)
      .eq("id", itemId);

    if (error) {
      toast.error("Erro ao atualizar item");
    } else {
      toast.success("Item atualizado");
      fetchData();
    }
  };

  const handleChangeImage = async (itemId: string, newImageUrl: string) => {
    await handleUpdateItem(itemId, { image_url: newImageUrl });
  };

  if (!activeMealPlanId) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-500" /> 
            Plano Ativo: Visão Interativa
          </h3>
          <p className="text-xs text-muted-foreground">
            Visualize e edite a adesão e detalhes do plano diretamente
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
            <Button
              size="sm"
              variant={viewMode === "daily" ? "default" : "ghost"}
              onClick={() => setViewMode("daily")}
              className={`text-[10px] font-bold h-7 px-3 ${viewMode === "daily" ? "bg-emerald-500 text-black hover:bg-emerald-600" : ""}`}
            >
              DIÁRIO
            </Button>
            <Button
              size="sm"
              variant={viewMode === "weekly" ? "default" : "ghost"}
              onClick={() => setViewMode("weekly")}
              className={`text-[10px] font-bold h-7 px-3 ${viewMode === "weekly" ? "bg-emerald-500 text-black hover:bg-emerald-600" : ""}`}
            >
              SEMANAL
            </Button>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 border-white/10" onClick={() => fetchData()}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <MacroSummary items={items} />

      <div className="grid grid-cols-1 gap-6">
        {viewMode === "daily" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4 py-2">
               <Button variant="ghost" size="sm" onClick={() => {
                 const d = new Date(date);
                 d.setDate(d.getDate() - 1);
                 setDate(d.toISOString().split("T")[0]);
               }}>
                 <Calendar className="w-4 h-4 mr-2" /> Anterior
               </Button>
               <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-4 py-1">
                 {isToday ? "Hoje" : DAYS[dayOfWeek]}
               </Badge>
               <Button variant="ghost" size="sm" onClick={() => {
                 const d = new Date(date);
                 d.setDate(d.getDate() + 1);
                 setDate(d.toISOString().split("T")[0]);
               }}>
                 Próximo <Calendar className="w-4 h-4 ml-2" />
               </Button>
            </div>

            {groupedItems.map(({ key, label, icon, time, items: mealItems }) => (
              <MealGroup
                key={key}
                mealType={{ key, label, icon, time }}
                items={mealItems}
                completions={completions}
                justCompleted={null}
                focusMode={false}
                onSetAdherence={() => {}} // Professional doesn't set adherence here
                onOpenDetail={(meal) => setSelectedMeal(meal as any)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {weeklyDisplayDays.map(({ day, items: dayItems }) => {
              const groupedDayItems = MEAL_TYPES.map(mt => ({
                ...mt,
                items: dayItems.filter(i => i.meal_type === mt.key),
              })).filter(g => g.items.length > 0);

              if (groupedDayItems.length === 0) return null;

              return (
                <div key={day} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="font-bold text-sm text-emerald-500 uppercase tracking-widest">{DAYS[day]}</h4>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">MESMAS CALORIAS</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedDayItems.map(({ key, label, icon, time, items: mealItems }) => (
                      <MealGroup
                        key={`${day}-${key}`}
                        mealType={{ key, label, icon, time }}
                        items={mealItems as any}
                        completions={[]}
                        justCompleted={null}
                        focusMode={false}
                        onSetAdherence={() => {}}
                        onOpenDetail={(meal) => setSelectedMeal(meal as any)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MealDetailModal
        open={!!selectedMeal}
        onOpenChange={(open) => !open && setSelectedMeal(null)}
        meal={selectedMeal}
        onUpdateItem={handleUpdateItem}
      />
    </div>
  );
}
