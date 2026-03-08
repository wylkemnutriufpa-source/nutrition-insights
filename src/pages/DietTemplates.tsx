import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen, Search, ArrowLeft, ChevronRight, Sparkles, Loader2,
  Coffee, Apple, Utensils, Cookie, Moon, Sun, ArrowRight,
  Flame, Beef, Wheat, Droplets, AlertTriangle, Check, RefreshCw
} from "lucide-react";

interface DietTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  conditions: string[];
  base_calories: number;
  macro_ratio: { protein: number; carbs: number; fat: number };
  meals: TemplateMeal[];
  tags: string[];
}

interface TemplateFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  substitutions: string[];
}

interface TemplateMeal {
  meal_type: string;
  title: string;
  foods: TemplateFood[];
}

interface AnamnesisData {
  computed_kcal_target: number | null;
  computed_protein: number | null;
  computed_carbs: number | null;
  computed_fat: number | null;
  answers: Record<string, any>;
}

interface PhysicalAssessmentData {
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  tdee: number | null;
  bmr: number | null;
  assessment_date: string;
}

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="w-4 h-4" />,
  morning_snack: <Apple className="w-4 h-4" />,
  lunch: <Utensils className="w-4 h-4" />,
  afternoon_snack: <Cookie className="w-4 h-4" />,
  dinner: <Moon className="w-4 h-4" />,
  evening_snack: <Sun className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  clinical: "bg-red-500/10 text-red-500 border-red-500/20",
  weight: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  sport: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  lifestyle: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  special: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  clinical: "Clínico",
  weight: "Peso",
  sport: "Esportivo",
  lifestyle: "Estilo de Vida",
  special: "Especial",
};

