import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Trash2, Copy, Save, Search,
  Loader2, Calendar, BookTemplate, GripVertical, Flame, Beef, Wheat, Droplets,
  Download, Eye, ArrowRight, RefreshCw, ClipboardCheck, X, AlertTriangle, Info, ShieldCheck, Check
} from "lucide-react";
// withRetry removido para garantir comportamento fail-fast
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { validatePlanSubstitutions } from "@/lib/mealPlanSubstitutionValidator";
import { CURRENT_ENGINE_VERSION } from "@/lib/engineVersionGovernance";

type MealType = Database["public"]["Enums"]["meal_type"];

interface MealItem {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: MealType;
  is_primary?: boolean;
  substitution_group_id?: string | null;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingTo, setAddingTo] = useState<MealType | { type: MealType; isPrimary?: boolean; substitutionGroupId?: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Template loading state
  const [showTemplateLoad, setShowTemplateLoad] = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<SavedTemplate | null>(null);

  // Refetch data function
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: items, error } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", mealPlanId)
        .eq("day_of_week", 0); // Always day 0 for In-Office simplified

      if (error) throw error;

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
            is_primary: i.is_primary ?? true,
            substitution_group_id: i.substitution_group_id,
          })),
      }));
      setBlocks(newBlocks);
      console.log("[REFETCH DONE]");
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Erro ao atualizar dados.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [mealPlanId]);

  const fetchAuditLogs = useCallback(async () => {
    const { data } = await supabase
      .from("clinical_engine_audit_logs" as any)
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20);
    setAuditLogs(data || []);
  }, [patientId]);

  // Load existing items for current day
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Simple sequential queue for persistence
  const [queue, setQueue] = useState<Promise<any>>(Promise.resolve());

  const enqueuePersistence = useCallback((task: () => Promise<any>) => {
    setQueue(prev => prev.then(async () => {
      console.log("[SAVE START]");
      try {
        await task();
        console.log("[SAVE SUCCESS]");
        await fetchData(true); // Refetch after success
      } catch (err: any) {
        console.error("Persistence error:", err);
        toast.error("Erro ao persistir dados: " + err.message);
      }
    }));
  }, [fetchData]);

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
  const addFoodToBlock = async (blockType: MealType, food: any, isPrimary = true, substitutionGroupId?: string | null) => {
    const itemId = crypto.randomUUID();
    const finalGroupId = substitutionGroupId || (isPrimary ? crypto.randomUUID() : null);
    
    enqueuePersistence(async () => {
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
          day_of_week: 0,
          item_origin: "in_office_manual",
          tenant_id: tenantId,
          is_primary: isPrimary,
          substitution_group_id: finalGroupId,
        });
      if (error) {
        console.error("[QuickMealEditor] Erro ao adicionar item:", error);
        throw error;
      }

    });
  };

  // Remove item
  const removeItem = async (blockType: MealType, itemId: string) => {
    if (!mealPlanId || typeof mealPlanId !== 'string' || mealPlanId.trim() === "") {
      console.error("[CRITICAL] DELETE bloqueado: mealPlanId inválido em removeItem", { mealPlanId, itemId, patientId });
      throw new Error("DELETE bloqueado: mealPlanId inválido");
    }
    
    enqueuePersistence(async () => {
      console.info("[DELETE] Executando removeItem", { mealPlanId, itemId, patientId, operation: "removeItem", timestamp: Date.now() });
      const { error } = await supabase
        .from("meal_plan_items")
        .delete()
        .eq("meal_plan_id", mealPlanId)
        .eq("id", itemId);
      
      if (error) throw error;
    });
  };

  // Duplication and Apply to Week features removed to focus on Single Day + Substitutions as requested.

  // Save as template
  const saveAsTemplate = async () => {
    if (!templateName.trim() || !user?.id) return;
    
    enqueuePersistence(async () => {
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
      const { error } = await supabase.from("quick_meal_templates" as any).insert({
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
      
      if (error) throw error;
      
      setShowTemplateSave(false);
      setTemplateName("");
      toast.success("Template salvo!");
    });
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
        day_of_week: 0,
        item_origin: "in_office_template" as const,
        tenant_id: tenantId,
        is_primary: item.is_primary ?? true,
        substitution_group_id: item.substitution_group_id || (item.is_primary ? crypto.randomUUID() : null),
      };
    });

    enqueuePersistence(async () => {
      try {
        // Delete existing items
        if (!mealPlanId || typeof mealPlanId !== 'string' || mealPlanId.trim() === "") {
          throw new Error("DELETE bloqueado: mealPlanId inválido");
        }
        
        await supabase
          .from("meal_plan_items")
          .delete()
          .eq("meal_plan_id", mealPlanId)
          .eq("day_of_week", 0);

        if (inserts.length > 0) {
          const { error: insErr } = await supabase.from("meal_plan_items").upsert(inserts);
          if (insErr) throw insErr;
        }


        setShowTemplateLoad(false);
        setPreviewTemplate(null);
        toast.success(`Template "${template.template_name}" aplicado!`);
      } finally {
        setSaving(false);
      }
    });
  };

  // Totals
  const totalMacros = useMemo(() => {
    const all = blocks.flatMap(b => b.items.filter(i => i.is_primary));
    return {
      calories: all.reduce((s, i) => s + (i.calories || 0), 0),
      protein: all.reduce((s, i) => s + (i.protein || 0), 0),
      carbs: all.reduce((s, i) => s + (i.carbs || 0), 0),
      fat: all.reduce((s, i) => s + (i.fat || 0), 0),
    };
  }, [blocks]);

  const guardrailAlerts = useMemo(() => {
    // These targets would ideally come from the session or latest assessment
    // For now we check consistency between the items if they have a target defined
    const primaryItems = blocks.flatMap(b => b.items.filter(i => i.is_primary));
    if (primaryItems.length === 0) return [];

    const alerts: string[] = [];
    const validation = validatePlanSubstitutions(primaryItems as any);
    
    if (!validation.valid) {
      alerts.push(...validation.errors);
    }

    return alerts;
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setShowDecisions(true); fetchAuditLogs(); }} 
            className="gap-1 text-xs border-primary/20 text-primary"
          >
            <Info className="w-3 h-3" /> Ver Decisões do Motor
          </Button>

          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={saving} className="gap-1 text-xs">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </Button>

          {/* Load Template */}
          <Dialog open={showTemplateLoad} onOpenChange={setShowTemplateLoad}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <Download className="w-3 h-3" /> Carregar template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl">
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
                    <Button size="lg" onClick={() => applyTemplateToDay(previewTemplate)} disabled={saving} className="flex-1 gap-2 h-12 sm:h-10">
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
          const primaryItems = block.items.filter(i => i.is_primary);
          const blockCals = primaryItems.reduce((s, i) => s + (i.calories || 0), 0);
          
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
              <CardContent className="px-4 pb-3 space-y-3">
                {block.items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum item adicionado</p>
                )}
                
                {primaryItems.map(primary => {
                  const substitutions = block.items.filter(i => !i.is_primary && i.substitution_group_id === primary.substitution_group_id);
                  
                  return (
                    <div key={primary.id} className="space-y-1">
                      {/* Primary Item */}
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 group border border-border/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-primary">{primary.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {Math.round(primary.calories)}kcal · P{Math.round(primary.protein)}g · C{Math.round(primary.carbs)}g
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => primary.id && removeItem(block.type, primary.id)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Substitutions */}
                      {substitutions.map(sub => (
                        <div key={sub.id} className="flex items-center gap-2 p-2 ml-4 rounded-lg bg-primary/5 border-l-2 border-primary/30 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium truncate">OU: {sub.name}</p>
                            <p className="text-[9px] text-muted-foreground">
                              {Math.round(sub.calories)}kcal · P{Math.round(sub.protein)}g
                            </p>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => sub.id && removeItem(block.type, sub.id)}
                          >
                            <Trash2 className="w-2.5 h-2.5 text-destructive" />
                          </Button>
                        </div>
                      ))}

                      {/* Add Substitution Button */}
                      <div className="ml-4 pt-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[10px] text-primary hover:text-primary/80 hover:bg-primary/5 gap-1 px-2"
                          onClick={() => setAddingTo({ type: block.type, substitutionGroupId: primary.substitution_group_id } as any)}
                        >
                          <Plus className="w-3 h-3" /> Adicionar Substituição
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Primary Item button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-1 text-xs border-dashed"
                  onClick={() => setAddingTo({ type: block.type, isPrimary: true } as any)}
                >
                  <Plus className="w-3 h-3" /> Adicionar Opção Principal
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Global Add Dialog */}
      <Dialog 
        open={!!addingTo} 
        onOpenChange={open => { if(!open) setAddingTo(null); setSearchQuery(""); setFoodResults([]); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" /> 
              {addingTo && typeof addingTo === 'object' && (addingTo as any).substitutionGroupId 
                ? "Adicionar Substituição" 
                : "Buscar Alimento"}
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
                  onClick={() => { 
                    if (addingTo) {
                      const config = addingTo as any;
                      addFoodToBlock(
                        config.type, 
                        food, 
                        config.isPrimary ?? !config.substitutionGroupId, 
                        config.substitutionGroupId
                      );
                      setAddingTo(null);
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{food.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {food.serving_size}{food.serving_unit} · {Math.round(food.calories)}kcal
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
      {/* Decisions Dialog */}
      <Dialog open={showDecisions} onOpenChange={setShowDecisions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> 
              Decisões do Motor FitJourney v{CURRENT_ENGINE_VERSION}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <ClipboardCheck className="w-4 h-4" /> Trilha de Regras Aplicadas
                </h4>
                <ul className="text-xs space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" />
                    <span><strong>MEAL_KCAL_SPLIT:</strong> Distribuição calórica otimizada por horário (Café 20%, Almoço 30%, Jantar 22%).</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" />
                    <span><strong>BLOQUEIO DE ALIMENTOS:</strong> Exclusão de alimentos ultraprocessados ou fora do perfil clínico.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" />
                    <span><strong>SUBSTITUIÇÕES EQUIVALENTES:</strong> Cálculo de equivalência calórica em todas as variações geradas.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold">Histórico de Execuções Recentes</h4>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma execução registrada recentemente.</p>
                ) : (
                  auditLogs.map((log: any) => (
                    <div key={log.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-primary uppercase">{log.step_name}</span>
                        <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <p className="text-xs">{log.message}</p>
                      {log.metadata && (
                        <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Guardrail Alerts */}
      {guardrailAlerts.length > 0 && (
        <div className="mt-4 p-4 rounded-xl border border-warning/30 bg-warning/5 space-y-2">
          <h4 className="text-sm font-bold flex items-center gap-2 text-warning">
            <AlertTriangle className="w-4 h-4" /> Alertas de Guardrails Clínica
          </h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            {guardrailAlerts.map((alert, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-warning">•</span>
                {alert}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground italic mt-2">
            * Estes alertas são informativos para auxílio na decisão clínica. O profissional mantém controle total sobre o plano.
          </p>
        </div>
      )}
    </div>
  );
}
