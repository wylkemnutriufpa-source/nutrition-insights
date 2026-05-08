import { useEffect, useState, useMemo, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { supabase } from "@/integrations/supabase/client";
import { activateMealPlan } from "@/lib/serverTransitions";
import { runPlanPipeline, type PipelineInput } from "@/lib/planPipelineOrchestrator";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen, Search, ArrowLeft, ChevronRight, Sparkles, Loader2,
  Coffee, Apple, Utensils, Cookie, Moon, Sun, ArrowRight,
  Flame, Beef, Wheat, Droplets, AlertTriangle, Check, RefreshCw, ClipboardCheck
} from "lucide-react";
import { TemplateFoodVisual } from "@/components/meal/TemplateFoodVisual";
import { safeNum, fmtMacro } from "@/lib/formatMacros";
import ConsistencyReportModal from "@/components/hybrid-builder/ConsistencyReportModal";

interface DietTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  goal_category?: string;
  diet_style?: string;
  complexity_level?: string;
  food_access_level?: string;
  clinical_tags?: string[];
  caloric_versions?: Record<string, any>;
  weekly_variation_strategy?: Record<string, any>;
  meal_distribution?: Record<string, any>;
  conditions: string[];
  base_calories: number;
  macro_ratio: { protein: number; carbs: number; fat: number };
  meals: TemplateMeal[];
  tags: string[];
  template_generation?: string;
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
  emagrecimento: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  hipertrofia: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  recomposicao: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  manutencao: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  performance: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  metabolico: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  clinico_especifico: "bg-red-500/10 text-red-500 border-red-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  clinical: "Clínico",
  weight: "Peso",
  sport: "Esportivo",
  lifestyle: "Estilo de Vida",
  special: "Especial",
  emagrecimento: "Emagrecimento",
  hipertrofia: "Hipertrofia",
  recomposicao: "Recomposição",
  manutencao: "Manutenção",
  performance: "Performance",
  metabolico: "Metabólico",
  clinico_especifico: "Clínico Específico",
};

