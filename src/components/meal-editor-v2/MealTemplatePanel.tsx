/**
 * MealTemplatePanel — Phase 3: Meal templates
 * 
 * Pre-built meal templates that add a complete meal with one click.
 * Templates are composed of multiple foods with calculated macros.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { useMealPlanEditorV2Store, type MealType } from "@/stores/mealPlanEditorV2Store";
import { getSubstitutionsFor } from "@/lib/mealPlanFoodRules";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Flame, Beef, Wheat, Droplets, Check, Sparkles,
  ChefHat, Loader2, ClipboardCheck, Info, X
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TemplateFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealTemplate {
  id: string;
  title: string;
  description: string;
  mealTypes: MealType[];
  foods: TemplateFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  emoji: string;
}

// ── Pre-built templates (Brazilian staples) ────────────────
export const MEAL_TEMPLATES: MealTemplate[] = [
  // Breakfast
  {
    id: "t_pao_ovo_cafe",
    title: "Pão com Ovo + Café",
    description: "Pão francês, ovo mexido e café com leite",
    mealTypes: ["breakfast"],
    emoji: "🍳",
    foods: [
      { name: "Pão francês", portion: "1 unidade (50g)", calories: 150, protein: 5, carbs: 28, fat: 2 },
      { name: "Ovo mexido", portion: "2 unidades", calories: 180, protein: 12, carbs: 1, fat: 14 },
      { name: "Café com leite", portion: "200ml", calories: 60, protein: 3, carbs: 6, fat: 3 },
    ],
    totalCalories: 390, totalProtein: 20, totalCarbs: 35, totalFat: 19,
  },
  {
    id: "t_tapioca_queijo",
    title: "Tapioca com Queijo",
    description: "Tapioca com queijo e café preto",
    mealTypes: ["breakfast"],
    emoji: "🫓",
    foods: [
      { name: "Tapioca", portion: "2 colheres (40g)", calories: 140, protein: 0, carbs: 35, fat: 0 },
      { name: "Queijo coalho", portion: "2 fatias (50g)", calories: 160, protein: 11, carbs: 1, fat: 13 },
      { name: "Café preto", portion: "150ml", calories: 5, protein: 0, carbs: 1, fat: 0 },
    ],
    totalCalories: 305, totalProtein: 11, totalCarbs: 37, totalFat: 13,
  },
  {
    id: "t_cuscuz_ovo",
    title: "Cuscuz com Ovo",
    description: "Cuscuz nordestino com ovo e manteiga",
    mealTypes: ["breakfast"],
    emoji: "🌽",
    foods: [
      { name: "Cuscuz", portion: "1 porção (100g)", calories: 170, protein: 4, carbs: 36, fat: 1 },
      { name: "Ovo cozido", portion: "2 unidades", calories: 156, protein: 12, carbs: 1, fat: 11 },
      { name: "Manteiga", portion: "1 colher chá", calories: 36, protein: 0, carbs: 0, fat: 4 },
    ],
    totalCalories: 362, totalProtein: 16, totalCarbs: 37, totalFat: 16,
  },
  // Snacks
  {
    id: "t_fruta_iogurte",
    title: "Frutas com Iogurte",
    description: "Banana, maçã e iogurte natural",
    mealTypes: ["morning_snack", "afternoon_snack"],
    emoji: "🍌",
    foods: [
      { name: "Banana", portion: "1 unidade (100g)", calories: 89, protein: 1, carbs: 23, fat: 0 },
      { name: "Iogurte natural", portion: "170g", calories: 100, protein: 6, carbs: 8, fat: 5 },
    ],
    totalCalories: 189, totalProtein: 7, totalCarbs: 31, totalFat: 5,
  },
  {
    id: "t_fruta_simples",
    title: "Frutas Práticas",
    description: "Banana e maçã",
    mealTypes: ["morning_snack", "afternoon_snack", "evening_snack"],
    emoji: "🍎",
    foods: [
      { name: "Banana", portion: "1 unidade (100g)", calories: 89, protein: 1, carbs: 23, fat: 0 },
      { name: "Maçã", portion: "1 unidade (150g)", calories: 78, protein: 0, carbs: 21, fat: 0 },
    ],
    totalCalories: 167, totalProtein: 1, totalCarbs: 44, totalFat: 0,
  },
  // Lunch
  {
    id: "t_frango_arroz_salada",
    title: "Frango + Arroz + Salada",
    description: "Peito de frango grelhado, arroz, feijão e salada verde",
    mealTypes: ["lunch"],
    emoji: "🍗",
    foods: [
      { name: "Peito de frango grelhado", portion: "150g", calories: 248, protein: 46, carbs: 0, fat: 5 },
      { name: "Arroz branco", portion: "4 colheres (120g)", calories: 155, protein: 3, carbs: 34, fat: 0 },
      { name: "Feijão carioca", portion: "1 concha (86g)", calories: 60, protein: 4, carbs: 10, fat: 0 },
      { name: "Salada verde", portion: "1 porção", calories: 15, protein: 1, carbs: 3, fat: 0 },
    ],
    totalCalories: 478, totalProtein: 54, totalCarbs: 47, totalFat: 5,
  },
  {
    id: "t_carne_pure",
    title: "Carne + Purê + Salada",
    description: "Carne moída, purê de batata e salada",
    mealTypes: ["lunch"],
    emoji: "🥩",
    foods: [
      { name: "Carne moída refogada", portion: "130g", calories: 260, protein: 30, carbs: 0, fat: 15 },
      { name: "Purê de batata", portion: "3 colheres (120g)", calories: 120, protein: 2, carbs: 20, fat: 4 },
      { name: "Salada mista", portion: "1 porção", calories: 25, protein: 1, carbs: 5, fat: 0 },
    ],
    totalCalories: 405, totalProtein: 33, totalCarbs: 25, totalFat: 19,
  },
  {
    id: "t_peixe_legumes",
    title: "Peixe + Legumes",
    description: "Filé de peixe grelhado acompanhado de legumes no vapor",
    mealTypes: ["lunch", "dinner"],
    emoji: "🐟",
    foods: [
      { name: "Filé de peixe grelhado", portion: "150g", calories: 180, protein: 36, carbs: 0, fat: 3 },
      { name: "Legumes no vapor", portion: "150g", calories: 60, protein: 3, carbs: 12, fat: 0.5 },
      { name: "Salada verde", portion: "1 porção", calories: 15, protein: 1, carbs: 3, fat: 0 },
    ],
    totalCalories: 255, totalProtein: 40, totalCarbs: 15, totalFat: 3.5,
  },
  // Dinner (lighter, no beans)
  {
    id: "t_frango_batata_jantar",
    title: "Frango + Batata + Salada",
    description: "Peito de frango, batata cozida e salada (leve)",
    mealTypes: ["dinner"],
    emoji: "🍗",
    foods: [
      { name: "Peito de frango grelhado", portion: "130g", calories: 215, protein: 40, carbs: 0, fat: 4 },
      { name: "Batata cozida", portion: "2 unidades (150g)", calories: 115, protein: 3, carbs: 26, fat: 0 },
      { name: "Salada verde", portion: "1 porção", calories: 15, protein: 1, carbs: 3, fat: 0 },
    ],
    totalCalories: 345, totalProtein: 44, totalCarbs: 29, totalFat: 4,
  },
  {
    id: "t_peixe_pouco_arroz",
    title: "Peixe + Pouco Arroz + Legumes",
    description: "Filé de peixe, porção reduzida de arroz integral e legumes",
    mealTypes: ["dinner"],
    emoji: "🐟",
    foods: [
      { name: "Filé de peixe grelhado", portion: "130g", calories: 156, protein: 31, carbs: 0, fat: 3 },
      { name: "Arroz integral (pouco)", portion: "2 colheres (60g)", calories: 66, protein: 1.5, carbs: 14, fat: 0.5 },
      { name: "Legumes no vapor", portion: "100g", calories: 40, protein: 2, carbs: 8, fat: 0.3 },
    ],
    totalCalories: 262, totalProtein: 34.5, totalCarbs: 22, totalFat: 3.8,
  },
  // Evening snack
  {
    id: "t_cha_fruta",
    title: "Chá + Fruta",
    description: "Chá de camomila e maçã",
    mealTypes: ["evening_snack"],
    emoji: "🫖",
    foods: [
      { name: "Chá de camomila", portion: "200ml", calories: 2, protein: 0, carbs: 0, fat: 0 },
      { name: "Maçã", portion: "1 unidade (150g)", calories: 78, protein: 0, carbs: 21, fat: 0 },
    ],
    totalCalories: 80, totalProtein: 0, totalCarbs: 21, totalFat: 0,
  },
];

const MEAL_TYPE_CONFIG: Record<MealType, { label: string; icon: React.ReactNode }> = {
  breakfast: { label: "Café da Manhã", icon: <Coffee className="w-4 h-4" /> },
  morning_snack: { label: "Lanche Manhã", icon: <Apple className="w-4 h-4" /> },
  lunch: { label: "Almoço", icon: <Utensils className="w-4 h-4" /> },
  afternoon_snack: { label: "Lanche Tarde", icon: <Cookie className="w-4 h-4" /> },
  dinner: { label: "Jantar", icon: <Moon className="w-4 h-4" /> },
  evening_snack: { label: "Ceia", icon: <Sun className="w-4 h-4" /> },
};

const ALL_MEAL_TYPES: MealType[] = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];

interface Props {
  day: number;
}

export default function MealTemplatePanel({ day }: Props) {
  const { user } = useAuth();
  const { planId, addItem, substitutionCount, patientName } = useMealPlanEditorV2Store();
  const [activeMealType, setActiveMealType] = useState<MealType>("breakfast");
  const [recentlyApplied, setRecentlyApplied] = useState<Set<string>>(new Set());
  const [customTemplates, setCustomTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [appliedHistory, setAppliedHistory] = useState<{name: string, date: Date, nutrients: any}[]>([]);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const fetchCustomRecipes = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("meal_recipes")
          .select("*")
          .eq("nutritionist_id", user.id)
          .eq("is_active", true);

        if (error) throw error;

        const transformed: MealTemplate[] = (data || []).map((recipe) => {
          const foods_json = Array.isArray(recipe.foods_json) ? recipe.foods_json : [];
          
          // Map database meal_type to store MealType
          const mType = recipe.meal_type?.toLowerCase();
          const mealTypes: MealType[] = [];
          if (mType?.includes("almoco") || mType?.includes("almoço")) mealTypes.push("lunch");
          if (mType?.includes("jantar")) mealTypes.push("dinner");
          if (mealTypes.length === 0) mealTypes.push("lunch"); // Fallback

          // Calculate totals if not present
          let totalCal = recipe.fixed_calories || 0;
          let totalProt = recipe.fixed_protein || 0;
          let totalCarbs = recipe.fixed_carbs || 0;
          let totalFat = recipe.fixed_fat || 0;

          const foods = foods_json.map((f: any) => ({
            name: f.name || f.food || "Alimento",
            portion: f.grams ? `${f.grams}g` : (f.portion || "1 porção"),
            calories: f.calories || 0,
            protein: f.protein || 0,
            carbs: f.carbs || 0,
            fat: f.fat || 0
          }));

          if (totalCal === 0) {
            foods.forEach(f => {
              totalCal += f.calories;
              totalProt += f.protein;
              totalCarbs += f.carbs;
              totalFat += f.fat;
            });
          }

          return {
            id: recipe.id,
            title: recipe.name,
            description: recipe.is_fixed ? "Marmita Fixa Selecionada" : "Sua receita customizada",
            mealTypes,
            emoji: "🍱",
            foods,
            totalCalories: totalCal,
            totalProtein: totalProt,
            totalCarbs: totalCarbs,
            totalFat: totalFat
          };
        });

        setCustomTemplates(transformed);
      } catch (err) {
        console.error("Error fetching custom recipes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomRecipes();
  }, [user?.id]);

  const allTemplates = useMemo(() => {
    return [...MEAL_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => t.mealTypes.includes(activeMealType));
  }, [allTemplates, activeMealType]);

  const handleApplyTemplate = useCallback((template: MealTemplate) => {
    if (!planId) return;

    // Add as a single composed meal item (1 refeição = 1 linha)
    const mainDescription = template.foods.map(f => `${f.name} (${f.portion})`).join(" + ");
    
    // Generate automatic substitutions for the main ingredients (Phase 3 update)
    const subLines: string[] = [];
    const isWannubia = patientName?.toLowerCase().includes("wannubia");

    template.foods.forEach(f => {
      let alts = getSubstitutionsFor(f.name);
      
      // Aplicar filtros específicos do modelo Wannubia (sem ultraprocessados, etc)
      if (isWannubia) {
        const forbiddenKeywords = ["ultraprocessado", "fritura", "doce", "açúcar", "refrigerante"];
        alts = alts.filter(alt => !forbiddenKeywords.some(key => alt.toLowerCase().includes(key)));
      }

      alts = alts.slice(0, substitutionCount);
      
      if (alts.length > 0) {
        subLines.push(`• ${f.name} → ${alts.join(", ")}`);
      }
    });

    const description = mainDescription + (subLines.length > 0 ? `\n\n🔄 Substituições:\n${subLines.join("\n")}` : "");

    addItem({
      meal_plan_id: planId,
      title: template.title,
      description,
      meal_type: activeMealType,
      day_of_week: 0, // Enforce Day 0 for templates
      calories_target: template.totalCalories,
      protein_target: template.totalProtein,
      carbs_target: template.totalCarbs,
      fat_target: template.totalFat,
      edit_metadata: {
        substitutions_json: subLines,
        is_fixed: template.description === "Marmita Fixa Selecionada",
        kcal_base: template.totalCalories,
        protein_base: template.totalProtein,
        carbs_base: template.totalCarbs,
        fat_base: template.totalFat,
      } as any
    });

    setRecentlyApplied(prev => new Set(prev).add(template.id));
    setAppliedHistory(prev => [...prev, { 
      name: template.title, 
      date: new Date(), 
      nutrients: { kcal: template.totalCalories, protein: template.totalProtein } 
    }]);
    toast.success(`✅ ${template.title} adicionado!`);
    setTimeout(() => {
      setRecentlyApplied(prev => {
        const next = new Set(prev);
        next.delete(template.id);
        return next;
      });
    }, 2000);
  }, [planId, activeMealType, day, addItem]);

  const config = MEAL_TYPE_CONFIG[activeMealType];

  return (
    <div className="flex flex-col h-full">
      {/* Meal type tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3 border-b border-border">
        {ALL_MEAL_TYPES.map((mt) => {
          const cfg = MEAL_TYPE_CONFIG[mt];
          const count = MEAL_TEMPLATES.filter(t => t.mealTypes.includes(mt)).length;
          const isActive = activeMealType === mt;
          return (
            <button
              key={mt}
              type="button"
              onClick={() => setActiveMealType(mt)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cfg.icon}
              <span className="hidden sm:inline">{cfg.label}</span>
              <span className={`text-[9px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            Clique em um template para adicionar a refeição completa
          </p>
        </div>
        
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2 border-primary/20 text-primary hover:bg-primary/5">
              <ClipboardCheck className="w-3.5 h-3.5" /> Relatório
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" /> Relatório de Consistência
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-medium text-primary flex items-center gap-2">
                  <Info className="w-4 h-4" /> Resumo das marmitas fixas inseridas nesta sessão
                </p>
              </div>
              
              <ScrollArea className="max-h-[300px] pr-4">
                {appliedHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma marmita inserida ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {appliedHistory.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl border bg-card space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-bold">{item.name}</p>
                          <span className="text-[10px] text-muted-foreground">{item.date.toLocaleTimeString()}</span>
                        </div>
                        <div className="flex gap-4 text-[11px]">
                          <span className="text-orange-600 font-bold">{item.nutrients.kcal} kcal</span>
                          <span className="text-red-600 font-bold">{item.nutrients.protein}g proteína</span>
                          <span className="text-green-600 ml-auto flex items-center gap-1">
                            <Check className="w-3 h-3" /> Recalculado
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              <Button className="w-full h-11 rounded-xl font-bold" onClick={() => setShowReport(false)}>
                Entendido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Carregando suas marmitas...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Nenhum template para esta refeição</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map((template) => {
              const wasApplied = recentlyApplied.has(template.id);
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleApplyTemplate(template)}
                  className={`w-full text-left rounded-xl border p-3 transition-all hover:shadow-md ${
                    wasApplied
                      ? "border-green-500 bg-green-500/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{template.title}</p>
                        {template.id.length > 20 && (
                          <span className="flex items-center gap-1 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                            {template.description === "Marmita Fixa Selecionada" ? "Marmita Fixa" : "Personalizada"}
                          </span>
                        )}
                        {wasApplied && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        {template.id.length > 20 && <ChefHat className="w-3 h-3 text-primary" />}
                        {template.description}
                      </p>
                      {/* Foods list */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {template.foods.map((f, i) => (
                          <span key={i} className="text-[9px] bg-muted px-1.5 py-0.5 rounded">
                            {f.name} ({f.portion})
                          </span>
                        ))}
                      </div>
                      {/* Macros */}
                      <div className="flex items-center gap-3 mt-2 text-[10px]">
                        <span className="flex items-center gap-0.5 font-bold">
                          <Flame className="w-3 h-3 text-orange-400" /> {template.totalCalories} kcal
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Beef className="w-3 h-3 text-red-400" /> {template.totalProtein}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Wheat className="w-3 h-3 text-amber-500" /> {template.totalCarbs}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Droplets className="w-3 h-3 text-blue-400" /> {template.totalFat}g
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
