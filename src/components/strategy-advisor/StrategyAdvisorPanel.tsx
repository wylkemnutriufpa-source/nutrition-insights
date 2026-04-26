import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Brain, ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyzePatientAndSuggestStrategies,
  switchStrategySize,
  type PatientProfile,
  type StrategyAnalysis,
  type NutritionalStrategy,
  type StrategyMealPreview,
  type SizeVariant,
} from "@/lib/strategyAdvisor";
import StrategyCard from "./StrategyCard";
import StrategyPreviewPanel from "./StrategyPreviewPanel";
import PatientProfileSummary from "./PatientProfileSummary";

interface Props {
  patientId: string;
  onStrategyConfirmed: (strategy: NutritionalStrategy, editedMeals: StrategyMealPreview[]) => void;
  onCancel: () => void;
}

export default function StrategyAdvisorPanel({ patientId, onStrategyConfirmed, onCancel }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null);
  const [strategies, setStrategies] = useState<NutritionalStrategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [editedMeals, setEditedMeals] = useState<StrategyMealPreview[]>([]);
  const [viewMode, setViewMode] = useState<"overview" | "preview">("overview");

  useEffect(() => {
    if (!patientId || !user) return;
    loadPatientProfile();
  }, [patientId, user]);

  const loadPatientProfile = async () => {
    setLoading(true);
    try {
      const { data: anamnesis } = await (supabase.from("patient_anamnesis") as any)
        .select("answers, status")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: physicalAssessment } = await supabase.from("physical_assessments")
        .select("weight, height, body_fat_percentage, calories_target, protein_target, carbs_target, fat_target")
        .eq("patient_id", patientId)
        .order("assessment_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: clinicalFlags } = await supabase.from("patient_clinical_flags")
        .select("flag_key, severity")
        .eq("patient_id", patientId)
        .eq("is_active", true);

      const { data: behavProfile } = await supabase.from("behavioral_profile")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();

      const answers = (anamnesis?.answers || {}) as Record<string, any>;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", patientId)
        .maybeSingle();

      const weight = parseFloat(String(physicalAssessment?.weight || answers.weight || 70));
      const height = parseFloat(String(physicalAssessment?.height || answers.height || 170));

      const profile: PatientProfile = {
        patientId,
        name: profileData?.full_name || "Paciente",
        sex: (answers.sex || answers.gender || "male").toLowerCase() === "female" ? "female" : "male",
        age: parseInt(String(answers.age || 30)),
        weight: weight < 3 ? weight * 100 : weight,
        height: height < 3 ? height * 100 : height,
        activityLevel: answers.activity_level || "light",
        goal: answers.goal || answers.objective || answers.main_goal || "lose_weight",
        bodyFatEstimate: physicalAssessment?.body_fat_percentage || null,
        restrictions: Array.isArray(answers.restrictions) ? answers.restrictions.filter((r: string) => r !== "none") : [],
        allergies: Array.isArray(answers.allergies) ? answers.allergies.filter((a: string) => a !== "none") : [],
        dislikedFoods: typeof answers.disliked_foods === "string"
          ? answers.disliked_foods.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        medicalConditions: Array.isArray(answers.medical_conditions) ? answers.medical_conditions : [],
        clinicalFlags: (clinicalFlags || []).map((f: any) => f.flag_key),
        behavioralProfile: behavProfile ? {
          wakeUpTime: behavProfile.wake_up_time,
          workoutTime: behavProfile.workout_time,
          motivationStyle: behavProfile.motivation_style,
          cravingHours: behavProfile.craving_hours || [],
          weekendDietBreaks: behavProfile.weekend_diet_breaks || false,
          forgetsWater: behavProfile.forgets_water || false,
        } : null,
      };

      const result = analyzePatientAndSuggestStrategies(profile);
      setAnalysis(result);
      setStrategies(result.strategies);

      if (result.strategies.length > 0) {
        setSelectedStrategyId(result.strategies[0].id);
        setEditedMeals([...result.strategies[0].previewMeals]);
      }
    } catch (err: any) {
      console.error("[StrategyAdvisor] Failed to load:", err);
      toast.error("Erro ao analisar perfil do paciente");
    } finally {
      setLoading(false);
    }
  };

  const selectedStrategy = useMemo(
    () => strategies.find(s => s.id === selectedStrategyId) || null,
    [strategies, selectedStrategyId]
  );

  const handleSelectStrategy = useCallback((strategyId: string) => {
    setSelectedStrategyId(strategyId);
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) setEditedMeals([...strategy.previewMeals]);
  }, [strategies]);

  const handleSizeChange = useCallback((strategyId: string, size: SizeVariant) => {
    setStrategies(prev => prev.map(s => {
      if (s.id !== strategyId) return s;
      return switchStrategySize(s, size);
    }));
    // If this is the selected strategy, update preview meals too
    if (strategyId === selectedStrategyId) {
      const strategy = strategies.find(s => s.id === strategyId);
      if (strategy) {
        const updated = switchStrategySize(strategy, size);
        setEditedMeals([...updated.previewMeals]);
      }
    }
  }, [strategies, selectedStrategyId]);

  const handleOpenPreview = useCallback((strategyId: string) => {
    handleSelectStrategy(strategyId);
    setViewMode("preview");
  }, [handleSelectStrategy]);

  const handleBackToOverview = useCallback(() => setViewMode("overview"), []);
  const handleMealsChanged = useCallback((meals: StrategyMealPreview[]) => setEditedMeals(meals), []);

  const handleConfirm = useCallback(() => {
    if (!selectedStrategy) return;
    onStrategyConfirmed(selectedStrategy, editedMeals);
  }, [selectedStrategy, editedMeals, onStrategyConfirmed]);

  const editedTotals = useMemo(() => editedMeals.reduce(
    (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [editedMeals]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analisando perfil clínico do paciente...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">Não foi possível analisar o perfil do paciente.</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">Voltar</Button>
      </div>
    );
  }

  if (viewMode === "preview" && selectedStrategy) {
    return (
      <StrategyPreviewPanel
        strategy={selectedStrategy}
        meals={editedMeals}
        totals={editedTotals}
        onMealsChanged={handleMealsChanged}
        onBack={handleBackToOverview}
        onConfirm={handleConfirm}
        disclaimer={analysis.previewDisclaimer}
      />
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pr-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Brain className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">Consultor de Estratégia IFJ</h2>
            <p className="text-[10px] text-muted-foreground truncate">Análise clínica + 3 protocolos sugeridos</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7 shrink-0">
          <ArrowLeft className="w-3 h-3 mr-1" /> Voltar
        </Button>
      </div>

      <PatientProfileSummary profile={analysis.profile} />

      {/* Preview disclaimer */}
      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed break-words">
          {analysis.previewDisclaimer}
        </p>
      </div>

      {/* Strategy Cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider truncate">3 Estratégias Recomendadas</h3>
        </div>
        
        <div className="space-y-3 w-full">
          {strategies.map((strategy, idx) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              rank={idx + 1}
              isSelected={selectedStrategyId === strategy.id}
              onSelect={() => handleSelectStrategy(strategy.id)}
              onPreview={() => handleOpenPreview(strategy.id)}
              onSizeChange={(size) => handleSizeChange(strategy.id, size)}
            />
          ))}
        </div>
      </div>

      {selectedStrategy && (
        <Button
          onClick={() => handleOpenPreview(selectedStrategy.id)}
          className="w-full h-10 text-xs gap-2 gradient-primary shadow-glow"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="truncate">Abrir Preview de "{selectedStrategy.name}"</span>
        </Button>
      )}
    </div>
  );
}