const TemplateCard = memo(({ template, getAdjustedCalories, anamnesis, physicalAssessment, CATEGORY_COLORS, CATEGORY_LABELS, onPreview, isLegacy }: {
  template: DietTemplate;
  getAdjustedCalories: (t: DietTemplate) => number;
  anamnesis: AnamnesisData | null;
  physicalAssessment: PhysicalAssessmentData | null;
  CATEGORY_COLORS: Record<string, string>;
  CATEGORY_LABELS: Record<string, string>;
  onPreview: (t: DietTemplate) => void;
  isLegacy?: boolean;
}) => {
  const adjustedCal = getAdjustedCalories(template);
  const isAdjusted = (anamnesis || physicalAssessment) && adjustedCal !== template.base_calories;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass rounded-xl p-5 shadow-card cursor-pointer group relative"
      onClick={() => onPreview(template)}
    >
      {isLegacy && (
        <Badge variant="outline" className="absolute top-2 right-2 text-[9px] text-muted-foreground">
          Legado
        </Badge>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{template.icon}</span>
          <div>
            <h3 className="font-display font-semibold group-hover:text-primary transition-colors">
              {template.name}
            </h3>
            <Badge variant="outline" className={`text-[10px] mt-1 ${CATEGORY_COLORS[template.goal_category || template.category] || ""}`}>
              {CATEGORY_LABELS[template.goal_category || template.category] || template.goal_category || template.category}
            </Badge>
            {template.diet_style && (
              <Badge variant="outline" className="text-[10px] mt-1 ml-1">
                {template.diet_style.replace(/_/g, " ")}
              </Badge>
            )}
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
        {(template.tags || []).slice(0, 4).map((tag) => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {tag.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </motion.div>
  );
});

export default function DietTemplates() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");
  const mealPlanId = searchParams.get("mealPlanId");

  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  // Preview dialog
  const [previewTemplate, setPreviewTemplate] = useState<DietTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Consistency Report
  const [showConsistencyReport, setShowConsistencyReport] = useState(false);
  const [marmitaRecipes, setMarmitaRecipes] = useState<any[]>([]);

  // Anamnesis data for personalization
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null);
  const [physicalAssessment, setPhysicalAssessment] = useState<PhysicalAssessmentData | null>(null);
  const [patientName, setPatientName] = useState("");
  const [applying, setApplying] = useState(false);

  const fetchMarmitaRecipes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meal_recipes")
      .select("*")
      .eq("nutritionist_id", user.id)
      .eq("is_active", true);
    
    if (data) {
      const formatted = data.map(r => ({
        name: r.name,
        meal_type: r.meal_type || "lunch",
        calories: r.fixed_calories || 0,
        protein: r.fixed_protein || 0,
        carbs: r.fixed_carbs || 0,
        fat: r.fixed_fat || 0,
        is_fixed: true
      }));
      setMarmitaRecipes(formatted);
      setShowConsistencyReport(true);
    }
  };

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
    try {
      const { data } = await supabase
        .from("physical_assessments")
        .select("calories_target, protein_target, carbs_target, fat_target, tdee, bmr, assessment_date")
        .eq("patient_id", patientId)
        .order("assessment_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setPhysicalAssessment(data as any);
    } catch (e) {
      console.warn("[DietTemplates] fetchPhysicalAssessment error:", e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("diet_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      console.log("[DietTemplates] fetch result:", { count: data?.length, error, sample: data?.[0]?.name });
      if (error) {
        console.error("[DietTemplates] fetch error:", error);
        toast.error("Erro ao carregar templates: " + error.message);
      }
      setTemplates((data as any) || []);
    } catch (e) {
      console.error("[DietTemplates] unexpected error:", e);
    }
    setLoading(false);
  };

  const fetchAnamnesis = async () => {
    if (!patientId) return;
    try {
      const { data } = await withTenantFilter(
        supabase
          .from("patient_anamnesis")
          .select("computed_kcal_target, computed_protein, computed_carbs, computed_fat, answers")
          .eq("user_id", patientId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1),
        tenantId
      ).maybeSingle();
      if (data) setAnamnesis(data as any);
    } catch (e) {
      console.warn("[DietTemplates] fetchAnamnesis error:", e);
    }
  };

  const fetchPatientName = async () => {
    if (!patientId) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", patientId)
        .maybeSingle();
      if (data) setPatientName(data.full_name);
    } catch (e) {
      console.warn("[DietTemplates] fetchPatientName error:", e);
    }
  };

  const filtered = useMemo(() => {
    let result = templates.map(t => {
      const raw = t.macro_ratio && typeof t.macro_ratio === 'object' ? t.macro_ratio : { protein: 30, carbs: 45, fat: 25 };
      const macro_ratio = {
        protein: raw.protein <= 1 ? Math.round(raw.protein * 100) : raw.protein,
        carbs: raw.carbs <= 1 ? Math.round(raw.carbs * 100) : raw.carbs,
        fat: raw.fat <= 1 ? Math.round(raw.fat * 100) : raw.fat,
      };
      return {
        ...t,
        meals: Array.isArray(t.meals) ? t.meals : [],
        tags: Array.isArray(t.tags) ? t.tags : [],
        conditions: Array.isArray(t.conditions) ? t.conditions : [],
        macro_ratio,
      };
    });
    if (categoryFilter) result = result.filter((t) => (t.goal_category || t.category) === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          t.tags.some((tag: string) => tag.includes(q)) ||
          t.conditions.some((c: string) => c.includes(q)) ||
          (t.diet_style || "").toLowerCase().includes(q) ||
          (t.clinical_tags || []).some((ct: string) => ct.includes(q))
      );
    }
    return result;
  }, [templates, search, categoryFilter]);

  const officialTemplates = useMemo(() => filtered.filter(t => t.template_generation === 'official_v2'), [filtered]);
  const legacyTemplates = useMemo(() => filtered.filter(t => t.template_generation !== 'official_v2'), [filtered]);

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.goal_category || t.category));
    return Array.from(cats).filter(Boolean);
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

  // Helpers de coerção e renderização defensiva vivem em @/lib/formatMacros
  // (compartilhados com MealLibraryModal, MealLibrarySidebar, AssistedPlanModal,
  //  AutoFixResultsModal, PremiumRecipeModal, TemplateNutritionAudit).

  const getAdjustedCalories = (template: DietTemplate) => {
    const effective = getEffectiveCalories();
    if (effective && Number.isFinite(effective)) return effective;
    const base = safeNum(template.base_calories);
    return base > 0 ? base : 0;
  };

  const getCalorieMultiplier = (template: DietTemplate) => {
    const base = safeNum(template.base_calories);
    // Divisor degenerado (base_calories = 0/null/NaN): fallback para 1 (sem ajuste)
    // ao invés de NaN/Infinity, que vazariam para a UI como "NaNkcal".
    if (base <= 0) return 1;
    const adjusted = safeNum(getAdjustedCalories(template));
    const mult = adjusted / base;
    return Number.isFinite(mult) ? mult : 1;
  };

  const adjustFood = (food: TemplateFood, multiplier: number) => {
    const m = Number.isFinite(multiplier) ? multiplier : 1;
    return {
      ...food,
      calories: Math.round(safeNum(food.calories) * m),
      protein: Math.round(safeNum(food.protein) * m),
      carbs: Math.round(safeNum(food.carbs) * m),
      fat: Math.round(safeNum(food.fat) * m),
    };
  };

  const toggleSubstitution = (key: string, maxSubs: number) => {
    setActiveSubstitutions((prev) => {
      const current = prev[key] ?? -1;
      const next = current + 1 >= maxSubs ? -1 : current + 1;
      return { ...prev, [key]: next };
    });
  };

  /**
   * V2 ADAPTER: For official_v2 templates with `blocks` structure, build meal_plan_items
   * directly (1 day) and persist all substitution options as sibling items grouped by
   * substitution_group_id, with full macros — instead of stuffing them into description text.
   */
  const applyOfficialV2Template = async (template: DietTemplate): Promise<string> => {
    const meals: any[] = Array.isArray((template as any).meals) ? (template as any).meals : [];
    if (meals.length === 0) throw new Error("Template sem refeições configuradas");

    // 1. Create plan
    const { data: plan, error: planErr } = await (supabase
      .from("meal_plans")
      .insert([{
        patient_id: patientId,
        nutritionist_id: user!.id,
        title: template.name + (patientName ? ` - ${patientName}` : ""),
        description: `Baseado no modelo "${template.name}".`,
        start_date: new Date().toISOString().split("T")[0],
        is_active: false,
        plan_status: "draft_template",
        tenant_id: tenantId || null,
        total_calories: getAdjustedCalories(template),
        total_protein: getEffectiveMacros().protein || 0,
        total_carbs: getEffectiveMacros().carbs || 0,
        total_fat: getEffectiveMacros().fat || 0,
      }] as any) as any)
      .select("id")
      .single();
    if (planErr || !plan) throw new Error(planErr?.message || "Falha ao criar plano");

    // 2. Build items for 1 day. Each block becomes a substitution_group_id with the
    //    primary option flagged is_primary=true; all other options are siblings with
    //    full macros (already adjusted by the patient multiplier) so the patient
    //    and the engine can swap with proper calculation.
    const multiplier = getCalorieMultiplier(template);
    const scaleNum = (n: any) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return null;
      return Math.round(v * multiplier);
    };

    const items: any[] = [];
    const day = 0; // single day

    // NEW: Fetch nutritionist's meal recipes to replace "Marmita" placeholders if present
    let mealRecipes: any[] = [];
    const marmitaPlaceholders = ["Marmita congelada do dia", "Marmita do dia", "Marmita Selecionada", "marmita do dia"];
    const hasMarmitaPlaceholder = meals.some(m => 
      Array.isArray(m.blocks) && m.blocks.some((b: any) => 
        Array.isArray(b.options) && b.options.some((o: any) => 
          o.name && marmitaPlaceholders.some(p => o.name.includes(p))
        )
      )
    );

    if (hasMarmitaPlaceholder) {
      console.log("[DietTemplates] Marmita placeholder detected, fetching recipes...");
      const { data: recipes } = await supabase
        .from("meal_recipes")
        .select("*")
        .eq("nutritionist_id", user!.id)
        .eq("is_active", true);
      mealRecipes = recipes || [];
      console.log(`[DietTemplates] Found ${mealRecipes.length} recipes for replacement`);
    }

    let globalMarmitaCounter = 0;

    for (const meal of meals) {
      const mealType = meal.meal_type || meal.type;
      if (!mealType) continue;

      const blocks: any[] = Array.isArray(meal.blocks) ? meal.blocks : [];
      const legacyFoods: any[] = Array.isArray(meal.foods) ? meal.foods : [];

      if (blocks.length > 0) {
        for (const b of blocks) {
          const opts: any[] = Array.isArray(b.options) ? b.options : [];
          if (opts.length === 0) continue;

          // Group id shared by primary + all substitution options
          const groupId =
            (typeof crypto !== "undefined" && (crypto as any).randomUUID)
              ? (crypto as any).randomUUID()
              : `grp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

          opts.forEach((opt: any, idx: number) => {
            let finalName = opt?.name || b.label || "Item";
            let finalCalories = opt?.calories;
            let finalProtein = opt?.protein;
            let finalCarbs = opt?.carbs;
            let finalFat = opt?.fat;
            let finalPortion = opt?.portion || b.base_quantity || null;

            // Detect placeholder and replace with a recipe
            const isPlaceholder = finalName && marmitaPlaceholders.some(p => finalName.includes(p));
            if (isPlaceholder && mealRecipes.length > 0) {
              const isLunch = mealType === "lunch" || mealType === "almoco" || mealType === "almoço";
              const candidates = mealRecipes
                .filter(r => {
                  const rt = r.meal_type?.toLowerCase() || "";
                  if (isLunch) return rt === "almoço" || rt === "almoco" || rt === "lunch";
                  return rt === "jantar" || rt === "dinner";
                })
                .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
              
              if (candidates.length > 0) {
                const picked = candidates[globalMarmitaCounter % candidates.length];
                globalMarmitaCounter++;
                finalName = `🍱 ${picked.name}`;
                finalCalories = picked.fixed_calories;
                finalProtein = picked.fixed_protein;
                finalCarbs = picked.fixed_carbs;
                finalFat = picked.fixed_fat;
                finalPortion = "1 marmita";
                console.log(`[DietTemplates] Replaced placeholder with ${picked.name}`);
              }
            }

            items.push({
              meal_plan_id: plan.id,
              day_of_week: day,
              meal_type: mealType,
              title: finalName,
              description: finalPortion,
              calories_target: scaleNum(finalCalories),
              protein_target: scaleNum(finalProtein),
              carbs_target: scaleNum(finalCarbs),
              fat_target: scaleNum(finalFat),
              substitution_group_id: groupId,
              is_primary: idx === 0,
            });
          });
        }
      } else if (legacyFoods.length > 0) {
        for (const f of legacyFoods) {
          let finalName = f.name || "Item";
          let finalCalories = f.calories;
          let finalProtein = f.protein;
          let finalCarbs = f.carbs;
          let finalFat = f.fat;
          let finalPortion = f.portion || null;
          const legacySubs: string[] = Array.isArray(f.substitutions) ? f.substitutions : [];

          // Group id for substitutions if they exist
          const groupId = legacySubs.length > 0 
            ? ((typeof crypto !== "undefined" && (crypto as any).randomUUID)
              ? (crypto as any).randomUUID()
              : `grp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)
            : undefined;

          // Detect placeholder and replace with a recipe
          const isPlaceholder = finalName && marmitaPlaceholders.some(p => finalName.includes(p));
          if (isPlaceholder && mealRecipes.length > 0) {
            const isLunch = mealType === "lunch" || mealType === "almoco" || mealType === "almoço";
            const candidates = mealRecipes
              .filter(r => {
                const rt = r.meal_type?.toLowerCase() || "";
                if (isLunch) return rt === "almoço" || rt === "almoco" || rt === "lunch";
                return rt === "jantar" || rt === "dinner";
              })
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            
            if (candidates.length > 0) {
              const picked = candidates[globalMarmitaCounter % candidates.length];
              globalMarmitaCounter++;
              finalName = `🍱 ${picked.name}`;
              finalCalories = picked.fixed_calories;
              finalProtein = picked.fixed_protein;
              finalCarbs = picked.fixed_carbs;
              finalFat = picked.fixed_fat;
              finalPortion = "1 marmita";
              console.log(`[DietTemplates] Replaced legacy placeholder with ${picked.name}`);
            }
          }

          // Insert primary item
          items.push({
            meal_plan_id: plan.id,
            day_of_week: day,
            meal_type: mealType,
            title: finalName,
            description: finalPortion,
            calories_target: scaleNum(finalCalories),
            protein_target: scaleNum(finalProtein),
            carbs_target: scaleNum(finalCarbs),
            fat_target: scaleNum(finalFat),
            substitution_group_id: groupId,
            is_primary: true,
          });

          // Insert legacy substitutions as sibling items
          legacySubs.forEach((subName) => {
            items.push({
              meal_plan_id: plan.id,
              day_of_week: day,
              meal_type: mealType,
              title: subName,
              description: "Substituição",
              calories_target: scaleNum(finalCalories), // Assume same calories as primary for legacy
              protein_target: scaleNum(finalProtein),
              carbs_target: scaleNum(finalCarbs),
              fat_target: scaleNum(finalFat),
              substitution_group_id: groupId,
              is_primary: false,
            });
          });
        }
      }
    }

    if (items.length === 0) throw new Error("Nenhum item gerado a partir dos blocos do template");

    const { error: itemsErr } = await supabase.from("meal_plan_items").insert(items);
    if (itemsErr) throw new Error(`Falha ao inserir itens: ${itemsErr.message}`);

    return plan.id;
  };

  const handleApplyTemplate = async (template: DietTemplate) => {
    if (!user || !patientId) {
      toast.error("Paciente não selecionado");
      return;
    }
    setApplying(true);

    try {
      let targetPlanId = mealPlanId;
      let itemsCount = 0;

      // ── PATH A: Direct import (preferido — sem edge function, sem trava) ──
      // Aplicamos direto sempre que o template tiver `meals` com `blocks` OU `foods`,
      // independentemente de `template_generation`. Isso evita o caminho legado da
      // edge function que aplicava 7 dias e exigia vínculo nutricionista↔paciente.
      const meals = Array.isArray((template as any).meals) ? (template as any).meals : [];
      const isV2 = meals.some((m: any) =>
        (Array.isArray(m?.blocks) && m.blocks.length > 0) ||
        (Array.isArray(m?.foods) && m.foods.length > 0)
      );

      const tryPathA = async () => {
        const id = await applyOfficialV2Template(template);
        const { count } = await supabase
          .from("meal_plan_items")
          .select("*", { count: "exact", head: true })
          .eq("meal_plan_id", id);
        return { id, count: count || 0 };
      };

      const tryPathB = async () => {
        const pipelineInput: PipelineInput = {
          patientId,
          nutritionistId: user.id,
          tenantId: "",
          planTitle: template.name + (patientName ? ` - ${patientName}` : ""),
          planDescription: `Baseado no modelo "${template.name}". ${anamnesis ? "Ajustado conforme anamnese do paciente." : ""}`,
          startDate: new Date().toISOString().split("T")[0],
          existingPlanId: targetPlanId || undefined,
          templateSlug: template.slug,
          generationMode: "quick",
        };
        const result = await runPlanPipeline(pipelineInput);
        if (!result.success || !result.planId) {
          throw new Error(result.warnings?.[0] || "Falha ao gerar plano alimentar");
        }
        return { id: result.planId, count: result.auditLog.items_total };
      };

      // ── Templates com refeições estruturadas SEMPRE entram direto. ──
      // Não fazemos fallback para o motor genérico, porque isso pode trocar um
      // template clínico (ex.: diabetes) por um plano qualquer e reintroduzir
      // bloqueios de divergência que não pertencem ao fluxo de template.
      let outcome: { id: string; count: number } | null = null;
      if (isV2) {
        outcome = await tryPathA();
        console.log("[DietTemplates] PATH A applied:", outcome);
      } else {
        try {
          outcome = await tryPathB();
          console.log("[DietTemplates] PATH B applied:", outcome);
        } catch (errB: any) {
          // PATH B falhou — se houver `meals` no template, tentamos PATH A mesmo
          // sem flag oficial v2 (qualquer estrutura `blocks`/`foods` é suficiente).
          if (meals.length > 0) {
            console.warn("[DietTemplates] PATH B failed, trying PATH A fallback:", errB?.message);
            outcome = await tryPathA();
            console.log("[DietTemplates] PATH A fallback applied:", outcome);
          } else {
            throw errB;
          }
        }
      }

      targetPlanId = outcome.id;
      itemsCount = outcome.count;

      // Activate plan atomically
      const activateResult = await activateMealPlan(targetPlanId);
      if (!activateResult.success) {
        console.warn("[DietTemplates] activateMealPlan fallback:", activateResult.error);
      }

      toast.success(`Plano alimentar gerado com ${itemsCount} refeições! 🎉`);
      setPreviewOpen(false);
      navigate(`/editor-v3/${patientId}?planId=${targetPlanId}`);
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

        <div className="flex items-center gap-2 justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-xs border-primary/20 text-primary hover:bg-primary/5"
            onClick={fetchMarmitaRecipes}
          >
            <ClipboardCheck className="w-4 h-4" /> Relatório de Consistência
          </Button>
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
          <div className="space-y-8">
            {/* Official V2 Templates */}
            {officialTemplates.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-primary/10 text-primary border-primary/30 gap-1">
                    <Check className="w-3 h-3" /> Verificados
                  </Badge>
                  <span className="text-sm text-muted-foreground">{officialTemplates.length} modelos com visual verificado</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {officialTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      getAdjustedCalories={getAdjustedCalories}
                      anamnesis={anamnesis}
                      physicalAssessment={physicalAssessment}
                      CATEGORY_COLORS={CATEGORY_COLORS}
                      CATEGORY_LABELS={CATEGORY_LABELS}
                      onPreview={(t) => { setPreviewTemplate(t); setPreviewOpen(true); setActiveSubstitutions({}); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Templates */}
            {legacyTemplates.length > 0 && (
              <div>
                <button
                  onClick={() => setShowLegacy(!showLegacy)}
                  className="flex items-center gap-2 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <AlertTriangle className="w-3 h-3" /> Legado
                  </Badge>
                  <span>{legacyTemplates.length} modelos antigos</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showLegacy ? 'rotate-90' : ''}`} />
                </button>
                {showLegacy && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                    {legacyTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        getAdjustedCalories={getAdjustedCalories}
                        anamnesis={anamnesis}
                        physicalAssessment={physicalAssessment}
                        CATEGORY_COLORS={CATEGORY_COLORS}
                        CATEGORY_LABELS={CATEGORY_LABELS}
                        onPreview={(t) => { setPreviewTemplate(t); setPreviewOpen(true); setActiveSubstitutions({}); }}
                        isLegacy
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
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
                        Calorias ajustadas de {fmtMacro(previewTemplate.base_calories)} → <span className="font-bold text-foreground">{fmtMacro(getAdjustedCalories(previewTemplate))} kcal/dia</span>
                        {getEffectiveMacros().protein && (
                          <> • P: {fmtMacro(getEffectiveMacros().protein)}g • C: {fmtMacro(getEffectiveMacros().carbs)}g • G: {fmtMacro(getEffectiveMacros().fat)}g</>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Meal preview */}
                <div className="space-y-4 mt-2">
                  {(Array.isArray(previewTemplate.meals) && previewTemplate.meals.length > 0) ? previewTemplate.meals.map((mealRaw, mi) => {
                    const multiplier = getCalorieMultiplier(previewTemplate);
                    // Adapter v2.1: templates v2 use `blocks` (modular) instead of `foods` (legacy).
                    // Flatten ALL options into food list so the preview shows every choice.
                    const meal: any = (() => {
                      const m: any = mealRaw || {};
                      if (Array.isArray(m.foods) && m.foods.length > 0) return m;
                      const blocks = Array.isArray(m.blocks) ? m.blocks : [];
                      if (blocks.length > 0) {
                        const foods = blocks.flatMap((b: any) => {
                          const opts = Array.isArray(b?.options) ? b.options : [];
                          if (opts.length === 0) {
                            // bloco sem options → ainda renderiza um placeholder com label
                            return [{
                              name: b?.label || b?.block_type || "Item",
                              portion: b?.base_quantity || "",
                              calories: 0, protein: 0, carbs: 0, fat: 0,
                              substitutions: [],
                            }];
                          }
                          const primary = opts[0] || {};
                          const subs = opts.slice(1).map((o: any) => o?.name).filter(Boolean);
                          return [{
                            name: primary?.name || b?.label || "Item",
                            portion: primary?.portion || b?.base_quantity || "",
                            calories: primary?.calories || 0,
                            protein: primary?.protein || 0,
                            carbs: primary?.carbs || 0,
                            fat: primary?.fat || 0,
                            substitutions: subs,
                          }];
                        });
                        return { ...m, foods };
                      }
                      return m;
                    })();
                    const mealCals = (meal.foods || []).reduce((s: number, f: any) => s + Math.round(safeNum(f.calories) * multiplier), 0);

                    return (
                      <div key={mi} className="glass rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {MEAL_ICONS[meal.meal_type || (meal as any).type]}
                            <h4 className="font-display font-semibold text-sm">{meal.title}</h4>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" /> {fmtMacro(mealCals)} kcal
                          </span>
                        </div>

                        <div className="space-y-2">
                          {(meal.foods && meal.foods.length > 0) ? meal.foods.map((food, fi) => {
                            const key = `${mi}-${fi}`;
                            const subIdx = activeSubstitutions[key] ?? -1;
                            const adjusted = adjustFood(food, multiplier);
                            const isSwapped = subIdx >= 0;

                            return (
                              <div key={fi} className="flex items-start gap-2 text-sm">
                                <TemplateFoodVisual foodName={food.name} />
                                <div className="flex-1 flex items-start justify-between gap-2">
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
                                    {food.substitutions?.length > 0 && (
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
                                    <span className="text-orange-400">{fmtMacro(adjusted.calories)}kcal</span>
                                    {" · "}P{fmtMacro(adjusted.protein)}g · C{fmtMacro(adjusted.carbs)}g · G{fmtMacro(adjusted.fat)}g
                                  </div>
                                </div>
                              </div>
                            );
                          }) : (
                            <p className="text-xs text-muted-foreground italic">
                              {(meal as any).pct ? `${fmtMacro(safeNum((meal as any).pct) * 100)}% das calorias diárias (~${fmtMacro(getAdjustedCalories(previewTemplate) * safeNum((meal as any).pct))} kcal)` : "Sem alimentos detalhados"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="glass rounded-lg p-6 text-center text-muted-foreground">
                      <p className="text-sm">Este template define regras calóricas e de substituição, mas não possui refeições detalhadas pré-configuradas.</p>
                      <p className="text-xs mt-2">Use-o como base para geração automática de planos.</p>
                    </div>
                  )}
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
                      {applying ? "Aplicando..." : "Aplicar Modelo"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <ConsistencyReportModal 
          open={showConsistencyReport} 
          onOpenChange={setShowConsistencyReport} 
          recipes={marmitaRecipes} 
          targetKcal={getEffectiveCalories() || undefined} 
        />
      </div>
    </DashboardLayout>
  );
}
