import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Utensils, Plus, Trash2, Copy, Save, ChevronRight, Search,
  Loader2, Check, Calendar, BookTemplate, GripVertical, Flame, Beef, Wheat, Droplets
} from "lucide-react";

interface MealItem {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: string;
}

interface MealBlock {
  type: string;
  label: string;
  emoji: string;
  items: MealItem[];
}

const MEAL_TYPES: MealBlock[] = [
  { type: "breakfast", label: "Café da Manhã", emoji: "☕", items: [] },
  { type: "morning_snack", label: "Lanche da Manhã", emoji: "🍎", items: [] },
  { type: "lunch", label: "Almoço", emoji: "🍽️", items: [] },
  { type: "afternoon_snack", label: "Lanche da Tarde", emoji: "🥤", items: [] },
  { type: "dinner", label: "Jantar", emoji: "🌙", items: [] },
  { type: "supper", label: "Ceia", emoji: "🥛", items: [] },
];

interface Props {
  mealPlanId: string;
  patientId: string;
  sessionId: string;
}

export default function QuickMealEditor({ mealPlanId, patientId, sessionId }: Props) {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<MealBlock[]>(MEAL_TYPES.map(m => ({ ...m, items: [] })));
  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays, setTotalDays] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);

  // Load existing items for current day
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: items } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", mealPlanId)
        .eq("day_of_week", currentDay);

      const newBlocks = MEAL_TYPES.map(m => ({
        ...m,
        items: (items || [])
          .filter((i: any) => i.meal_type === m.type)
          .map((i: any) => ({
            id: i.id,
            name: i.food_name || i.name || "Item",
            quantity: String(i.quantity_grams || i.quantity || "100"),
            unit: "g",
            calories: i.calories || 0,
            protein: i.protein || 0,
            carbs: i.carbs || 0,
            fat: i.fat || 0,
            meal_type: m.type,
          })),
      }));
      setBlocks(newBlocks);
      setLoading(false);
    })();
  }, [mealPlanId, currentDay]);

  // Search foods
  const searchFoods = useCallback(async (query: string) => {
    if (query.length < 2) { setFoodResults([]); return; }
    setSearchLoading(true);
    const { data } = await supabase
      .from("food_database")
      .select("id, name, calories, protein, carbs, fat, serving_size, serving_unit")
      .ilike("name", `%${query}%`)
      .limit(20);
    setFoodResults(data || []);
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchFoods(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchFoods]);

  // Add food to block
  const addFoodToBlock = async (blockType: string, food: any) => {
    const newItem: MealItem = {
      name: food.name,
      quantity: String(food.serving_size || "100"),
      unit: food.serving_unit || "g",
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      meal_type: blockType,
    };

    // Persist
    const { data: np } = await supabase
      .from("nutritionist_patients")
      .select("tenant_id")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user!.id)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("meal_plan_items")
      .insert({
        meal_plan_id: mealPlanId,
        meal_type: blockType,
        food_name: food.name,
        quantity_grams: parseFloat(newItem.quantity) || 100,
        calories: newItem.calories,
        protein: newItem.protein,
        carbs: newItem.carbs,
        fat: newItem.fat,
        day_of_week: currentDay,
        tenant_id: np?.tenant_id || null,
      })
      .select("id")
      .single();

    if (!error && inserted) {
      newItem.id = inserted.id;
      setBlocks(prev => prev.map(b =>
        b.type === blockType ? { ...b, items: [...b.items, newItem] } : b
      ));
    }
  };

  // Remove item
  const removeItem = async (blockType: string, itemId: string) => {
    await supabase.from("meal_plan_items").delete().eq("id", itemId);
    setBlocks(prev => prev.map(b =>
      b.type === blockType ? { ...b, items: b.items.filter(i => i.id !== itemId) } : b
    ));
  };

  // Duplicate day
  const duplicateDay = async () => {
    setSaving(true);
    const nextDay = currentDay + 1;
    const allItems = blocks.flatMap(b => b.items);

    const { data: np } = await supabase
      .from("nutritionist_patients")
      .select("tenant_id")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user!.id)
      .maybeSingle();

    const inserts = allItems.map(item => ({
      meal_plan_id: mealPlanId,
      meal_type: item.meal_type,
      food_name: item.name,
      quantity_grams: parseFloat(item.quantity) || 100,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      day_of_week: nextDay,
      tenant_id: np?.tenant_id || null,
    }));

    if (inserts.length > 0) {
      await supabase.from("meal_plan_items").insert(inserts);
    }
    setTotalDays(Math.max(totalDays, nextDay));
    setCurrentDay(nextDay);
    toast.success(`Dia ${currentDay} duplicado para Dia ${nextDay}`);
    setSaving(false);
  };

  // Apply to all week
  const applyToWeek = async () => {
    setSaving(true);
    const allItems = blocks.flatMap(b => b.items);
    const { data: np } = await supabase
      .from("nutritionist_patients")
      .select("tenant_id")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user!.id)
      .maybeSingle();

    for (let day = 1; day <= 7; day++) {
      if (day === currentDay) continue;
      // Delete existing items for that day
      await supabase.from("meal_plan_items").delete().eq("meal_plan_id", mealPlanId).eq("day_of_week", day);
      const inserts = allItems.map(item => ({
        meal_plan_id: mealPlanId,
        meal_type: item.meal_type,
        food_name: item.name,
        quantity_grams: parseFloat(item.quantity) || 100,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        day_of_week: day,
        tenant_id: np?.tenant_id || null,
      }));
      if (inserts.length > 0) await supabase.from("meal_plan_items").insert(inserts);
    }
    setTotalDays(7);
    toast.success("Plano aplicado para a semana toda!");
    setSaving(false);
  };

  // Save as template
  const saveAsTemplate = async () => {
    if (!templateName.trim() || !user?.id) return;
    const { data: np } = await supabase
      .from("nutritionist_patients")
      .select("tenant_id")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user.id)
      .maybeSingle();

    const templateItems = blocks.flatMap(b => b.items.map(i => ({ ...i, meal_type: b.type })));
    await supabase.from("quick_meal_templates" as any).insert({
      nutritionist_id: user.id,
      tenant_id: np?.tenant_id || "",
      template_name: templateName,
      template_type: "day",
      items: templateItems,
      total_calories: totalMacros.calories,
      total_protein: totalMacros.protein,
      total_carbs: totalMacros.carbs,
      total_fat: totalMacros.fat,
    } as any);
    setShowTemplateSave(false);
    setTemplateName("");
    toast.success("Template salvo!");
  };

  // Totals
  const totalMacros = useMemo(() => {
    const all = blocks.flatMap(b => b.items);
    return {
      calories: all.reduce((s, i) => s + (i.calories || 0), 0),
      protein: all.reduce((s, i) => s + (i.protein || 0), 0),
      carbs: all.reduce((s, i) => s + (i.carbs || 0), 0),
      fat: all.reduce((s, i) => s + (i.fat || 0), 0),
    };
  }, [blocks]);

  const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Day selector + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {Array.from({ length: Math.max(totalDays, 7) }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentDay === day ? "bg-primary text-primary-foreground shadow" : "hover:bg-background"
              }`}
            >
              {DAY_LABELS[day - 1] || `D${day}`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={duplicateDay} disabled={saving} className="gap-1 text-xs">
            <Copy className="w-3 h-3" /> Duplicar dia
          </Button>
          <Button variant="outline" size="sm" onClick={applyToWeek} disabled={saving} className="gap-1 text-xs">
            <Calendar className="w-3 h-3" /> Aplicar semana
          </Button>
          <Dialog open={showTemplateSave} onOpenChange={setShowTemplateSave}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <BookTemplate className="w-3 h-3" /> Salvar template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Salvar como Template</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Nome do template (ex: Dia Low Carb)"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                />
                <Button onClick={saveAsTemplate} className="w-full gap-2" disabled={!templateName.trim()}>
                  <Save className="w-4 h-4" /> Salvar Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Macro summary bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Calorias", value: totalMacros.calories, unit: "kcal", icon: Flame, color: "text-amber-500" },
          { label: "Proteína", value: totalMacros.protein, unit: "g", icon: Beef, color: "text-red-500" },
          { label: "Carboidratos", value: totalMacros.carbs, unit: "g", icon: Wheat, color: "text-yellow-600" },
          { label: "Gordura", value: totalMacros.fat, unit: "g", icon: Droplets, color: "text-blue-500" },
        ].map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto ${m.color}`} />
              <p className="text-lg font-bold mt-1">{Math.round(m.value)}</p>
              <p className="text-[10px] text-muted-foreground">{m.unit}</p>
            </div>
          );
        })}
      </div>

      {/* Meal blocks grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {blocks.map(block => {
          const blockCals = block.items.reduce((s, i) => s + (i.calories || 0), 0);
          return (
            <Card key={block.type} className="border-border/50">
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{block.emoji}</span>
                    {block.label}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{Math.round(blockCals)} kcal</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {block.items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum item adicionado</p>
                )}
                {block.items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 group">
                    <GripVertical className="w-3 h-3 text-muted-foreground/30" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.quantity}{item.unit} · {Math.round(item.calories)}kcal · P{Math.round(item.protein)}g · C{Math.round(item.carbs)}g · G{Math.round(item.fat)}g
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => item.id && removeItem(block.type, item.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}

                {/* Add button - opens food search */}
                <Dialog open={addingTo === block.type} onOpenChange={open => { setAddingTo(open ? block.type : null); setSearchQuery(""); setFoodResults([]); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-1 text-xs border-dashed">
                      <Plus className="w-3 h-3" /> Adicionar alimento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <span className="text-lg">{block.emoji}</span> Adicionar a {block.label}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar alimento..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-9"
                          autoFocus
                        />
                      </div>
                      <ScrollArea className="max-h-64">
                        {searchLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
                        {foodResults.map(food => (
                          <button
                            key={food.id}
                            onClick={() => { addFoodToBlock(block.type, food); setAddingTo(null); }}
                            className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium">{food.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {food.serving_size}{food.serving_unit} · {Math.round(food.calories)}kcal · P{Math.round(food.protein)}g
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-primary" />
                          </button>
                        ))}
                        {!searchLoading && searchQuery.length >= 2 && foodResults.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum alimento encontrado</p>
                        )}
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
