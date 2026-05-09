import { useState, useEffect, useMemo, useCallback } from "react";
import { getVariedFoodName } from "@/lib/mealVariationEngine";
import { getSubstitutionsFor } from "@/lib/mealPlanFoodRules";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMealPlanEditorV2Store, type MealType } from "@/stores/mealPlanEditorV2Store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Coffee, Apple, Utensils, Cookie, Moon, Sun,
  Flame, Beef, Loader2, Plus, BookOpen, User, Zap,
  Library, FileDown, Wheat, Droplets, Check, AlertTriangle, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMacro } from "@/lib/formatMacros";

interface MealLibrarySidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDay: number;
  targetMealType: MealType;
}

interface TemplateRow {
  id: string;
  name: string;
  meal_type: string;
  kcal_base: number | null;
  protein_base: number | null;
  carbs_base: number | null;
  fat_base: number | null;
  foods_structure: any;
  goal_tags: any;
  is_global: boolean | null;
  usage_count: number | null;
  nutritionist_id: string;
  is_recipe?: boolean;
}

interface DietTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  diet_style: string;
  goal_category: string;
  base_calories: number;
  macro_ratio: any;
  meals: any;
  meal_distribution: any;
  clinical_tags: string[];
  complexity_level: string;
  icon: string;
  template_generation?: string;
}

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="w-3.5 h-3.5" />,
  morning_snack: <Apple className="w-3.5 h-3.5" />,
  lunch: <Utensils className="w-3.5 h-3.5" />,
  afternoon_snack: <Cookie className="w-3.5 h-3.5" />,
  dinner: <Moon className="w-3.5 h-3.5" />,
  evening_snack: <Sun className="w-3.5 h-3.5" />,
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche Tarde",
  dinner: "Jantar",
  evening_snack: "Ceia",
};

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Emagrecimento",
  muscle_gain: "Hipertrofia",
  maintenance: "Manutenção",
  health: "Saúde",
  performance: "Performance",
  clinical: "Clínico",
  metabolic_reset: "Reset Metabólico",
};

