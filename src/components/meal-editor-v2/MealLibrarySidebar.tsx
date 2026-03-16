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

export function MealLibrarySidebar({ open, onOpenChange, targetDay, targetMealType }: MealLibrarySidebarProps) {
  const { user } = useAuth();
  const { planId, addItem } = useMealPlanEditorV2Store();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

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

  const filtered = useMemo(() => {
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

  const handleInsert = useCallback((template: TemplateRow) => {
    if (!planId) return;

    // Parse foods_structure to create individual items
    const foods = Array.isArray(template.foods_structure) ? template.foods_structure : [];

    if (foods.length > 0) {
      foods.forEach((food: any) => {
        addItem({
          meal_plan_id: planId,
          title: food.name || food.title || template.name,
          description: food.portion || food.description || null,
          meal_type: targetMealType,
          day_of_week: targetDay,
          calories_target: food.kcal || food.calories || null,
          protein_target: food.protein || null,
          carbs_target: food.carbs || null,
          fat_target: food.fat || null,
        });
      });
    } else {
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
  }, [planId, targetDay, targetMealType, addItem, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" />
            Biblioteca de Refeições
          </SheetTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou objetivo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </SheetHeader>

        <Tabs value={filterType} onValueChange={setFilterType} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 flex-wrap h-auto gap-1 bg-transparent justify-start">
            <TabsTrigger value="all" className="text-[10px] h-7 px-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Todos
            </TabsTrigger>
            {Object.entries(MEAL_LABELS).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="text-[10px] h-7 px-2.5 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {MEAL_ICONS[key]} {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1 px-4 py-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Nenhum modelo encontrado
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleInsert(t)}
                    className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 p-3 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate flex-1">{t.name}</span>
                      <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        {MEAL_ICONS[t.meal_type]} {MEAL_LABELS[t.meal_type] || t.meal_type}
                      </span>
                      {t.kcal_base && (
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-orange-400" /> {t.kcal_base} kcal
                        </span>
                      )}
                      {t.protein_base && (
                        <span className="flex items-center gap-0.5">
                          <Beef className="w-2.5 h-2.5 text-red-400" /> {Number(t.protein_base).toFixed(0)}g
                        </span>
                      )}
                      {t.is_global && <Badge variant="outline" className="text-[8px] h-4 px-1">Global</Badge>}
                    </div>
                    {Array.isArray(t.goal_tags) && t.goal_tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {t.goal_tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-[8px] h-4 px-1.5">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