export default function DietTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");
  const mealPlanId = searchParams.get("mealPlanId");

  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Preview dialog
  const [previewTemplate, setPreviewTemplate] = useState<DietTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Anamnesis data for personalization
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null);
  const [physicalAssessment, setPhysicalAssessment] = useState<PhysicalAssessmentData | null>(null);
  const [patientName, setPatientName] = useState("");
  const [applying, setApplying] = useState(false);

  // Substitution toggles per food (index path)
  const [activeSubstitutions, setActiveSubstitutions] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTemplates();
    if (patientId) {
      fetchAnamnesis();
      fetchPhysicalAssessment();
      fetchPatientName();
    }
  }, [patientId]);

  const fetchPhysicalAssessment = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("physical_assessments" as any)
      .select("calories_target, protein_target, carbs_target, fat_target, tdee, bmr, assessment_date")
      .eq("patient_id", patientId)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .single();
    if (data) setPhysicalAssessment(data as any);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("diet_templates" as any)
      .select("*")
      .eq("is_active", true)
      .order("name");
    setTemplates((data as any) || []);
    setLoading(false);
  };

  const fetchAnamnesis = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("patient_anamnesis")
      .select("computed_kcal_target, computed_protein, computed_carbs, computed_fat, answers")
      .eq("user_id", patientId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) setAnamnesis(data as any);
  };

  const fetchPatientName = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", patientId)
      .single();
    if (data) setPatientName(data.full_name);
  };

  const filtered = useMemo(() => {
    let result = templates;
    if (categoryFilter) result = result.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)) ||
          t.conditions.some((c) => c.includes(q))
      );
    }
    return result;
  }, [templates, search, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category));
    return Array.from(cats);
  }, [templates]);

  // Physical assessment takes priority over anamnesis for calorie targets
  const getEffectiveCalories = () => {
    if (physicalAssessment?.calories_target) return Math.round(Number(physicalAssessment.calories_target));
    if (anamnesis?.computed_kcal_target) return Math.round(Number(anamnesis.computed_kcal_target));
    return null;
  };

  const getEffectiveMacros = () => ({
    protein: physicalAssessment?.protein_target ? Math.round(Number(physicalAssessment.protein_target)) : (anamnesis?.computed_protein ? Math.round(Number(anamnesis.computed_protein)) : null),
    carbs: physicalAssessment?.carbs_target ? Math.round(Number(physicalAssessment.carbs_target)) : (anamnesis?.computed_carbs ? Math.round(Number(anamnesis.computed_carbs)) : null),
    fat: physicalAssessment?.fat_target ? Math.round(Number(physicalAssessment.fat_target)) : (anamnesis?.computed_fat ? Math.round(Number(anamnesis.computed_fat)) : null),
  });

  const dataSource = physicalAssessment?.calories_target ? "assessment" : "anamnesis";

  const getAdjustedCalories = (template: DietTemplate) => {
    const effective = getEffectiveCalories();
    if (!effective) return template.base_calories;
    return effective;
  };

  const getCalorieMultiplier = (template: DietTemplate) => {
    const adjusted = getAdjustedCalories(template);
    return adjusted / template.base_calories;
  };

  const adjustFood = (food: TemplateFood, multiplier: number) => ({
    ...food,
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier),
    carbs: Math.round(food.carbs * multiplier),
    fat: Math.round(food.fat * multiplier),
  });

  const toggleSubstitution = (key: string, maxSubs: number) => {
    setActiveSubstitutions((prev) => {
      const current = prev[key] ?? -1;
      const next = current + 1 >= maxSubs ? -1 : current + 1;
      return { ...prev, [key]: next };
    });
  };

  const handleApplyTemplate = async (template: DietTemplate) => {
    if (!user || !patientId) {
      toast.error("Paciente não selecionado");
      return;
    }
    setApplying(true);

    try {
      const multiplier = getCalorieMultiplier(template);
      let targetPlanId = mealPlanId;

      // If no meal plan exists, create one
      if (!targetPlanId) {
        const { data: newPlan, error: planError } = await supabase
          .from("meal_plans")
          .insert({
            nutritionist_id: user.id,
            patient_id: patientId,
            title: template.name + (patientName ? ` - ${patientName}` : ""),
            description: `Baseado no modelo "${template.name}". ${anamnesis ? "Ajustado conforme anamnese do paciente." : ""}`,
            start_date: new Date().toISOString().split("T")[0],
          })
          .select("id")
          .single();

        if (planError) throw planError;
        targetPlanId = newPlan.id;
      }

      // Build meal plan items for all 7 days
      const items: any[] = [];
      for (let day = 0; day <= 6; day++) {
        for (const meal of template.meals) {
          const adjustedFoods = meal.foods.map((f) => adjustFood(f, multiplier));
          const totalCals = adjustedFoods.reduce((s, f) => s + f.calories, 0);
          const totalProtein = adjustedFoods.reduce((s, f) => s + f.protein, 0);
          const totalCarbs = adjustedFoods.reduce((s, f) => s + f.carbs, 0);
          const totalFat = adjustedFoods.reduce((s, f) => s + f.fat, 0);

          // Build description with foods and substitutions
          const desc = adjustedFoods
            .map((f) => {
              const subText = f.substitutions?.length
                ? `\n   🔄 Substituições: ${f.substitutions.join(" | ")}`
                : "";
              return `• ${f.name} (${f.portion}) — ${f.calories}kcal${subText}`;
            })
            .join("\n");

          items.push({
            meal_plan_id: targetPlanId,
            title: meal.title,
            description: desc,
            meal_type: meal.meal_type,
            day_of_week: day,
            calories_target: totalCals,
            protein_target: totalProtein,
            carbs_target: totalCarbs,
            fat_target: totalFat,
          });
        }
      }

      const { error: itemsError } = await supabase.from("meal_plan_items").insert(items);
      if (itemsError) throw itemsError;

      // Add timeline event
      await supabase.from("patient_timeline").insert({
        patient_id: patientId,
        created_by: user.id,
        event_type: "meal_plan",
        title: `Modelo "${template.name}" aplicado`,
        description: `Plano alimentar criado a partir do modelo pré-definido com ${items.length} refeições. ${anamnesis ? "Calorias ajustadas para " + getAdjustedCalories(template) + "kcal." : ""}`,
        metadata: { template_slug: template.slug, adjusted_calories: getAdjustedCalories(template) },
      });

      toast.success(`Modelo aplicado com ${items.length} refeições para 7 dias! 🎉`);
      setPreviewOpen(false);
      navigate(`/meal-plans/${targetPlanId}`);
    } catch (e: any) {
      toast.error("Erro ao aplicar modelo: " + e.message);
    }
    setApplying(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-primary" /> Modelos de Dieta
              </h1>
              <p className="text-muted-foreground text-sm">
                {patientName
                  ? `Escolha um modelo para ${patientName}`
                  : `${templates.length} modelos pré-prontos com substituições`}
              </p>
            </div>
          </div>
          {(anamnesis || physicalAssessment) && (
            <div className="flex items-center gap-2 glass rounded-lg px-3 py-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {dataSource === "assessment" ? "Avaliação Física" : "Anamnese"}:{" "}
                <span className="font-semibold text-foreground">{getEffectiveCalories()} kcal/dia</span>
                {getEffectiveMacros().protein && (
                  <span className="ml-1">• P:{getEffectiveMacros().protein}g C:{getEffectiveMacros().carbs}g G:{getEffectiveMacros().fat}g</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, condição, tag..."
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={categoryFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(null)}
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
              >
                {CATEGORY_LABELS[cat] || cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhum modelo encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar os filtros de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template) => {
              const adjustedCal = getAdjustedCalories(template);
              const isAdjusted = anamnesis && adjustedCal !== template.base_calories;
              const totalTemplateCals = template.meals.reduce(
                (s, m) => s + m.foods.reduce((fs, f) => fs + f.calories, 0),
                0
              );

              return (
                <motion.div
                  key={template.id}
                  whileHover={{ y: -3 }}
                  className="glass rounded-xl p-5 shadow-card cursor-pointer group"
                  onClick={() => {
                    setPreviewTemplate(template);
                    setPreviewOpen(true);
                    setActiveSubstitutions({});
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{template.icon}</span>
                      <div>
                        <h3 className="font-display font-semibold group-hover:text-primary transition-colors">
                          {template.name}
                        </h3>
                        <Badge variant="outline" className={`text-[10px] mt-1 ${CATEGORY_COLORS[template.category] || ""}`}>
                          {CATEGORY_LABELS[template.category] || template.category}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{template.description}</p>

                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="flex items-center gap-1 text-orange-400">
                      <Flame className="w-3 h-3" />
                      {isAdjusted ? (
                        <span>
                          <s className="text-muted-foreground">{template.base_calories}</s> → <span className="font-bold text-primary">{adjustedCal}</span> kcal
                        </span>
                      ) : (
                        <span>{template.base_calories} kcal</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <Beef className="w-3 h-3" /> P{template.macro_ratio.protein}%
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <Wheat className="w-3 h-3" /> C{template.macro_ratio.carbs}%
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <Droplets className="w-3 h-3" /> G{template.macro_ratio.fat}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {tag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {previewTemplate && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-3">
                    <span className="text-3xl">{previewTemplate.icon}</span>
                    <div>
                      <p className="text-xl">{previewTemplate.name}</p>
                      <p className="text-sm font-normal text-muted-foreground">{previewTemplate.description}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                {/* Data source adjustment banner */}
                {(anamnesis || physicalAssessment) && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <Sparkles className="w-5 h-5 text-primary shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-primary">
                        Personalizado pela {dataSource === "assessment" ? "Avaliação Física" : "Anamnese"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Calorias ajustadas de {previewTemplate.base_calories} → <span className="font-bold text-foreground">{getAdjustedCalories(previewTemplate)} kcal/dia</span>
                        {getEffectiveMacros().protein && (
                          <> • P: {getEffectiveMacros().protein}g • C: {getEffectiveMacros().carbs}g • G: {getEffectiveMacros().fat}g</>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Meal preview */}
                <div className="space-y-4 mt-2">
                  {previewTemplate.meals.map((meal, mi) => {
                    const multiplier = getCalorieMultiplier(previewTemplate);
                    const mealCals = meal.foods.reduce((s, f) => s + Math.round(f.calories * multiplier), 0);

                    return (
                      <div key={mi} className="glass rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {MEAL_ICONS[meal.meal_type]}
                            <h4 className="font-display font-semibold text-sm">{meal.title}</h4>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" /> {mealCals} kcal
                          </span>
                        </div>

                        <div className="space-y-2">
                          {meal.foods.map((food, fi) => {
                            const key = `${mi}-${fi}`;
                            const subIdx = activeSubstitutions[key] ?? -1;
                            const adjusted = adjustFood(food, multiplier);
                            const isSwapped = subIdx >= 0;

                            return (
                              <div key={fi} className="flex items-start justify-between gap-2 text-sm">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={isSwapped ? "line-through text-muted-foreground" : ""}>
                                      {food.name}
                                    </span>
                                    {isSwapped && (
                                      <span className="font-medium text-primary">
                                        → {food.substitutions[subIdx]}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{food.portion}</p>
                                  {food.substitutions.length > 0 && (
                                    <button
                                      onClick={() => toggleSubstitution(key, food.substitutions.length)}
                                      className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      {isSwapped ? "Próxima substituição" : "Ver substituições"} ({food.substitutions.length})
                                    </button>
                                  )}
                                </div>
                                <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                  <span className="text-orange-400">{adjusted.calories}kcal</span>
                                  {" · "}P{adjusted.protein}g · C{adjusted.carbs}g · G{adjusted.fat}g
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Apply button */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  {!patientId && (
                    <div className="flex items-center gap-2 text-xs text-amber-500">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Selecione um paciente para aplicar o modelo</span>
                    </div>
                  )}
                  <div className="flex-1" />
                  <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                    Fechar
                  </Button>
                  {patientId && (
                    <Button
                      onClick={() => handleApplyTemplate(previewTemplate)}
                      disabled={applying}
                      className="gradient-primary gap-2 shadow-glow"
                    >
                      {applying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {applying ? "Aplicando..." : "Aplicar Modelo (7 dias)"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
