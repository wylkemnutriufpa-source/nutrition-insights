/**
 * MealSubstitutionPanel — Phase 3: Smart substitutions
 * 
 * Shows nutritional equivalents for meal items.
 * Allows one-click swap maintaining caloric/macro balance.
 */
import { useState, useMemo, useCallback } from "react";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeftRight, Flame, Beef, Wheat, Droplets, Check, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SubstitutionOption {
  id: string;
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
}

/** Substitution groups — items within a group are nutritionally equivalent */
const SUBSTITUTION_GROUPS: Record<string, SubstitutionOption[]> = {
  // Breakfast carbs
  breakfast_carb: [
    { id: "sub_pao", title: "Pão francês", description: "1 unidade (50g)", calories: 150, protein: 5, carbs: 28, fat: 2, emoji: "🍞" },
    { id: "sub_tapioca", title: "Tapioca", description: "2 colheres (40g)", calories: 140, protein: 0, carbs: 35, fat: 0, emoji: "🫓" },
    { id: "sub_cuscuz", title: "Cuscuz", description: "1 porção (100g)", calories: 170, protein: 4, carbs: 36, fat: 1, emoji: "🌽" },
    { id: "sub_pao_integral", title: "Pão integral", description: "2 fatias (50g)", calories: 130, protein: 6, carbs: 24, fat: 2, emoji: "🍞" },
  ],
  // Breakfast protein
  breakfast_protein: [
    { id: "sub_ovo", title: "Ovo mexido", description: "2 unidades", calories: 180, protein: 12, carbs: 1, fat: 14, emoji: "🍳" },
    { id: "sub_queijo", title: "Queijo coalho", description: "2 fatias (50g)", calories: 160, protein: 11, carbs: 1, fat: 13, emoji: "🧀" },
    { id: "sub_frango_desf", title: "Frango desfiado", description: "60g", calories: 100, protein: 18, carbs: 0, fat: 3, emoji: "🍗" },
  ],
  // Lunch/Dinner protein
  main_protein: [
    { id: "sub_frango_gr", title: "Peito de frango grelhado", description: "150g", calories: 248, protein: 46, carbs: 0, fat: 5, emoji: "🍗" },
    { id: "sub_carne_moida", title: "Carne moída refogada", description: "130g", calories: 260, protein: 30, carbs: 0, fat: 15, emoji: "🥩" },
    { id: "sub_peixe", title: "Filé de peixe grelhado", description: "150g", calories: 180, protein: 36, carbs: 0, fat: 3, emoji: "🐟" },
    { id: "sub_bife", title: "Bife grelhado", description: "130g", calories: 240, protein: 35, carbs: 0, fat: 11, emoji: "🥩" },
  ],
  // Lunch/Dinner carbs
  main_carb: [
    { id: "sub_arroz", title: "Arroz branco", description: "4 colheres (120g)", calories: 155, protein: 3, carbs: 34, fat: 0, emoji: "🍚" },
    { id: "sub_macarrao", title: "Macarrão", description: "100g cozido", calories: 160, protein: 5, carbs: 31, fat: 1, emoji: "🍝" },
    { id: "sub_pure", title: "Purê de batata", description: "3 colheres (120g)", calories: 120, protein: 2, carbs: 20, fat: 4, emoji: "🥔" },
    { id: "sub_batata_coz", title: "Batata cozida", description: "2 unidades (150g)", calories: 115, protein: 3, carbs: 26, fat: 0, emoji: "🥔" },
  ],
  // Fruits
  fruit: [
    { id: "sub_banana", title: "Banana", description: "1 unidade (100g)", calories: 89, protein: 1, carbs: 23, fat: 0, emoji: "🍌" },
    { id: "sub_maca", title: "Maçã", description: "1 unidade (150g)", calories: 78, protein: 0, carbs: 21, fat: 0, emoji: "🍎" },
    { id: "sub_mamao", title: "Mamão", description: "1 fatia (150g)", calories: 60, protein: 1, carbs: 15, fat: 0, emoji: "🥭" },
    { id: "sub_laranja", title: "Laranja", description: "1 unidade (150g)", calories: 70, protein: 1, carbs: 18, fat: 0, emoji: "🍊" },
  ],
  // Light dinner/soups
  dinner_light: [
    { id: "sub_sopa_legumes", title: "Sopa de legumes", description: "1 prato (300ml)", calories: 80, protein: 2.5, carbs: 15, fat: 1, emoji: "🥣" },
    { id: "sub_omelete", title: "Omelete de claras", description: "3 claras + legumes", calories: 120, protein: 15, carbs: 5, fat: 4, emoji: "🍳" },
    { id: "sub_salada_frango", title: "Salada com frango", description: "Salada verde + 80g frango", calories: 150, protein: 25, carbs: 5, fat: 3, emoji: "🥗" },
  ],
};

