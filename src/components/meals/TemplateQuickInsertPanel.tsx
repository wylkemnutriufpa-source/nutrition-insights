import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { scaleMealToTarget, type MealTemplate, type ScaledMeal, type FoodStructureItem } from "@/lib/mealScalingEngine";
import {
  Search, Utensils, Flame, Beef, Wheat, Droplets, Loader2,
  BookOpen, User, Plus, Sparkles, ChevronRight, Zap
} from "lucide-react";
import { toast } from "sonner";

interface TemplateQuickInsertPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: string;
  dayOfWeek: number;
  planId: string;
  patientTargetKcal?: number;
  patientWeight?: number;
  onInserted: (items: any[]) => void;
}

interface TemplateRow {
  id: string;
  name: string;
  meal_type: string;
  kcal_base: number;
  protein_base: number;
  carbs_base: number;
  fat_base: number;
  foods_structure: any;
  goal_tags: any;
  complexity_level: string;
  satiety_score: number;
  is_global: boolean;
  usage_count: number;
  nutritionist_id: string;
}

export default function TemplateQuickInsertPanel({
  open, onOpenChange, mealType, dayOfWeek, planId,
  patientTargetKcal, patientWeight, onInserted
}: TemplateQuickInsertPanelProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [tab, setTab] = useState<"mine" | "global">("mine");
  const [inserting, setInserting] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) loadTemplates();
  }, [open, user]);

  const loadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("nutritionist_meal_templates")
      .select("*")
      .or(`nutritionist_id.eq.${user.id},is_global.eq.true`)
      .order("usage_count", { ascending: false });
    setTemplates((data as TemplateRow[] | null) || []);
    setLoading(false);
  };

  const filteredTemplates = useMemo(() => {
    let list = templates.filter(t => tab === "mine" ? t.nutritionist_id === user?.id : t.is_global);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }

    if (goalFilter !== "all") {
      list = list.filter(t => {
        const tags = (Array.isArray(t.goal_tags) ? t.goal_tags : []) as string[];
        return tags.some(tag => tag.toLowerCase().includes(goalFilter));
      });
    }

    // Prefer matching meal_type
    return list.sort((a, b) => {
      if (a.meal_type === mealType && b.meal_type !== mealType) return -1;
      if (b.meal_type === mealType && a.meal_type !== mealType) return 1;
      return (b.usage_count || 0) - (a.usage_count || 0);
    });
  }, [templates, tab, search, goalFilter, mealType, user]);

  const getScaledPreview = (template: TemplateRow): ScaledMeal | null => {
    if (!patientTargetKcal) return null;
    const foods = Array.isArray(template.foods_structure) ? template.foods_structure as FoodStructureItem[] : [];
    return scaleMealToTarget(
      { ...template, foods_structure: foods } as MealTemplate,
      {
        target_kcal: patientTargetKcal,
        patient_weight_kg: patientWeight,
      }
    );
  };

  const handleInsert = async (template: TemplateRow) => {
    if (!planId) return;
    setInserting(template.id);

    const foods = Array.isArray(template.foods_structure) ? template.foods_structure as FoodStructureItem[] : [];

    // Scale if patient target is available
    let itemsToInsert: any[];
    if (patientTargetKcal && foods.length > 0) {
      const scaled = scaleMealToTarget(
        { ...template, foods_structure: foods } as MealTemplate,
        { target_kcal: patientTargetKcal, patient_weight_kg: patientWeight }
      );
      // Build a single grouped item with all foods listed in description
      const foodDesc = scaled.foods.map(f => `• ${f.name} — ${f.portion_grams}g`).join("\n");
      const totalCal = scaled.foods.reduce((s, f) => s + (f.calories || 0), 0);
      const totalP = scaled.foods.reduce((s, f) => s + (f.protein || 0), 0);
      const totalC = scaled.foods.reduce((s, f) => s + (f.carbs || 0), 0);
      const totalF = scaled.foods.reduce((s, f) => s + (f.fat || 0), 0);
      itemsToInsert = [{
        meal_plan_id: planId,
        title: template.name,
        description: foodDesc,
        meal_type: mealType,
        day_of_week: dayOfWeek,
        calories_target: totalCal,
        protein_target: totalP,
        carbs_target: totalC,
        fat_target: totalF,
      }];
    } else if (foods.length > 0) {
      // Build a single grouped item with all foods listed in description
      const foodDesc = foods.map(f => `• ${f.name} — ${f.portion_grams}g`).join("\n");
      const totalCal = foods.reduce((s, f) => s + (f.calories || 0), 0);
      const totalP = foods.reduce((s, f) => s + (f.protein || 0), 0);
      const totalC = foods.reduce((s, f) => s + (f.carbs || 0), 0);
      const totalF = foods.reduce((s, f) => s + (f.fat || 0), 0);
      itemsToInsert = [{
        meal_plan_id: planId,
        title: template.name,
        description: foodDesc,
        meal_type: mealType,
        day_of_week: dayOfWeek,
        calories_target: totalCal,
        protein_target: totalP,
        carbs_target: totalC,
        fat_target: totalF,
      }];
    } else {
      // Template without food structure → insert as single block with warning
      itemsToInsert = [{
        meal_plan_id: planId,
        title: template.name,
        description: `⚠️ Template sem alimentos definidos — preencha manualmente`,
        meal_type: mealType,
        day_of_week: dayOfWeek,
        calories_target: template.kcal_base,
        protein_target: template.protein_base,
        carbs_target: template.carbs_base,
        fat_target: template.fat_base,
      }];
    }

    const { data, error } = await supabase
      .from("meal_plan_items")
      .insert(itemsToInsert)
      .select();

    if (error) {
      toast.error("Erro ao inserir template: " + error.message);
    } else {
      // Increment usage count
      await supabase
        .from("nutritionist_meal_templates")
        .update({ usage_count: (template.usage_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", template.id);

      toast.success(`${template.name} inserido! (${itemsToInsert.length} itens)`);
      onInserted(data || []);
      onOpenChange(false);
    }
    setInserting(null);
  };

  const goalOptions = ["all", "emagrecimento", "hipertrofia", "manutenção", "saúde", "low carb"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-primary" />
            Inserção Rápida de Template
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 py-3 space-y-3 border-b bg-muted/30">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={v => setTab(v as "mine" | "global")}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="mine" className="text-xs gap-1.5">
                <User className="w-3.5 h-3.5" /> Meus Templates
              </TabsTrigger>
              <TabsTrigger value="global" className="text-xs gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Globais
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Goal filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            {goalOptions.map(g => (
              <Badge
                key={g}
                variant={goalFilter === g ? "default" : "outline"}
                className="cursor-pointer text-[10px] px-2 py-0.5 capitalize"
                onClick={() => setGoalFilter(g)}
              >
                {g === "all" ? "Todos" : g}
              </Badge>
            ))}
          </div>
        </div>

        {/* Template list */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhum template encontrado</p>
                <p className="text-xs mt-1">Crie templates salvando refeições no editor</p>
              </div>
            ) : (
              filteredTemplates.map(template => {
                const isExpanded = previewId === template.id;
                const scaled = isExpanded ? getScaledPreview(template) : null;
                const tags = (Array.isArray(template.goal_tags) ? template.goal_tags : []) as string[];

                return (
                  <div
                    key={template.id}
                    className="rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() => setPreviewId(isExpanded ? null : template.id)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Utensils className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{template.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Flame className="w-3 h-3" /> {template.kcal_base} kcal
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Beef className="w-3 h-3" /> {Math.round(template.protein_base)}g
                          </span>
                          {tags.length > 0 && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {tags[0]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {patientTargetKcal && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            <Sparkles className="w-3 h-3 mr-0.5" />
                            Auto-escala
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={!!inserting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInsert(template);
                          }}
                        >
                          {inserting === template.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded preview */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t pt-2 space-y-2">
                        {scaled ? (
                          <>
                            <p className="text-[10px] font-medium text-primary flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Escalado para {patientTargetKcal} kcal (fator: {scaled.scale_factor}x)
                            </p>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div className="bg-muted/50 rounded p-1.5">
                                <p className="text-[10px] text-muted-foreground">Kcal</p>
                                <p className="text-xs font-bold">{scaled.total_calories}</p>
                              </div>
                              <div className="bg-muted/50 rounded p-1.5">
                                <p className="text-[10px] text-muted-foreground">Prot</p>
                                <p className="text-xs font-bold">{scaled.total_protein}g</p>
                              </div>
                              <div className="bg-muted/50 rounded p-1.5">
                                <p className="text-[10px] text-muted-foreground">Carb</p>
                                <p className="text-xs font-bold">{scaled.total_carbs}g</p>
                              </div>
                              <div className="bg-muted/50 rounded p-1.5">
                                <p className="text-[10px] text-muted-foreground">Gord</p>
                                <p className="text-xs font-bold">{scaled.total_fat}g</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {scaled.foods.map((f, i) => (
                                <div key={i} className="flex justify-between items-center text-[11px] py-0.5">
                                  <span className="text-foreground">{f.name}</span>
                                  <span className="text-muted-foreground">{f.portion_grams}g • {f.calories}kcal</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1">
                            {Array.isArray(template.foods_structure) && (template.foods_structure as FoodStructureItem[]).map((f: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-[11px] py-0.5">
                                <span>{f.name}</span>
                                <span className="text-muted-foreground">{f.portion_grams}g • {f.calories}kcal</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full h-8 text-xs"
                          disabled={!!inserting}
                          onClick={() => handleInsert(template)}
                        >
                          {inserting === template.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 mr-1" />
                          )}
                          Inserir no Plano
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
