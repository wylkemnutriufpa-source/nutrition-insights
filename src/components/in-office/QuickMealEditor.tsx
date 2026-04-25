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
  Plus, Trash2, Copy, Save, Search,
  Loader2, Calendar, BookTemplate, GripVertical, Flame, Beef, Wheat, Droplets,
  Download, Eye, ArrowRight, RefreshCw
} from "lucide-react";
import { withRetry } from "@/lib/retry";
import type { Database } from "@/integrations/supabase/types";

type MealType = Database["public"]["Enums"]["meal_type"];

interface MealItem {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: MealType;
}

interface MealBlock {
  type: MealType;
  label: string;
  emoji: string;
  items: MealItem[];
}

interface SavedTemplate {
  id: string;
  template_name: string;
  template_type: string;
  items: MealItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
}

const MEAL_TYPES: MealBlock[] = [
  { type: "breakfast", label: "Café da Manhã", emoji: "☕", items: [] },
  { type: "morning_snack", label: "Lanche da Manhã", emoji: "🍎", items: [] },
  { type: "lunch", label: "Almoço", emoji: "🍽️", items: [] },
  { type: "afternoon_snack", label: "Lanche da Tarde", emoji: "🥤", items: [] },
  { type: "dinner", label: "Jantar", emoji: "🌙", items: [] },
  { type: "evening_snack", label: "Ceia", emoji: "🥛", items: [] },
];

interface Props {
  mealPlanId: string;
  patientId: string;
  sessionId: string;
  tenantId?: string | null;
}