/** Detect which substitution group an item belongs to */
function detectGroup(item: MealPlanItem): string | null {
  const title = (item.title || "").toLowerCase();
  const mealType = item.meal_type;

  // Breakfast carbs
  if (mealType === "breakfast") {
    if (/p[aã]o|tapioca|cuscuz/.test(title)) return "breakfast_carb";
    if (/ovo|queijo|frango/.test(title)) return "breakfast_protein";
  }

  // Main meals proteins
  if (mealType === "lunch" || mealType === "dinner") {
    if (/frango|carne|peixe|bife|fil[eé]/.test(title)) return "main_protein";
    if (/arroz|macarr[aã]o|pur[eê]|batata/.test(title)) return "main_carb";
    if (/sopa|caldo|leve/.test(title)) return "dinner_light";
  }

  // Fruits in snacks
  if (/banana|ma[cç][aã]|mam[aã]o|laranja|fruta/.test(title)) return "fruit";

  return null;
}

interface Props {
  day: number;
}

export default function MealSubstitutionPanel({ day }: Props) {
  const { items, planId, updateItem } = useMealPlanEditorV2Store();
  const [selectedItem, setSelectedItem] = useState<MealPlanItem | null>(null);
  const [recentlySwapped, setRecentlySwapped] = useState<Set<string>>(new Set());

  const dayItems = items.filter(i => i.day_of_week === day);

  const group = selectedItem ? detectGroup(selectedItem) : null;
  const substitutions = group ? SUBSTITUTION_GROUPS[group] || [] : [];

  const handleSwap = useCallback((sub: SubstitutionOption) => {
    if (!selectedItem || !planId) return;
    
    updateItem(selectedItem.id, {
      title: sub.title,
      description: sub.description,
      calories_target: sub.calories,
      protein_target: sub.protein,
      carbs_target: sub.carbs,
      fat_target: sub.fat,
    });

    setRecentlySwapped(prev => new Set(prev).add(sub.id));
    toast.success(`🔄 Substituído por ${sub.title}`);
    setTimeout(() => {
      setRecentlySwapped(prev => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }, 2000);
  }, [selectedItem, planId, updateItem]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <ArrowLeftRight className="w-4 h-4 text-primary" />
        <p className="text-xs text-muted-foreground">
          Selecione um item do plano para ver substituições equivalentes
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
                  const hasGroup = detectGroup(item) !== null;
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
                          <Flame className="w-2.5 h-2.5 text-orange-400" /> {item.calories_target || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Beef className="w-2.5 h-2.5 text-red-400" /> {Number(item.protein_target) || 0}g
                        </span>
                      </div>
                      {!hasGroup && (
                        <p className="text-[8px] text-muted-foreground mt-1 italic">Sem substituições disponíveis</p>
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
            {selectedItem ? `Substituições para "${selectedItem.title}"` : "Selecione um item"}
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
                <p>Sem substituições mapeadas</p>
              </div>
            ) : (
              <div className="space-y-1.5 pr-2">
                {substitutions.map((sub) => {
                  const isCurrentItem = selectedItem.title.toLowerCase().includes(sub.title.toLowerCase().split(" ")[0]);
                  const wasSwapped = recentlySwapped.has(sub.id);
                  const calDiff = sub.calories - (selectedItem.calories_target || 0);
                  return (
                    <button
                      key={sub.id}
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
                        <span className="text-lg">{sub.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{sub.title}</p>
                            {isCurrentItem && (
                              <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">atual</span>
                            )}
                            {wasSwapped && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                          </div>
                          <p className="text-[9px] text-muted-foreground">{sub.description}</p>
                        </div>
                        {/* Cal diff badge */}
                        {!isCurrentItem && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            Math.abs(calDiff) <= 30 ? "bg-green-500/10 text-green-600" :
                            calDiff > 0 ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                          }`}>
                            {calDiff > 0 ? "+" : ""}{calDiff} kcal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[9px] pl-8">
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-orange-400" /> {sub.calories}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Beef className="w-2.5 h-2.5 text-red-400" /> {sub.protein}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Wheat className="w-2.5 h-2.5 text-amber-500" /> {sub.carbs}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Droplets className="w-2.5 h-2.5 text-blue-400" /> {sub.fat}g
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