export function MealLibrarySidebar({ open, onOpenChange, targetDay, targetMealType }: MealLibrarySidebarProps) {
  const { user } = useAuth();
  const { planId, items, addItem, addItems, deleteItem } = useMealPlanEditorV2Store();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [dietTemplates, setDietTemplates] = useState<DietTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDiet, setLoadingDiet] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterObjective, setFilterObjective] = useState<string>("all");
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "prebuilt">("my");

  // Load nutritionist templates & recipes (marmitas)
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setLoading(true);

    const loadAll = async () => {
      try {
        const [templatesRes, recipesRes] = await Promise.all([
          supabase
            .from("nutritionist_meal_templates")
            .select("*")
            .or(`nutritionist_id.eq.${user.id},is_global.eq.true`)
            .order("usage_count", { ascending: false, nullsFirst: false }),
          supabase
            .from("meal_recipes")
            .select("*")
            .eq("nutritionist_id", user.id)
            .eq("is_active", true)
        ]);

        if (cancelled) return;

        const baseTemplates = (templatesRes.data || []) as TemplateRow[];
        
        // Transform recipes into TemplateRow format
        const recipeTemplates: TemplateRow[] = (recipesRes.data || []).map(r => {
          const mType = r.meal_type?.toLowerCase();
          let mealType = "lunch";
          if (mType?.includes("jantar")) mealType = "dinner";
          
          return {
            id: r.id,
            name: r.name,
            meal_type: mealType,
            kcal_base: r.fixed_calories || 0,
            protein_base: r.fixed_protein || 0,
            carbs_base: r.fixed_carbs || 0,
            fat_base: r.fixed_fat || 0,
            foods_structure: Array.isArray(r.foods_json) ? r.foods_json.map((f: any) => ({
              name: f.name || f.food || "Alimento",
              portion: f.grams ? `${f.grams}g` : (f.portion || "1 porção"),
              calories: f.calories || 0,
              protein: f.protein || 0,
              carbs: f.carbs || 0,
              fat: f.fat || 0
            })) : [],
            goal_tags: r.is_fixed ? ["Marmita", "Fixa"] : ["Receita"],
            is_global: false,
            usage_count: 0,
            nutritionist_id: r.nutritionist_id
          };
        });

        setTemplates([...baseTemplates, ...recipeTemplates]);
      } catch (err) {
        console.error("Error loading templates/recipes:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();

    return () => { cancelled = true; };
  }, [open, user?.id]);

  // Load diet templates (pre-built)
  useEffect(() => {
    if (!open || activeTab !== "prebuilt") return;
    if (dietTemplates.length > 0) return; // already loaded
    let cancelled = false;
    setLoadingDiet(true);

    supabase
      .from("diet_templates")
      .select("id,name,slug,category,diet_style,goal_category,base_calories,macro_ratio,meals,meal_distribution,clinical_tags,complexity_level,icon,template_generation")
      .eq("is_active", true)
      .order("template_generation", { ascending: false })
      .order("name")
      .then(({ data }) => {
        if (!cancelled) {
          setDietTemplates((data || []) as DietTemplate[]);
          setLoadingDiet(false);
        }
      });

    return () => { cancelled = true; };
  }, [open, activeTab, dietTemplates.length]);

  // Filter nutritionist templates
  const filteredTemplates = useMemo(() => {
    let list = templates;
    
    // Auto-filter by meal type if enabled
    if (showOnlyCompatible) {
      list = list.filter((t) => t.meal_type === targetMealType);
    } else if (filterType !== "all") {
      list = list.filter((t) => t.meal_type === filterType);
    }

    // Filter by objective tags
    if (filterObjective !== "all") {
      const q = filterObjective === "definition" ? "definição" : filterObjective === "gain" ? "ganho" : "manutenção";
      list = list.filter((t) =>
        (Array.isArray(t.goal_tags) && t.goal_tags.some((tag: string) => tag.toLowerCase().includes(q)))
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (Array.isArray(t.goal_tags) && t.goal_tags.some((tag: string) => tag.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [templates, filterType, search, filterObjective, showOnlyCompatible, targetMealType]);

  // Filter diet templates
  const filteredDietTemplates = useMemo(() => {
    let list = dietTemplates;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.diet_style?.toLowerCase().includes(q) ||
        t.goal_category?.toLowerCase().includes(q) ||
        (Array.isArray(t.clinical_tags) && t.clinical_tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [dietTemplates, search]);

  const officialDietTemplates = useMemo(() => filteredDietTemplates.filter(t => t.template_generation === 'official_v2'), [filteredDietTemplates]);
  const legacyDietTemplates = useMemo(() => filteredDietTemplates.filter(t => t.template_generation !== 'official_v2'), [filteredDietTemplates]);
  const [showLegacyDiet, setShowLegacyDiet] = useState(false);

  const handleInsertTemplate = useCallback((template: TemplateRow) => {
    if (!planId) return;

    const isWeeklyMode = (useMealPlanEditorV2Store.getState().plan as any)?.plan_mode === "weekly";
    const daysToApply = isWeeklyMode ? [0, 1, 2, 3, 4, 5, 6] : [targetDay];
    const substitutionCount = useMealPlanEditorV2Store.getState().substitutionCount || 0;

    daysToApply.forEach((day) => {
      const foods = Array.isArray(template.foods_structure) ? template.foods_structure : [];

      if (foods.length > 0) {
        // Clear existing items in this cell
        const existingIds = items
          .filter((i) => i.day_of_week === day && i.meal_type === targetMealType)
          .map((i) => i.id);
        existingIds.forEach((id) => deleteItem(id));

        const inserts = foods.map((food: any) => {
          let foodName = food.name || food.title || template.name;
          if (isWeeklyMode && day > 0) {
            foodName = getVariedFoodName(foodName, day);
          }

          // Generate substitutions for the food
          let alts = getSubstitutionsFor(foodName).slice(0, substitutionCount);
          const subText = alts.length > 0 ? `\n\n🔄 Substituições:\n• ${foodName} → ${alts.join(", ")}` : "";

          return {
            meal_plan_id: planId,
            title: foodName,
            description: (food.portion || food.description || "") + subText,
            meal_type: targetMealType,
            day_of_week: day,
            calories_target: food.kcal || food.calories || null,
            protein_target: food.protein || null,
            carbs_target: food.carbs || null,
            fat_target: food.fat || null,
            edit_metadata: {
              is_fixed: Array.isArray(template.goal_tags) && template.goal_tags.includes("Fixa"),
              original_recipe_id: template.is_recipe ? template.id : null,
              portion_base: food.portion,
              kcal_base: food.kcal || food.calories || null,
              protein_base: food.protein || null,
              carbs_base: food.carbs || null,
              fat_base: food.fat || null,
              substitutions_json: alts
            } as any,
          };
        });
        addItems(inserts);
      } else {
        // Clear existing items in this cell
        const existingIds = items
          .filter((i) => i.day_of_week === day && i.meal_type === targetMealType)
          .map((i) => i.id);
        existingIds.forEach((id) => deleteItem(id));

        let templateName = template.name;
        if (isWeeklyMode && day > 0) {
          templateName = getVariedFoodName(templateName, day);
        }

        addItem({
          meal_plan_id: planId,
          title: templateName,
          description: null,
          meal_type: targetMealType,
          day_of_week: day,
          calories_target: template.kcal_base,
          protein_target: template.protein_base,
          carbs_target: template.carbs_base,
          fat_target: template.fat_base,
          edit_metadata: {
            is_fixed: Array.isArray(template.goal_tags) && template.goal_tags.includes("Fixa"),
            original_recipe_id: template.is_recipe ? template.id : null,
            foods_json: template.foods_structure,
            kcal_base: template.kcal_base,
            protein_base: template.protein_base,
            carbs_base: template.carbs_base,
            fat_base: template.fat_base,
          } as any,
        });
      }
    });

    // Increment usage count for non-recipe templates (fire-and-forget)
    if (!template.is_recipe) {
      supabase
        .from("nutritionist_meal_templates")
        .update({ usage_count: (template.usage_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", template.id)
        .then();
    }

    if (isWeeklyMode) {
      toast.success(`"${template.name}" inserido nos 7 dias com variações`);
    } else {
      toast.success(`"${template.name}" inserido no plano`);
    }
    onOpenChange(false);
  }, [planId, targetDay, targetMealType, addItem, addItems, deleteItem, items, onOpenChange]);

  // Import diet template — inserts meals for target meal type into target day
  const handleImportDietTemplate = useCallback((template: DietTemplate) => {
    if (!planId) return;

    const meals = Array.isArray(template.meals) ? template.meals : [];
    // Find meals matching the target meal_type
    const matchingMeals = meals.filter((m: any) => {
      const mt = m.meal_type || m.type;
      return mt === targetMealType;
    });

    if (matchingMeals.length > 0) {
      const allFoods = matchingMeals.flatMap((meal: any) => {
        // Adapter v2: templates práticos usam `blocks` em vez de `foods`.
        // Achata cada bloco usando a primeira `option` como item principal.
        let foods: any[] = Array.isArray(meal.foods)
          ? meal.foods
          : Array.isArray(meal.items)
            ? meal.items
            : [];

        if (foods.length === 0 && Array.isArray(meal.blocks) && meal.blocks.length > 0) {
          foods = meal.blocks.flatMap((b: any) => {
            const opts = Array.isArray(b.options) ? b.options : [];
            if (opts.length === 0) return [];
            const primary = opts[0];
            return [{
              name: primary.name,
              portion: primary.portion || b.base_quantity || "",
              calories: primary.calories || 0,
              protein: primary.protein || 0,
              carbs: primary.carbs || 0,
              fat: primary.fat || 0,
            }];
          });
        }

        return foods.map((food: any) => ({
          meal_plan_id: planId,
          title: food.name || food.title || meal.name || template.name,
          description: food.portion || food.serving || food.description || null,
          meal_type: targetMealType,
          day_of_week: targetDay,
          calories_target: food.kcal || food.calories || null,
          protein_target: food.protein || null,
          carbs_target: food.carbs || null,
          fat_target: food.fat || null,
        }));
      });

      if (allFoods.length > 0) {
        // Clear existing items in this cell
        const existingIds = items
          .filter((i) => i.day_of_week === targetDay && i.meal_type === targetMealType)
          .map((i) => i.id);
        existingIds.forEach((id) => deleteItem(id));

        addItems(allFoods);
        toast.success(`${allFoods.length} itens importados de "${template.name}"`);
        onOpenChange(false);
        return;
      }
    }

    // Clear existing items in this cell for fallback
    const existingFallbackIds = items
      .filter((i) => i.day_of_week === targetDay && i.meal_type === targetMealType)
      .map((i) => i.id);
    existingFallbackIds.forEach((id) => deleteItem(id));

    // Fallback: insert distribution-based entry
    const distribution = template.meal_distribution as Record<string, number> | null;
    const pct = distribution?.[targetMealType] || 0.2;
    const kcal = Math.round(template.base_calories * pct);
    const macros = template.macro_ratio as { protein?: number; carbs?: number; fat?: number } | null;
    const protPct = (macros?.protein || 30) / 100;
    const carbPct = (macros?.carbs || 40) / 100;
    const fatPct = (macros?.fat || 30) / 100;

    addItem({
      meal_plan_id: planId,
      title: `${template.name} — ${MEAL_LABELS[targetMealType] || targetMealType}`,
      description: `${template.diet_style} • ${kcal} kcal`,
      meal_type: targetMealType,
      day_of_week: targetDay,
      calories_target: kcal,
      protein_target: Math.round((kcal * protPct) / 4),
      carbs_target: Math.round((kcal * carbPct) / 4),
      fat_target: Math.round((kcal * fatPct) / 9),
    });

    toast.success(`"${template.name}" importado no plano`);
    onOpenChange(false);
  }, [planId, targetDay, targetMealType, addItem, addItems, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[460px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" />
            Biblioteca de Refeições
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground">
            Inserir em: <strong>{MEAL_LABELS[targetMealType]}</strong> • Dia {targetDay === 0 ? "Domingo" : ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][targetDay - 1]}
          </p>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, tag ou objetivo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </SheetHeader>

        {/* Source tabs: My Templates vs Pre-built */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("my")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "my"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Meus Modelos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prebuilt")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "prebuilt"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            Modelos Pré-Prontos
          </button>
        </div>

        {/* My Templates Tab */}
        {activeTab === "my" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Meal type filter chips */}
            <div className="px-4 pt-2 pb-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`text-[10px] h-7 px-2.5 rounded-md font-medium transition-colors ${
                  filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                Todos
              </button>
              {Object.entries(MEAL_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterType(key)}
                  className={`text-[10px] h-7 px-2.5 rounded-md font-medium flex items-center gap-1 transition-colors ${
                    filterType === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {MEAL_ICONS[key]} {label}
                </button>
              ))}
            </div>

            <div className="px-4 py-2 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Objetivo</span>
                <div className="flex gap-1">
                  {["all", "definition", "gain", "maintenance"].map((obj) => (
                    <button
                      key={obj}
                      onClick={() => setFilterObjective(obj)}
                      className={`text-[9px] px-2 py-1 rounded-full border transition-colors ${
                        filterObjective === obj 
                          ? "bg-primary/10 border-primary text-primary" 
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {obj === "all" ? "Todos" : obj === "definition" ? "Definição" : obj === "gain" ? "Ganho" : "Manutenção"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Compatibilidade</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div 
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors ${showOnlyCompatible ? "bg-primary" : "bg-muted"}`}
                    onClick={() => setShowOnlyCompatible(!showOnlyCompatible)}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${showOnlyCompatible ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Auto-filtrar</span>
                </label>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Nenhum modelo encontrado</p>
                  <p className="text-[10px] mt-1">Salve refeições como modelo para reutilizar aqui</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((t) => (
                    <TemplateCard key={t.id} template={t} onInsert={handleInsertTemplate} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Pre-built Templates Tab */}
        {activeTab === "prebuilt" && (
          <ScrollArea className="flex-1 px-4 py-2">
            {loadingDiet ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filteredDietTemplates.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Library className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Nenhum template pré-pronto disponível</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Official V2 */}
                {officialDietTemplates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Badge className="bg-primary/10 text-primary border-primary/30 text-[8px] h-5 gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Verificados
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{officialDietTemplates.length}</span>
                    </div>
                    <div className="space-y-2">
                      {officialDietTemplates.map((dt) => (
                        <DietTemplateCard key={dt.id} template={dt} onImport={handleImportDietTemplate} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy */}
                {legacyDietTemplates.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowLegacyDiet(!showLegacyDiet)}
                      className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Badge variant="outline" className="text-[8px] h-5 gap-0.5 text-muted-foreground">
                        <AlertTriangle className="w-2.5 h-2.5" /> Legado
                      </Badge>
                      <span>{legacyDietTemplates.length} antigos</span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${showLegacyDiet ? 'rotate-90' : ''}`} />
                    </button>
                    {showLegacyDiet && (
                      <div className="space-y-2 opacity-60">
                        {legacyDietTemplates.map((dt) => (
                          <DietTemplateCard key={dt.id} template={dt} onImport={handleImportDietTemplate} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Nutritionist Template Card ────────────────────────────────
function TemplateCard({ template, onInsert }: { template: TemplateRow; onInsert: (t: TemplateRow) => void }) {
  const isFixed = Array.isArray(template.goal_tags) && template.goal_tags.includes("Fixa");

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onInsert(template)}
        className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 p-3 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate flex-1">{template.name}</span>
          <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            {MEAL_ICONS[template.meal_type]} {MEAL_LABELS[template.meal_type] || template.meal_type}
          </span>
          {template.kcal_base != null && (
            <span className="flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5 text-orange-400" /> {fmtMacro(template.kcal_base)} kcal
            </span>
          )}
          {template.protein_base != null && (
            <span className="flex items-center gap-0.5">
              <Beef className="w-2.5 h-2.5 text-red-400" /> {fmtMacro(template.protein_base)}g
            </span>
          )}
          {template.is_global && <Badge variant="outline" className="text-[8px] h-4 px-1">Global</Badge>}
        </div>
        {Array.isArray(template.goal_tags) && template.goal_tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {template.goal_tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[8px] h-4 px-1.5">{tag}</Badge>
            ))}
          </div>
        )}
      </button>

      {isFixed && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute right-2 bottom-2 h-7 text-[9px] gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onInsert(template);
          }}
        >
          <Zap className="w-3 h-3" />
          Adicionar ao editor
        </Button>
      )}
    </div>
  );
}

// ── Diet Template Card (Pre-built) ───────────────────────────
function DietTemplateCard({ template, onImport }: { template: DietTemplate; onImport: (t: DietTemplate) => void }) {
  const macros = template.macro_ratio as { protein?: number; carbs?: number; fat?: number } | null;

  return (
    <button
      type="button"
      onClick={() => onImport(template)}
      className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 p-3 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{template.icon || "🍽️"}</span>
          <span className="font-medium text-sm truncate">{template.name}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <FileDown className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
        <Badge variant="outline" className="text-[8px] h-4 px-1.5">{template.diet_style}</Badge>
        <Badge variant="outline" className="text-[8px] h-4 px-1.5">{GOAL_LABELS[template.goal_category] || template.goal_category}</Badge>
        <span className="flex items-center gap-0.5">
          <Flame className="w-2.5 h-2.5 text-orange-400" /> {fmtMacro(template.base_calories)} kcal
        </span>
        {macros && (
          <>
            <span className="flex items-center gap-0.5">
              <Beef className="w-2.5 h-2.5 text-red-400" /> {fmtMacro(macros.protein)}%
            </span>
            <span className="flex items-center gap-0.5">
              <Wheat className="w-2.5 h-2.5 text-amber-500" /> {fmtMacro(macros.carbs)}%
            </span>
            <span className="flex items-center gap-0.5">
              <Droplets className="w-2.5 h-2.5 text-blue-400" /> {fmtMacro(macros.fat)}%
            </span>
          </>
        )}
      </div>
      {Array.isArray(template.clinical_tags) && template.clinical_tags.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {template.clinical_tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[8px] h-4 px-1.5">{tag}</Badge>
          ))}
        </div>
      )}
    </button>
  );
}
