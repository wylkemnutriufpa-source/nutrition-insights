import { useState, useEffect, useMemo, useCallback } from "react";
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
  Library, FileDown, Wheat, Droplets,
} from "lucide-react";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState<"my" | "prebuilt">("my");

  // Load nutritionist templates
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setLoading(true);

    supabase
      .from("nutritionist_meal_templates")
      .select("*")
      .or(`nutritionist_id.eq.${user.id},is_global.eq.true`)
      .order("usage_count", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (!cancelled) {
          setTemplates((data || []) as TemplateRow[]);
          setLoading(false);
        }
      });

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
    if (filterType !== "all") {
      list = list.filter((t) => t.meal_type === filterType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (Array.isArray(t.goal_tags) && t.goal_tags.some((tag: string) => tag.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [templates, filterType, search]);

  // Filter diet templates
  const filteredDietTemplates = useMemo(() => {
    if (!search.trim()) return dietTemplates;
    const q = search.toLowerCase();
    return dietTemplates.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.diet_style?.toLowerCase().includes(q) ||
      t.goal_category?.toLowerCase().includes(q) ||
      (Array.isArray(t.clinical_tags) && t.clinical_tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  }, [dietTemplates, search]);

  // Insert nutritionist template (1-click)
  const handleInsertTemplate = useCallback((template: TemplateRow) => {
    if (!planId) return;

    const foods = Array.isArray(template.foods_structure) ? template.foods_structure : [];

    if (foods.length > 0) {
      // Clear existing items in this cell
      const existingIds = items
        .filter((i) => i.day_of_week === targetDay && i.meal_type === targetMealType)
        .map((i) => i.id);
      existingIds.forEach((id) => deleteItem(id));

      const inserts = foods.map((food: any) => ({
        meal_plan_id: planId,
        title: food.name || food.title || template.name,
        description: food.portion || food.description || null,
        meal_type: targetMealType,
        day_of_week: targetDay,
        calories_target: food.kcal || food.calories || null,
        protein_target: food.protein || null,
        carbs_target: food.carbs || null,
        fat_target: food.fat || null,
      }));
      addItems(inserts);
    } else {
      // Clear existing items in this cell
      const existingIds = items
        .filter((i) => i.day_of_week === targetDay && i.meal_type === targetMealType)
        .map((i) => i.id);
      existingIds.forEach((id) => deleteItem(id));

      addItem({
        meal_plan_id: planId,
        title: template.name,
        description: null,
        meal_type: targetMealType,
        day_of_week: targetDay,
        calories_target: template.kcal_base,
        protein_target: template.protein_base,
        carbs_target: template.carbs_base,
        fat_target: template.fat_base,
      });
    }

    // Increment usage count (fire-and-forget)
    supabase
      .from("nutritionist_meal_templates")
      .update({ usage_count: (template.usage_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", template.id)
      .then();

    toast.success(`"${template.name}" inserido no plano`);
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
        const foods = Array.isArray(meal.foods) ? meal.foods : Array.isArray(meal.items) ? meal.items : [];
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
              <div className="space-y-2">
                {filteredDietTemplates.map((dt) => (
                  <DietTemplateCard key={dt.id} template={dt} onImport={handleImportDietTemplate} />
                ))}
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
  return (
    <button
      type="button"
      onClick={() => onInsert(template)}
      className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 p-3 transition-all group"
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
            <Flame className="w-2.5 h-2.5 text-orange-400" /> {template.kcal_base} kcal
          </span>
        )}
        {template.protein_base != null && (
          <span className="flex items-center gap-0.5">
            <Beef className="w-2.5 h-2.5 text-red-400" /> {Number(template.protein_base).toFixed(0)}g
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
          <Flame className="w-2.5 h-2.5 text-orange-400" /> {template.base_calories} kcal
        </span>
        {macros && (
          <>
            <span className="flex items-center gap-0.5">
              <Beef className="w-2.5 h-2.5 text-red-400" /> {macros.protein || 0}%
            </span>
            <span className="flex items-center gap-0.5">
              <Wheat className="w-2.5 h-2.5 text-amber-500" /> {macros.carbs || 0}%
            </span>
            <span className="flex items-center gap-0.5">
              <Droplets className="w-2.5 h-2.5 text-blue-400" /> {macros.fat || 0}%
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
