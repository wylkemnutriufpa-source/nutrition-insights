import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, RefreshCw, Eye, FileDown, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
// clinicalHumanEngine removed
import {
  MacroSummary, MealGroup, MealSlotCard,
  MEAL_TYPES, DAYS,
  type MealPlanItem, type MealCompletion, type MealDetailData,
} from "@/components/patient/MealPlanDailyView";
import { MealSlotModal } from "@/components/patient/MealSlotModal";
import MealSubstitutionModal from "@/components/patient/MealSubstitutionModal";

import { MealDetailModal } from "@/components/patient/MealDetailModal";
import { safeAccess } from "@/lib/safeRender";
import { toast } from "sonner";

// 🛡️ SOBERANIA V3: Hook único que extrai snapshot.
import { useSovereignPlan, SovereignMealItem } from "@/lib/sovereign";

interface PatientProfileMealPlanProps {
  patientId: string;
  activeMealPlanId: string | null;
}

export default function PatientProfileMealPlan({ patientId, activeMealPlanId }: PatientProfileMealPlanProps) {
  const [completions, setCompletions] = useState<MealCompletion[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [selectedMeal, setSelectedMeal] = useState<MealDetailData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ type: string; items: MealPlanItem[] } | null>(null);
  const [substitutingItem, setSubstitutingItem] = useState<MealPlanItem | null>(null);

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const isToday = date === new Date().toISOString().split("T")[0];

  // 🛡️ SOBERANIA V3: Hook único. SEM remapeamento manual no componente.
  const {
    loading,
    plan,
    allItems: sovereignAllItems,
    itemsForDay: sovereignItemsForDay,
    mealGroups: sovereignMealGroups,
    integrityWarnings,
    isValidV3,
    refetch,
  } = useSovereignPlan(activeMealPlanId, dayOfWeek);

  // 🌉 Adapta para componentes legados (FASE 2 vai eliminar isso)
  const allItems = useMemo(() => sovereignAllItems, [sovereignAllItems]);
  const items = useMemo(() => sovereignItemsForDay, [sovereignItemsForDay]);

  // Macros agregados por refeição (vêm do snapshot, sem recálculo)
  const mealMacros = useMemo(() => {
    const map: Record<string, any> = {};
    sovereignMealGroups.forEach((group, key) => {
      if (group.meal.macros) {
        map[key] = group.meal.macros;
      }
    });
    return map;
  }, [sovereignMealGroups]);

  // Carregar completions de adesão (independente do snapshot)
  const fetchCompletions = useCallback(async () => {
    if (!patientId || !activeMealPlanId) return;
    const { data: completionsData } = await supabase
      .from("meal_item_completions")
      .select("*")
      .eq("patient_id", patientId)
      .eq("meal_plan_id", activeMealPlanId)
      .eq("date", date);
    setCompletions((completionsData || []) as unknown as MealCompletion[]);
  }, [patientId, activeMealPlanId, date]);

  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  // Mostrar erro de integridade ao nutri (não bloqueia render)
  useEffect(() => {
    if (!isValidV3 && activeMealPlanId && !loading) {
      toast.error("Este plano não é V3. Republique para ver imagens e dados completos.");
    } else if (integrityWarnings.length > 0) {
      console.warn("[PatientProfileMealPlan] Snapshot incompleto:", integrityWarnings);
    }
  }, [isValidV3, integrityWarnings, activeMealPlanId, loading]);

  const fetchData = useCallback(async () => {
    await refetch();
    await fetchCompletions();
  }, [refetch, fetchCompletions]);

  const groupedItems = useMemo(() => {
    // 🛡️ ANTI-CRASH: Garantir que items seja um array antes de filtrar
    const safeItems = Array.isArray(items) ? items : [];
    return MEAL_TYPES.map(mt => {
      const mealKey = `${dayOfWeek}_${mt.key.toLowerCase()}`;
      return {
        ...mt,
        macros: mealMacros[mealKey],
        items: safeItems.filter(i => {
          if (!i || !i.meal) return false;
          const type = String(i.meal.name).toLowerCase();
          const key = mt.key.toLowerCase();
          // Match by key, label or common variations
          return type === key || 
                 type === mt.label.toLowerCase() || 
                 (key === "lanche da tarde" && type === "afternoon_snack") ||
                 (key === "café da manhã" && type === "breakfast") ||
                 (key === "almoço" && type === "lunch") ||
                 (key === "jantar" && type === "dinner");
        }),
      };
    }).filter(g => g.items.length > 0);
  }, [items, mealMacros, dayOfWeek]);

  const weeklyDisplayDays = useMemo(() => {
    // 🛡️ SOBERANIA V3: Agrupar por day_of_week diretamente do snapshot
    const days = [1, 2, 3, 4, 5, 6, 0];
    return days.map(day => ({
      day,
      items: (allItems || []).filter(i => i.meal.day_of_week === day)
    }));
  }, [allItems]);

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

  if (!activeMealPlanId) {
    return (
      <div className="p-8 text-center bg-black/40 rounded-3xl border border-white/5 space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-500/10 flex items-center justify-center mx-auto">
          <ChefHat className="w-6 h-6 text-zinc-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-400">Nenhum plano alimentar ativo</p>
          <p className="text-xs text-muted-foreground">O paciente ainda não possui um plano alimentar publicado.</p>
        </div>
      </div>
    );
  }

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

      {/* Plan items view */}

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
            {groupedItems.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 px-6 bg-black/40 rounded-3xl border border-white/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold">Nenhum item encontrado para este dia</p>
                  <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                    O plano ativo pode não ter refeições configuradas para este dia da semana.
                  </p>
                </div>
              </div>
            )}
          </div>

            {groupedItems.map(({ key, label, icon, time, items: mealItems, macros }) => (
              <MealGroup
                key={key}
                mealType={{ key, label, icon, time }}
                items={mealItems}
                completions={completions}
                justCompleted={null}
                focusMode={false}
                onSetAdherence={() => {}} // Professional doesn't set adherence here
                onOpenDetail={(meal) => setSelectedMeal(meal as any)}
                onOpenSlot={(type, items) => setSelectedSlot({ type, items })}
                onOpenSubstitution={setSubstitutingItem}
                macros={macros}
              />
            ))}

          </div>
        ) : (
          <div className="space-y-8">
            {weeklyDisplayDays.map(({ day, items: dayItems }) => {
              const groupedDayItems = MEAL_TYPES.map(mt => ({
                ...mt,
                items: dayItems.filter(i => i.meal.name === mt.key),
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
                        onOpenSlot={(type, items) => setSelectedSlot({ type, items })}
                        onOpenSubstitution={setSubstitutingItem}
                      />

                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MealSlotModal
        open={!!selectedSlot}
        onOpenChange={(open) => !open && setSelectedSlot(null)}
        mealType={selectedSlot?.type || ""}
        items={selectedSlot?.items || []}
        completions={completions}
        onSetAdherence={() => {}} 
        onOpenDetail={(meal) => setSelectedMeal(meal as any)}
        onOpenSubstitution={setSubstitutingItem}
      />

      {selectedMeal && (
        <MealDetailModal
          open={!!selectedMeal}
          onOpenChange={(open) => !open && setSelectedMeal(null)}
          meal={selectedMeal}
        onUpdateItem={handleUpdateItem}
          onChangeImage={handleChangeImage}
        />
      )}

      {substitutingItem && (
        <MealSubstitutionModal
          open={!!substitutingItem}
          onOpenChange={(open) => !open && setSubstitutingItem(null)}
          mealTitle={substitutingItem.title}
          mealPlanItemId={substitutingItem.id}
          mealPlanId={activeMealPlanId || ""}
          patientId={patientId}
          mealSlot={(substitutingItem as any)?.tipo_refeicao}
          options={safeAccess(substitutingItem, 'metadata.substitution_options', [])}
          onSubstitute={() => {
            fetchData();
            setSubstitutingItem(null);
          }}
        />
      )}
    </div>
  );
}