export default function QuickMealEditor({ mealPlanId, patientId, sessionId, tenantId }: Props) {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<MealBlock[]>(MEAL_TYPES.map(m => ({ ...m, items: [] })));
  const [currentDay, setCurrentDay] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingTo, setAddingTo] = useState<MealType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);

  // Template loading state
  const [showTemplateLoad, setShowTemplateLoad] = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<SavedTemplate | null>(null);

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
          .filter((i) => i.meal_type === m.type)
          .map((i) => ({
            id: i.id,
            name: i.title || "Item",
            calories: i.calories_target || 0,
            protein: i.protein_target || 0,
            carbs: i.carbs_target || 0,
            fat: i.fat_target || 0,
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

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!user?.id) return;
    setTemplatesLoading(true);
    const { data } = await supabase
      .from("quick_meal_templates" as any)
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });
    setTemplates((data as any as SavedTemplate[]) || []);
    setTemplatesLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (showTemplateLoad) loadTemplates();
  }, [showTemplateLoad, loadTemplates]);

  // Add food to block
  const addFoodToBlock = async (blockType: MealType, food: any) => {
    const itemId = crypto.randomUUID();
    
    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from("meal_plan_items")
          .upsert({
            id: itemId,
            meal_plan_id: mealPlanId,
            meal_type: blockType,
            title: food.name,
            description: `${food.serving_size || 100}${food.serving_unit || "g"}`,
            calories_target: food.calories || 0,
            protein_target: food.protein || 0,
            carbs_target: food.carbs || 0,
            fat_target: food.fat || 0,
            day_of_week: currentDay,
            item_origin: "in_office_manual",
            tenant_id: tenantId,
          });
        if (error) throw error;
      }, {
        onRetry: (attempt) => toast.info(`Tentativa ${attempt} de adicionar item...`),
      });

      const newItem: MealItem = {
        id: itemId,
        name: food.name,
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        meal_type: blockType,
      };
      setBlocks(prev => prev.map(b =>
        b.type === blockType ? { ...b, items: [...b.items, newItem] } : b
      ));
    } catch (err: any) {
      toast.error("Falha ao adicionar item: " + err.message);
    }
  };

  // Remove item
  const removeItem = async (blockType: MealType, itemId: string) => {
    if (!mealPlanId) {
      console.error("[CRITICAL] DELETE bloqueado: mealPlanId inválido em removeItem", { itemId, patientId });
      throw new Error("DELETE bloqueado: mealPlanId inválido");
    }
    
    console.info("[DELETE] Executando removeItem", { mealPlanId, itemId, patientId, operation: "removeItem" });
    
    await supabase
      .from("meal_plan_items")
      .delete()
      .eq("meal_plan_id", mealPlanId)
      .eq("id", itemId);

    setBlocks(prev => prev.map(b =>
      b.type === blockType ? { ...b, items: b.items.filter(i => i.id !== itemId) } : b
    ));
  };

  // Duplicate day
  const duplicateDay = async () => {
    setSaving(true);
    const nextDay = currentDay + 1;
    const allItems = blocks.flatMap(b => b.items);
    const inserts = allItems.map(item => ({
      id: crypto.randomUUID(),
      meal_plan_id: mealPlanId,
      meal_type: item.meal_type,
      title: item.name,
      calories_target: item.calories,
      protein_target: item.protein,
      carbs_target: item.carbs,
      fat_target: item.fat,
      day_of_week: nextDay,
      item_origin: "in_office_duplicated" as const,
      tenant_id: tenantId,
    }));

    try {
      await withRetry(async () => {
        // Clear previous state for that day to avoid ghost items if we switched logic
        if (!mealPlanId) {
          console.error("[CRITICAL] DELETE bloqueado: mealPlanId inválido em duplicateDay", { patientId, nextDay });
          throw new Error("DELETE bloqueado: mealPlanId inválido");
        }
        
        console.info("[DELETE] Limpando dia para duplicação", { mealPlanId, patientId, day: nextDay, operation: "duplicateDay" });
        
        await supabase
          .from("meal_plan_items")
          .delete()
          .eq("meal_plan_id", mealPlanId)
          .eq("day_of_week", nextDay);
        
        if (inserts.length > 0) {
          const { error } = await supabase.from("meal_plan_items").upsert(inserts);
          if (error) throw error;
        }
      }, {
        onRetry: (attempt) => toast.info(`Tentativa ${attempt} de duplicar dia...`),
      });

      setTotalDays(Math.max(totalDays, nextDay));
      setCurrentDay(nextDay);
      toast.success(`Dia ${currentDay} duplicado para Dia ${nextDay}`);
    } catch (err: any) {
      toast.error("Erro ao duplicar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Apply to all week
  const applyToWeek = async () => {
    setSaving(true);
    const allItems = blocks.flatMap(b => b.items);
    const allInserts: any[] = [];
    for (let day = 1; day <= 7; day++) {
      if (day === currentDay) continue;
      allInserts.push(...allItems.map(item => ({
        id: crypto.randomUUID(),
        meal_plan_id: mealPlanId,
        meal_type: item.meal_type,
        title: item.name,
        calories_target: item.calories,
        protein_target: item.protein,
        carbs_target: item.carbs,
        fat_target: item.fat,
        day_of_week: day,
        item_origin: "in_office_duplicated" as const,
        tenant_id: tenantId,
      })));
    }
    
    try {
      await withRetry(async () => {
        // Clear other days
        if (!mealPlanId) {
          console.error("[CRITICAL] DELETE bloqueado: mealPlanId inválido em applyToWeek", { patientId });
          throw new Error("DELETE bloqueado: mealPlanId inválido");
        }
        
        console.info("[DELETE] Limpando semana exceto dia atual", { mealPlanId, patientId, currentDay, operation: "applyToWeek" });
        
        const { error: delErr } = await supabase.from("meal_plan_items")
          .delete()
          .eq("meal_plan_id", mealPlanId)
          .neq("day_of_week", currentDay);
        if (delErr) throw delErr;

        if (allInserts.length > 0) {
          const { error: insErr } = await supabase.from("meal_plan_items").upsert(allInserts);
          if (insErr) throw insErr;
        }
      }, {
        onRetry: (attempt) => toast.info(`Tentativa ${attempt} de aplicar para a semana...`),
      });

      setTotalDays(7);
      toast.success("Plano aplicado para a semana toda!");
    } catch (err: any) {
      toast.error("Erro ao aplicar semana: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save as template
  const saveAsTemplate = async () => {
    if (!templateName.trim() || !user?.id) return;
    const { data: np } = await supabase
      .from("nutritionist_patients")
      .select("tenant_id")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!np?.tenant_id) {
      toast.error("Vínculo com paciente não encontrado.");
      return;
    }

    const templateItems = blocks.flatMap(b => b.items.map(i => ({ ...i, meal_type: b.type })));
    await supabase.from("quick_meal_templates" as any).insert({
      nutritionist_id: user.id,
      tenant_id: np.tenant_id,
      template_name: templateName,
      template_type: "day",
      items: templateItems as any,
      total_calories: Math.round(totalMacros.calories || 0),
      total_protein: Math.round(totalMacros.protein || 0),
      total_carbs: Math.round(totalMacros.carbs || 0),
      total_fat: Math.round(totalMacros.fat || 0),
    } as any);
    setShowTemplateSave(false);
    setTemplateName("");
    toast.success("Template salvo!");
  };

  // Apply template to current day
  const applyTemplateToDay = async (template: SavedTemplate) => {
    setSaving(true);
    const items = (template.items || []) as MealItem[];
    const totalItems = items.length;
    const inserts = items.map(item => {
      const cal = item.calories || (totalItems > 0 ? (template.total_calories || 0) / totalItems : 0);
      const prot = item.protein || (totalItems > 0 ? (template.total_protein || 0) / totalItems : 0);
      const carb = item.carbs || (totalItems > 0 ? (template.total_carbs || 0) / totalItems : 0);
      const fat = item.fat || (totalItems > 0 ? (template.total_fat || 0) / totalItems : 0);

      return {
        id: crypto.randomUUID(),
        meal_plan_id: mealPlanId,
        meal_type: item.meal_type,
        title: item.name,
        calories_target: cal > 0 ? cal : null,
        protein_target: prot > 0 ? prot : null,
        carbs_target: carb > 0 ? carb : null,
        fat_target: fat > 0 ? fat : null,
        day_of_week: currentDay,
        item_origin: "in_office_template" as const,
        tenant_id: tenantId,
      };
    });

    try {
      await withRetry(async () => {
        // Delete existing items for current day
        if (!mealPlanId) {
          console.error("[CRITICAL] DELETE bloqueado: mealPlanId inválido em applyTemplateToDay", { patientId, currentDay });
          throw new Error("DELETE bloqueado: mealPlanId inválido");
        }
        
        console.info("[DELETE] Limpando dia para aplicar template", { mealPlanId, patientId, day: currentDay, operation: "applyTemplateToDay" });
        
        const { error: delErr } = await supabase
          .from("meal_plan_items")
          .delete()
          .eq("meal_plan_id", mealPlanId)
          .eq("day_of_week", currentDay);
        if (delErr) throw delErr;

        if (inserts.length > 0) {
          const { error: insErr } = await supabase.from("meal_plan_items").upsert(inserts);
          if (insErr) throw insErr;
        }
      }, {
        onRetry: (attempt) => toast.info(`Tentativa ${attempt} de aplicar template...`),
      });

      // Reload state
      setLoading(true);
      const { data: reloaded } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", mealPlanId)
        .eq("day_of_week", currentDay);

      const newBlocks = MEAL_TYPES.map(m => ({
        ...m,
        items: (reloaded || [])
          .filter((i) => i.meal_type === m.type)
          .map((i) => ({
            id: i.id,
            name: i.title || "Item",
            calories: i.calories_target || 0,
            protein: i.protein_target || 0,
            carbs: i.carbs_target || 0,
            fat: i.fat_target || 0,
            meal_type: m.type,
          })),
      }));
      setBlocks(newBlocks);
      setLoading(false);
      setShowTemplateLoad(false);
      setPreviewTemplate(null);
      toast.success(`Template "${template.template_name}" aplicado ao dia ${currentDay}!`);
    } catch (err: any) {
      toast.error("Erro ao aplicar template: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Apply template to whole week
  const applyTemplateToWeek = async (template: SavedTemplate) => {
    setSaving(true);
    const items = (template.items || []) as MealItem[];
    const totalItems = items.length;
    const allInserts: any[] = [];
    
    // Generate UUIDs once for all items and all days for idempotency
    for (let day = 1; day <= 7; day++) {
      items.forEach(item => {
        const cal = item.calories || (totalItems > 0 ? (template.total_calories || 0) / totalItems : 0);
        const prot = item.protein || (totalItems > 0 ? (template.total_protein || 0) / totalItems : 0);
        const carb = item.carbs || (totalItems > 0 ? (template.total_carbs || 0) / totalItems : 0);
        const fat = item.fat || (totalItems > 0 ? (template.total_fat || 0) / totalItems : 0);

        allInserts.push({
          id: crypto.randomUUID(),
          meal_plan_id: mealPlanId,
          meal_type: item.meal_type,
          title: item.name,
          calories_target: cal > 0 ? cal : null,
          protein_target: prot > 0 ? prot : null,
          carbs_target: carb > 0 ? carb : null,
          fat_target: fat > 0 ? fat : null,
          day_of_week: day,
          item_origin: "in_office_template" as const,
          tenant_id: tenantId,
        });
      });
    }

    try {
      await withRetry(async () => {
        // Clear all days
        if (!mealPlanId) {
          console.error("[CRITICAL] DELETE bloqueado: mealPlanId inválido em applyTemplateToWeek", { patientId });
          throw new Error("DELETE bloqueado: mealPlanId inválido");
        }
        
        console.info("[DELETE] Limpando semana para aplicar template", { mealPlanId, patientId, operation: "applyTemplateToWeek" });
        
        const { error: delErr } = await supabase
          .from("meal_plan_items")
          .delete()
          .eq("meal_plan_id", mealPlanId);
        if (delErr) throw delErr;

        if (allInserts.length > 0) {
          const { error: insErr } = await supabase.from("meal_plan_items").upsert(allInserts);
          if (insErr) throw insErr;
        }
      }, {
        onRetry: (attempt) => toast.info(`Tentativa ${attempt} de aplicar template à semana...`),
      });

      setTotalDays(7);
      // Reload current day
      setLoading(true);
      const { data: reloaded } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", mealPlanId)
        .eq("day_of_week", currentDay);
      const newBlocks = MEAL_TYPES.map(m => ({
        ...m,
        items: (reloaded || [])
          .filter((i) => i.meal_type === m.type)
          .map((i) => ({
            id: i.id,
            name: i.title || "Item",
            calories: i.calories_target || 0,
            protein: i.protein_target || 0,
            carbs: i.carbs_target || 0,
            fat: i.fat_target || 0,
            meal_type: m.type,
          })),
      }));
      setBlocks(newBlocks);
      setLoading(false);
      setShowTemplateLoad(false);
      setPreviewTemplate(null);
      toast.success(`Template "${template.template_name}" aplicado à semana toda!`);
    } catch (err: any) {
      toast.error("Erro ao aplicar template: " + err.message);
    } finally {
      setSaving(false);
    }
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
          <div className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground shadow">
            Plano Único
          </div>
        </div>
        <div className="flex gap-1 ml-auto flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setCurrentDay(0)} disabled={saving} className="gap-1 text-xs">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </Button>

          {/* Load Template */}
          <Dialog open={showTemplateLoad} onOpenChange={setShowTemplateLoad}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <Download className="w-3 h-3" /> Carregar template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Carregar Template</DialogTitle></DialogHeader>
              {templatesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum template salvo ainda.</p>
              ) : previewTemplate ? (
                /* Preview mode */
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)} className="text-xs">
                    ← Voltar à lista
                  </Button>
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <h3 className="font-medium text-sm">{previewTemplate.template_name}</h3>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="text-xs"><p className="font-bold">{Math.round(previewTemplate.total_calories)}</p><p className="text-muted-foreground">kcal</p></div>
                      <div className="text-xs"><p className="font-bold">{Math.round(previewTemplate.total_protein)}g</p><p className="text-muted-foreground">prot</p></div>
                      <div className="text-xs"><p className="font-bold">{Math.round(previewTemplate.total_carbs)}g</p><p className="text-muted-foreground">carb</p></div>
                      <div className="text-xs"><p className="font-bold">{Math.round(previewTemplate.total_fat)}g</p><p className="text-muted-foreground">gord</p></div>
                    </div>
                    <ScrollArea className="max-h-48">
                      {(previewTemplate.items || []).map((item, idx) => (
                        <div key={idx} className="text-xs py-1 flex justify-between border-b border-border/50 last:border-0">
                          <span>{item.name}</span>
                          <span className="text-muted-foreground">{Math.round(item.calories)} kcal</span>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => applyTemplateToDay(previewTemplate)} disabled={saving} className="flex-1 gap-1">
                      <ArrowRight className="w-3 h-3" /> Aplicar ao plano
                    </Button>
                  </div>
                </div>
              ) : (
                /* Template list */
                <ScrollArea className="max-h-80">
                  <div className="space-y-2">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                        onClick={() => setPreviewTemplate(t)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{t.template_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {Math.round(t.total_calories)} kcal · P{Math.round(t.total_protein)}g · C{Math.round(t.total_carbs)}g · G{Math.round(t.total_fat)}g
                            </p>
                          </div>
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>

          {/* Save Template */}
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
          { label: "Calorias", value: totalMacros.calories, unit: "kcal", icon: Flame, color: "text-accent" },
          { label: "Proteína", value: totalMacros.protein, unit: "g", icon: Beef, color: "text-destructive" },
          { label: "Carboidratos", value: totalMacros.carbs, unit: "g", icon: Wheat, color: "text-accent" },
          { label: "Gordura", value: totalMacros.fat, unit: "g", icon: Droplets, color: "text-primary" },
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
                        {Math.round(item.calories)}kcal · P{Math.round(item.protein)}g · C{Math.round(item.carbs)}g · G{Math.round(item.fat)}g
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

                {/* Add button */}
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
