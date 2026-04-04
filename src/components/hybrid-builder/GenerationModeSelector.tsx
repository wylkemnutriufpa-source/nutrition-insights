import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, Brain, Stethoscope, Loader2, Save, Sparkles, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import PlanComparisonModal from "./PlanComparisonModal";

type GenerationMode = "quick" | "smart" | "clinical";

interface Props {
  patientId: string;
  onGenerated: () => void;
}

const MODES: { key: GenerationMode; icon: typeof Zap; label: string; subtitle: string; time: string }[] = [
  { key: "quick", icon: Zap, label: "⚡ Plano Rápido", subtitle: "Gera em ~10s", time: "~10s" },
  { key: "smart", icon: Brain, label: "🧠 Plano Inteligente", subtitle: "IFJ + histórico", time: "~15s" },
  { key: "clinical", icon: Stethoscope, label: "👨‍⚕️ Plano Clínico", subtitle: "Protocolos clínicos", time: "~15s" },
];

interface GeneratedPlan {
  mode: GenerationMode;
  mealPlanId: string;
  itemsCount: number;
  generating: boolean;
  error?: string;
  items?: any[];
  dailySummary?: { day: number; kcal: number; protein: number; meals: number }[];
}

export default function GenerationModeSelector({ patientId, onGenerated }: Props) {
  const { user } = useAuth();
  const store = useMealPlanEditorV2Store();
  const [generating, setGenerating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GenerationMode>("quick");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Comparison flow state
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonPlans, setComparisonPlans] = useState<GeneratedPlan[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);

  // Generate single mode (original flow)
  const handleGenerate = async () => {
    if (!user || !store.planId) return;
    setGenerating(true);
    try {
      toast.info(`Gerando ${MODES.find(m => m.key === selectedMode)?.label}...`);
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patientId,
          nutritionistId: user.id,
          existingPlanId: store.planId,
          isPipeline: false,
          generationMode: selectedMode,
          saveAsTemplate,
        },
      });
      if (error || !data?.success) {
        const msg = error
          ? await friendlyEdgeFunctionError(error, "Erro ao gerar")
          : (data?.error || "Erro desconhecido");
        toast.error(msg);
        return;
      }
      await store.hydrate(data.mealPlanId || store.planId, user.id);
      toast.success(`✅ Plano gerado com ${data.items_count || 0} refeições!`);
      onGenerated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  };

  // Generate all 3 modes in parallel for comparison
  const handleGenerateAll3 = async () => {
    if (!user) return;
    setGeneratingAll(true);

    // Initialize plans in "generating" state
    const initialPlans: GeneratedPlan[] = MODES.map(m => ({
      mode: m.key,
      mealPlanId: "",
      itemsCount: 0,
      generating: true,
    }));
    setComparisonPlans(initialPlans);
    setComparisonOpen(true);

    toast.info("🔄 Gerando 3 planos em paralelo...");

    // Generate all 3 in parallel — each creates its own plan (no existingPlanId)
    const results = await Promise.allSettled(
      MODES.map(async (mode) => {
        const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
          body: {
            patientId,
            nutritionistId: user.id,
            isPipeline: false,
            generationMode: mode.key,
            saveAsTemplate: false,
          },
        });
        if (error || !data?.success) {
          throw new Error(
            error ? await friendlyEdgeFunctionError(error, "Erro") : (data?.error || "Erro desconhecido")
          );
        }
        return { mode: mode.key, data };
      })
    );

    // Process results and load items for each plan
    const updatedPlans: GeneratedPlan[] = await Promise.all(
      results.map(async (result, idx) => {
        const mode = MODES[idx].key;
        if (result.status === "rejected") {
          return {
            mode,
            mealPlanId: "",
            itemsCount: 0,
            generating: false,
            error: result.reason?.message || "Falha na geração",
          };
        }
        const { data } = result.value;
        const planId = data.mealPlanId;

        // Load items to build daily summary
        const { data: items } = await supabase
          .from("meal_plan_items")
          .select("day_of_week, meal_type, calories_target, protein_target, title, description")
          .eq("meal_plan_id", planId)
          .order("day_of_week")
          .order("meal_type");

        // Build daily summary
        const dayMap = new Map<number, { kcal: number; protein: number; meals: number }>();
        for (const item of items || []) {
          const day = item.day_of_week ?? 0;
          const existing = dayMap.get(day) || { kcal: 0, protein: 0, meals: 0 };
          existing.kcal += item.calories_target || 0;
          existing.protein += item.protein_target || 0;
          existing.meals += 1;
          dayMap.set(day, existing);
        }
        const dailySummary = Array.from(dayMap.entries())
          .map(([day, stats]) => ({ day, ...stats }))
          .sort((a, b) => a.day - b.day);

        return {
          mode,
          mealPlanId: planId,
          itemsCount: data.items_count || items?.length || 0,
          generating: false,
          items: items || [],
          dailySummary,
        };
      })
    );

    setComparisonPlans(updatedPlans);
    setGeneratingAll(false);

    const successCount = updatedPlans.filter(p => !p.error).length;
    if (successCount > 0) {
      toast.success(`✅ ${successCount} planos gerados! Escolha o melhor.`);
    } else {
      toast.error("Nenhum plano foi gerado com sucesso.");
    }
  };

  // User picks one plan → adopt it and delete the others
  const handleSelectPlan = async (planId: string, mode: GenerationMode) => {
    if (!user || !store.planId) return;
    setSelecting(true);

    try {
      // Copy items from chosen plan to the editor's plan
      const { data: chosenItems } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", planId);

      if (!chosenItems || chosenItems.length === 0) {
        toast.error("Plano selecionado está vazio.");
        setSelecting(false);
        return;
      }

      // Delete current items in editor plan
      await supabase.from("meal_plan_items").delete().eq("meal_plan_id", store.planId);

      // Insert chosen items into editor plan
      const newItems = chosenItems.map(({ id, meal_plan_id, created_at, updated_at, ...rest }) => ({
        ...rest,
        meal_plan_id: store.planId!,
      }));
      await supabase.from("meal_plan_items").insert(newItems);

      // Update editor plan metadata
      await supabase.from("meal_plans").update({
        generation_mode: mode,
        generation_source: `comparison_pick_${mode}`,
      }).eq("id", store.planId);

      // Delete all temporary comparison plans
      const tempPlanIds = comparisonPlans
        .map(p => p.mealPlanId)
        .filter(id => id && id !== store.planId);

      for (const tempId of tempPlanIds) {
        await supabase.from("meal_plan_items").delete().eq("meal_plan_id", tempId);
        await supabase.from("meal_plans").delete().eq("id", tempId);
      }

      // Reload editor
      await store.hydrate(store.planId, user.id);
      toast.success(`✅ Plano ${MODES.find(m => m.key === mode)?.label} aplicado!`);
      setComparisonOpen(false);
      setComparisonPlans([]);
      onGenerated();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aplicar plano");
    } finally {
      setSelecting(false);
    }
  };

  const handleComparisonClose = async () => {
    if (selecting) return;
    // If closing without selecting, delete all temp plans
    if (comparisonPlans.some(p => p.mealPlanId)) {
      for (const plan of comparisonPlans) {
        if (plan.mealPlanId) {
          await supabase.from("meal_plan_items").delete().eq("meal_plan_id", plan.mealPlanId);
          await supabase.from("meal_plans").delete().eq("id", plan.mealPlanId);
        }
      }
    }
    setComparisonOpen(false);
    setComparisonPlans([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Geração Automática</h3>
      </div>

      {/* Mode selector for single generation */}
      <div className="space-y-2">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.key;
          return (
            <button
              key={mode.key}
              onClick={() => setSelectedMode(mode.key)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border w-full text-left text-xs transition-all ${
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{mode.label}</p>
                <p className="text-[10px] text-muted-foreground">{mode.subtitle}</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{mode.time}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
        <div className="flex items-center gap-1.5">
          <Save className="w-3 h-3 text-muted-foreground" />
          <Label htmlFor="save-tpl" className="text-xs cursor-pointer">Salvar como template</Label>
        </div>
        <Switch id="save-tpl" checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
      </div>

      {/* Single mode button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || generatingAll}
        className="w-full h-9 text-xs gap-2 gradient-primary shadow-glow"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
        ) : (
          <><Zap className="w-4 h-4" /> Gerar no Canvas</>
        )}
      </Button>

      {/* Generate all 3 and compare */}
      <Button
        onClick={handleGenerateAll3}
        disabled={generating || generatingAll}
        variant="outline"
        className="w-full h-9 text-xs gap-2 border-primary/30 hover:bg-primary/5"
      >
        {generatingAll ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando 3 variações...</>
        ) : (
          <><Layers className="w-4 h-4" /> Gerar os 3 e Comparar</>
        )}
      </Button>

      <PlanComparisonModal
        open={comparisonOpen}
        onClose={handleComparisonClose}
        plans={comparisonPlans}
        onSelect={handleSelectPlan}
        selecting={selecting}
      />
    </div>
  );
}
