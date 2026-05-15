/**
 * MealSubstitutionPanel — V3 SOBERANO
 *
 * 🛡️ Esta versão **elimina** a hardcoded SUBSTITUTION_GROUPS legada
 *    e usa exclusivamente o motor soberano `getValidSubstitutions`
 *    com `MEAL_TYPE_GUARD` ativo (filtra por slot da refeição).
 *
 *    Isso impede que sugestões cruzem categorias (ex.: tilápia no café,
 *    arroz no café, pão no almoço).
 */
import { useState, useMemo, useCallback } from "react";
import { useMealPlanEditorV2Store, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeftRight, Flame, Beef, Wheat, Droplets, Check, Info } from "lucide-react";
import { toast } from "sonner";
import {
  getValidSubstitutions,
  getFoodGroup,
  SUBSTITUTION_GROUP_LABELS,
  findFoodsInTitle,
} from "@/lib/substitutionGroups";
import { normalizeSlot } from "@/lib/mealTypeIntegrity";

interface Props {
  day: number;
}

export default function MealSubstitutionPanel({ day }: Props) {
  const { items, planId, updateItem } = useMealPlanEditorV2Store();
  const [selectedItem, setSelectedItem] = useState<MealPlanItem | null>(null);
  const [recentlySwapped, setRecentlySwapped] = useState<Set<string>>(new Set());

  const dayItems = items.filter(i => i.day_of_week === day);

  /**
   * 🛡️ Resolve substituições do item selecionado RESPEITANDO o slot.
   */
  const substitutions = useMemo(() => {
    if (!selectedItem) return [];
    const slot = normalizeSlot(selectedItem.tipo_refeicao as any);
    // Detecta o alimento principal a partir do título
    const detected = findFoodsInTitle(selectedItem.title || "");
    const baseName = detected[0]?.name || selectedItem.title || "";
    if (!baseName) return [];
    return getValidSubstitutions(baseName, { slot: slot ?? undefined }, 6);
  }, [selectedItem]);

  const detectGroupForItem = useCallback((item: MealPlanItem) => {
    const detected = findFoodsInTitle(item.title || "");
    const baseName = detected[0]?.name || item.title || "";
    return getFoodGroup(baseName);
  }, []);

  const handleSwap = useCallback((sub: { food: any }) => {
    if (!selectedItem || !planId) return;

    updateItem(selectedItem.id, {
      title: sub.food.name,
      description: sub.food.portion || "",
      meta_calorias: sub.food.calories,
      meta_proteinas: sub.food.protein,
      meta_carboidratos: sub.food.carbs,
      meta_gorduras: sub.food.fat,
    });

    setRecentlySwapped(prev => new Set(prev).add(sub.food.name));
    toast.success(`🔄 Substituído por ${sub.food.name}`);
    setTimeout(() => {
      setRecentlySwapped(prev => {
        const next = new Set(prev);
        next.delete(sub.food.name);
        return next;
      });
    }, 2000);
  }, [selectedItem, planId, updateItem]);

  const selectedGroup = selectedItem ? detectGroupForItem(selectedItem) : null;
  const groupLabel = selectedGroup ? SUBSTITUTION_GROUP_LABELS[selectedGroup] : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <ArrowLeftRight className="w-4 h-4 text-primary" />
        <p className="text-xs text-muted-foreground">
          Selecione um item — substituições filtradas pelo slot da refeição (sem cruzamento de categorias)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
        {/* Left: Current items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Itens do Dia</p>
          <ScrollArea className="h-[400px]">
            <div className="space-y-1.5 pr-2">
              {dayItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Nenhum item no plano</p>
              ) : (
                dayItems.map((item) => {
                  const hasGroup = detectGroupForItem(item) !== null;
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => hasGroup && setSelectedItem(item)}
                      disabled={!hasGroup}
                      className={`w-full text-left rounded-lg border p-2.5 text-xs transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : hasGroup
                            ? "border-border bg-card hover:border-primary/40"
                            : "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <p className="font-semibold truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-[9px] text-muted-foreground truncate mt-0.5">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[9px]">
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-orange-400" /> {item.meta_calorias || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Beef className="w-2.5 h-2.5 text-red-400" /> {Number(item.meta_proteinas) || 0}g
                        </span>
                      </div>
                      {!hasGroup && (
                        <p className="text-[8px] text-muted-foreground mt-1 italic">Sem grupo de substituição reconhecido</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Substitution options */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            {selectedItem
              ? `Substituições para "${selectedItem.title}"${groupLabel ? ` — ${groupLabel}` : ""}`
              : "Selecione um item"}
          </p>
          <ScrollArea className="h-[400px]">
            {!selectedItem ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Clique em um item à esquerda</p>
                </div>
              </div>
            ) : substitutions.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                <Info className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>Sem substituições válidas para este slot</p>
                <p className="text-[10px] mt-1 opacity-70">
                  O guard clínico bloqueou alternativas fora da categoria.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 pr-2">
                {substitutions.map((sub) => {
                  const isCurrentItem = (selectedItem.title || "")
                    .toLowerCase()
                    .includes(sub.food.name.toLowerCase().split(" ")[0]);
                  const wasSwapped = recentlySwapped.has(sub.food.name);
                  const calDiff = sub.food.calories - (selectedItem.meta_calorias || 0);
                  return (
                    <button
                      key={sub.food.name}
                      type="button"
                      onClick={() => handleSwap(sub)}
                      disabled={isCurrentItem}
                      className={`w-full text-left rounded-lg border p-2.5 text-xs transition-all ${
                        wasSwapped
                          ? "border-green-500 bg-green-500/5"
                          : isCurrentItem
                            ? "border-primary/30 bg-primary/5 opacity-70"
                            : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{sub.food.name}</p>
                            {isCurrentItem && (
                              <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">atual</span>
                            )}
                            {wasSwapped && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                          </div>
                          <p className="text-[9px] text-muted-foreground">{sub.food.portion}</p>
                        </div>
                        {!isCurrentItem && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            Math.abs(calDiff) <= 30 ? "bg-green-500/10 text-green-600" :
                            calDiff > 0 ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                          }`}>
                            {calDiff > 0 ? "+" : ""}{calDiff} kcal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[9px]">
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-orange-400" /> {sub.food.calories}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Beef className="w-2.5 h-2.5 text-red-400" /> {sub.food.protein}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Wheat className="w-2.5 h-2.5 text-amber-500" /> {sub.food.carbs}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Droplets className="w-2.5 h-2.5 text-blue-400" /> {sub.food.fat}g
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
