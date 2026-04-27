import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Flame, Beef, Wheat, Droplets, Clock, ChefHat, Target,
  Shuffle, Leaf, UtensilsCrossed, ScrollText, X, Ruler, RefreshCw,
  ImageIcon, Search, Plus, Pencil, Check, Settings2, AlertTriangle,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { fmtMacro, isMacroInconsistent, getMacroStatusColor, getMacroStatusLabel, safeNum } from "@/lib/formatMacros";
import type { MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import {
  validatePortion,
  getPortionAutocompleteOptions,
  PORTION_ERROR_MESSAGE,
  PORTION_PLACEHOLDER,
  PORTION_DATALIST_ID,
} from "@/lib/portionValidation";

interface FoodItem {
  name: string;
  portion: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface Substitution {
  replace: string;
  options: string[];
}

export interface MealDetailData {
  title: string;
  description?: string | null;
  meal_type?: string;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
  metadata?: Record<string, any> | null;
  image_url?: string | null;
  /** If provided, enables editing capabilities (remove food lines) */
  itemId?: string;
}

interface MealDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: MealDetailData | null;
  /** Called when the nutritionist removes a food line from description */
  onRemoveFoodLine?: (itemId: string, newDescription: string) => void;
  /** Called when image is changed */
  onChangeImage?: (itemId: string, newImageUrl: string) => void;
  /** Full item update */
  onUpdateItem?: (itemId: string, patch: Partial<MealPlanItem>) => void;
}

const MEAL_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  breakfast: { label: "Café da Manhã", emoji: "☕" },
  morning_snack: { label: "Lanche da Manhã", emoji: "🍌" },
  lunch: { label: "Almoço", emoji: "🍽️" },
  afternoon_snack: { label: "Lanche da Tarde", emoji: "🍎" },
  dinner: { label: "Jantar", emoji: "🌙" },
  evening_snack: { label: "Ceia", emoji: "🫖" },
};

const GOAL_LABELS: Record<string, { label: string; color: string }> = {
  weight_loss: { label: "Emagrecimento", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  hypertrophy: { label: "Hipertrofia", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  metabolic: { label: "Metabólico", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  low_carb: { label: "Low Carb", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  functional: { label: "Funcional", color: "bg-teal-500/15 text-teal-600 border-teal-500/30" },
  maintenance: { label: "Manutenção", color: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
};

const CLINICAL_LABELS: Record<string, string> = {
  diabetes: "Diabetes",
  intestinal: "Saúde Intestinal",
  hormonal: "Equilíbrio Hormonal",
  anti_inflammatory: "Anti-inflamatório",
  anti_inflamatorio: "Anti-inflamatório",
  cardiovascular: "Cardiovascular",
  detox: "Detox",
  saciedade: "Alta Saciedade",
  sono: "Melhora do Sono",
};

function parseJsonField<T>(value: any): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

/** Parse description text into main food lines and substitution lines */
function parseDescriptionLines(description: string | null | undefined): {
  foodLines: string[];
  substitutionLines: string[];
  rawSubstitutionHeader: string;
} {
  if (!description) return { foodLines: [], substitutionLines: [], rawSubstitutionHeader: "" };

  const parts = description.split(/\n\n🔄 Substituições:\n/);
  const mainSection = parts[0] || "";
  const subsSection = parts[1] || "";

  const foodLines = mainSection
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const substitutionLines = subsSection
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return { foodLines, substitutionLines, rawSubstitutionHeader: subsSection ? "\n\n🔄 Substituições:\n" : "" };
}

/** Rebuild description from lines */
function rebuildDescription(foodLines: string[], substitutionLines: string[]): string {
  const main = foodLines.join("\n");
  if (substitutionLines.length === 0) return main;
  return main + "\n\n🔄 Substituições:\n" + substitutionLines.join("\n");
}

/** Client-side substitution groups with portions for regeneration */
const CLIENT_SUBSTITUTION_GROUPS: Record<string, { foods: string[]; defaultPortion: string }> = {
  protein_main: { foods: ["frango", "carne moída", "bife", "tilápia", "porco", "sardinha", "alcatra", "patinho"], defaultPortion: "150g" },
  carb_main: { foods: ["arroz", "macarrão", "batata", "macaxeira", "batata doce", "inhame", "purê"], defaultPortion: "120g" },
  carb_breakfast: { foods: ["pão integral", "tapioca", "cuscuz", "pão francês", "pão de forma"], defaultPortion: "50g" },
  protein_breakfast: { foods: ["ovo mexido", "ovo cozido", "queijo coalho", "queijo muçarela", "frango desfiado"], defaultPortion: "60g" },
  fruit: { foods: ["banana", "maçã", "mamão", "laranja", "goiaba", "morango", "tangerina", "melancia", "abacaxi", "manga"], defaultPortion: "100g" },
  dairy: { foods: ["iogurte natural", "leite", "queijo coalho"], defaultPortion: "150ml" },
  legume: { foods: ["feijão", "feijão carioca", "feijão preto", "lentilha"], defaultPortion: "80g" },
  vegetable: { foods: ["alface", "tomate", "brócolis", "cenoura", "couve", "repolho", "chuchu", "abobrinha"], defaultPortion: "50g" },
};

function normalizeForMatch(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Generate substitution lines from food lines */
function generateSubstitutionsFromFoodLines(foodLines: string[], mealType: string): string[] {
  const newSubs: string[] = [];

  for (const line of foodLines) {
    if (!line.startsWith("•")) continue;
    const content = line.slice(1).trim();
    const foodName = content.split("—")[0]?.trim() || content;
    const nFood = normalizeForMatch(foodName);

    // Extract portion from the line if present
    const portionMatch = content.match(/—\s*(\d+(?:[.,]\d+)?\s*(?:g|ml|unidade|fatia|colher)(?:\w*)?)/i);
    const linePortion = portionMatch ? portionMatch[1].trim() : null;

    for (const [groupKey, group] of Object.entries(CLIENT_SUBSTITUTION_GROUPS)) {
      const match = group.foods.find(f => nFood.includes(normalizeForMatch(f)));
      if (match) {
        // Skip groups that don't match meal context
        if (mealType === "breakfast" && (groupKey === "protein_main" || groupKey === "carb_main")) continue;
        if ((mealType === "lunch" || mealType === "dinner") && (groupKey === "protein_breakfast" || groupKey === "carb_breakfast")) continue;

        const portion = linePortion || group.defaultPortion;
        const alternatives = group.foods
          .filter(f => normalizeForMatch(f) !== normalizeForMatch(match))
          .sort(() => Math.random() - 0.5) // shuffle
          .slice(0, 3);

        if (alternatives.length > 0) {
          const altsWithPortion = alternatives.map(a => `${a} (${portion})`);
          newSubs.push(`• ${foodName} → ${altsWithPortion.join(", ")}`);
        }
        break;
      }
    }
  }

  return newSubs;
}

export function MealDetailModal({ open, onOpenChange, meal, onRemoveFoodLine, onChangeImage, onUpdateItem }: MealDetailModalProps) {
  const [removedLines, setRemovedLines] = useState<Set<number>>(new Set());
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [libraryImages, setLibraryImages] = useState<{ id: string; name: string; image_url: string }[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [manualSubInput, setManualSubInput] = useState("");
  const [showManualSubInput, setShowManualSubInput] = useState(false);
  
  // New Editing states
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingLineIdx, setEditingLineIdx] = useState<number | null>(null);
  const [lineNameValue, setLineNameValue] = useState("");
  const [linePortionValue, setLinePortionValue] = useState("");
  const [editingSubLineIdx, setEditingSubLineIdx] = useState<number | null>(null);
  const [subLineValue, setSubLineValue] = useState("");
  const [showManualFoodInput, setShowManualFoodInput] = useState(false);
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualFoodPortion, setManualFoodPortion] = useState("");
  const [linePortionError, setLinePortionError] = useState<string | null>(null);
  const [manualPortionError, setManualPortionError] = useState<string | null>(null);

  const [editingMacros, setEditingMacros] = useState(false);
  const [macroValues, setMacroValues] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dbHistory, setDbHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  const [pendingSuggestion, setPendingSuggestion] = useState<{
    name: string;
    portion: string;
    before: { protein: number; carbs: number; fat: number; calories: number };
    after: { protein: number; carbs: number; fat: number; calories: number };
  } | null>(null);

  const fetchDbHistory = async (offset = 0) => {
    if (!meal?.itemId) return;
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("meal_plan_item_versions")
      .select("*")
      .eq("meal_plan_item_id", meal.itemId)
      .order("created_at", { ascending: false })
      .range(offset, offset + 9);
    
    if (data) {
      if (offset === 0) setDbHistory(data);
      else setDbHistory(prev => [...prev, ...data]);
      setHasMoreHistory(data.length === 10);
    }
    setLoadingHistory(false);
  };

  const saveToHistory = async (actionType: string = "manual_update", restoredFromId: string | null = null, note: string | null = null) => {
    if (!meal?.itemId) return;
    
    // Agora o banco versiona automaticamente via trigger tr_validate_meal_item.
    // Esta função passa a ser um trigger manual para metadados extras se necessário,
    // mas a integridade principal está no backend.
    
    // Log de Auditoria explícito para ações de interface
    await supabase.from("clinical_audit_logs").insert({
      action_type: actionType.toUpperCase(),
      entity_id: meal.itemId,
      status: "success",
      payload_summary: { note, restoredFromId }
    });

    fetchDbHistory(0);
  };

  const rollbackToVersion = async (version: any) => {
    if (!meal?.itemId || !onUpdateItem) return;
    const snap = version.snapshot_data;
    
    // Antes de fazer o rollback, salvamos o estado ATUAL como snapshot para auditoria
    await saveToHistory("manual_update");
    
    // Validação Clínica de Segurança antes de aplicar Restore
    if (snap.protein < 0 || snap.carbs < 0 || snap.fat < 0) {
      toast.error("Impossível restaurar: Snapshot contém dados inconsistentes.");
      return;
    }

    onUpdateItem(meal.itemId, {
      description: snap.description,
      protein_target: snap.protein_target,
      carbs_target: snap.carbs_target,
      fat_target: snap.fat_target,
      calories_target: snap.calories_target,
      title: snap.title
    });
    
    // Log de Auditoria Global de Restore
    await supabase.from("clinical_audit_logs").insert({
      action_type: "RESTORE",
      entity_id: meal.itemId,
      status: "success",
      payload_summary: { from_version: version.id }
    });
    
    // Criamos a versão de rollback após a atualização para registrar a origem no histórico
    setTimeout(() => saveToHistory("restore_version", version.id), 500);
    
    setShowHistory(false);
    toast.success("📚 Versão clínica restaurada com sucesso");
  };

  const findFoodInDatabase = (text: string) => {
    const q = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return FOOD_DATABASE.find(f => {
      const n = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n === q || q.includes(n) || n.includes(q);
    });
  };

  /**
   * Sugestões inteligentes baseadas no delta de macros
   */
  const getSmartSuggestions = (delta: { protein: number; carbs: number; fat: number }) => {
    const suggestions: { label: string; action: () => void; icon: React.ReactNode }[] = [];
    const currentVisual = calculateVisualMacrosFromDescription(meal.description || "");
    
    // Helper para preparar sugestão com preview
    const prepareSuggestion = (name: string, portion: string, label: string) => {
      const newLine = `• ${name} — ${portion}`;
      const newDescription = rebuildDescription([...foodLines, newLine], substitutionLines);
      const afterMacros = calculateVisualMacrosFromDescription(newDescription);
      
      setPendingSuggestion({
        name,
        portion,
        before: currentVisual,
        after: afterMacros
      });
    };

    // Proteína Baixa
    if (delta.protein < -5) {
      suggestions.push({
        label: `+${Math.abs(Math.round(delta.protein * 4))}g de Frango`,
        icon: <Beef className="w-3 h-3 text-red-500" />,
        action: () => prepareSuggestion("Frango Grelhado", `${Math.abs(Math.round(delta.protein * 4))}g`, "Frango")
      });
      suggestions.push({
        label: "+1 Ovo Cozido",
        icon: <Beef className="w-3 h-3 text-red-500" />,
        action: () => prepareSuggestion("Ovo Cozido", "1 unidade", "Ovo")
      });
    }
    
    // Carboidrato Baixo
    if (delta.carbs < -10) {
      suggestions.push({
        label: `+${Math.abs(Math.round(delta.carbs * 5))}g de Arroz`,
        icon: <Wheat className="w-3 h-3 text-amber-500" />,
        action: () => prepareSuggestion("Arroz Branco", `${Math.abs(Math.round(delta.carbs * 5))}g`, "Arroz")
      });
    }

    return suggestions.slice(0, 3);
  };

  const confirmSuggestion = async () => {
    if (!pendingSuggestion || !canEdit || !meal.itemId) return;
    
    // Guard de UI (O Backend fará a validação final)
    const validation = isInvalidSuggestion(pendingSuggestion);
    if (validation.isInvalid) {
      toast.error(`Bloqueio Clínico: ${validation.reason}`);
      return;
    }

    const newLine = `• ${pendingSuggestion.name} — ${pendingSuggestion.portion}`;
    const newFoodLines = [...foodLines, newLine];
    const newDescription = rebuildDescription(newFoodLines, substitutionLines);
    
    if (onUpdateItem) {
      try {
        // O versionamento e auditoria agora ocorrem via Trigger no DB
        onUpdateItem(meal.itemId, { description: newDescription });
        
        // Verificação pós-persistência (Detecção de Falha Silenciosa)
        const { data: verifiedItem, error: fetchError } = await supabase
          .from("meal_plan_items")
          .select("description")
          .eq("id", meal.itemId)
          .single();
          
        if (fetchError || verifiedItem.description !== newDescription) {
          throw new Error("Divergência de persistência detectada.");
        }

        toast.success(`Aplicado: ${pendingSuggestion.name} (${pendingSuggestion.portion})`);
      } catch (err: any) {
        console.error("[CRITICAL] Falha na persistência:", err);
        toast.error("Erro crítico de persistência. Ação bloqueada.");
        // Log automático de erro de auditoria já disparado pela trigger ou manual aqui
      }
    }
    setPendingSuggestion(null);
  };

  const isInvalidSuggestion = (s: NonNullable<typeof pendingSuggestion>) => {
    const p = s.after.protein;
    const c = s.after.carbs;
    const f = s.after.fat;
    const kcal = s.after.calories;
    
    // 1. Macros nunca negativos
    if (p < 0 || c < 0 || f < 0) return { isInvalid: true, reason: "Macros não podem ser negativos" };
    
    // 2. Proteína não pode ultrapassar +50% da meta da refeição (Segurança Renal/Hormonal)
    const pTarget = meal.protein_target || 0;
    if (pTarget > 0 && p > pTarget * 1.5) {
      return { isInvalid: true, reason: `Excesso de proteína (+${Math.round((p/pTarget - 1)*100)}%). Limite de segurança: 50%.` };
    }
    
    // 3. Calorias dentro de ±20% da meta (Segurança Energética)
    const kTarget = meal.calories_target || 0;
    if (kTarget > 0) {
      const diff = Math.abs(kcal - kTarget) / kTarget;
      if (diff > 0.2) {
        return { isInvalid: true, reason: `Variação calórica excessiva (${Math.round(diff * 100)}%). Limite: 20%.` };
      }
    }
    
    // 4. Inconsistência Calórica (Atwater check)
    const calculatedKcal = (p * 4) + (c * 4) + (f * 9);
    if (Math.abs(calculatedKcal - kcal) > 100) {
      return { isInvalid: true, reason: "Inconsistência entre macros e calorias detectada." };
    }

    return { isInvalid: false, reason: "" };
  };

  /**
   * REGRA: O frontend NÃO recalcula macros para persistência.
   * Esta função é usada APENAS para VALIDAÇÃO VISUAL (Frontend Guard).
   */
  const calculateVisualMacrosFromDescription = (description: string) => {
    const { foodLines } = parseDescriptionLines(description);
    let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0;
    
    foodLines.forEach(line => {
      const content = line.startsWith("•") ? line.slice(1).trim() : line;
      const name = content.split("—")[0]?.trim() || content;
      const match = findFoodInDatabase(name);
      if (match) {
        const portionMatch = content.match(/—\s*(\d+)\s*g/i);
        const dbPortionMatch = match.portion.match(/(\d+)\s*g/i);
        
        let scale = 1;
        if (portionMatch && dbPortionMatch) {
          const grams = parseInt(portionMatch[1]);
          const dbGrams = parseInt(dbPortionMatch[1]);
          if (dbGrams > 0) scale = grams / dbGrams;
        }

        totalCal += match.calories * scale;
        totalProt += match.protein * scale;
        totalCarb += match.carbs * scale;
        totalFat += match.fat * scale;
      }
    });

    return {
      calories: Math.round(totalCal),
      protein: Math.round(totalProt),
      carbs: Math.round(totalCarb),
      fat: Math.round(totalFat),
    };
  };
  // Fetch visual library images when picker opens
  useEffect(() => {
    if (!showImagePicker) return;
    setLoadingImages(true);
    supabase
      .from("meal_visual_library" as any)
      .select("id, name, display_name, image_url")
      .eq("is_active", true)
      .not("image_url", "is", null)
      .order("name")
      .limit(200)
      .then(({ data }) => {
        if (data) {
          setLibraryImages((data as any[]).map(d => ({
            id: d.id,
            name: d.display_name || d.name,
            image_url: d.image_url,
          })));
        }
        setLoadingImages(false);
      });
  }, [showImagePicker]);

  useEffect(() => {
    if (meal) {
      setTitleValue(meal.title);
      setMacroValues({
        calories: String(meal.calories_target ?? ""),
        protein: String(meal.protein_target ?? ""),
        carbs: String(meal.carbs_target ?? ""),
        fat: String(meal.fat_target ?? ""),
      });
    }
  }, [meal]);

  if (!meal) return null;

  const meta = meal.metadata || {};
  const foods: FoodItem[] = parseJsonField<FoodItem>(meta.foods || meta.foods_structure);
  const substitutions: Substitution[] = parseJsonField<Substitution>(meta.substitutions);
  const instructions: string | undefined = meta.instructions || meta.preparation;
  const prepTime: number | undefined = meta.prep_time_minutes || meta.prep_time;
  const goalTag: string | undefined = meta.goal_tag;
  const clinicalTags: string[] = parseJsonField<string>(meta.clinical_tags || meta.clinical_tag);
  const source: string | undefined = meta.source;
  const mealTypeInfo = MEAL_TYPE_LABELS[meal.meal_type || ""] || null;
  const imageUrl = meal.image_url || meta.image_url;

  const calories = Number(meal.calories_target ?? meta.calories_target ?? meta.calories ?? 0);
  const protein = Number(meal.protein_target ?? meta.protein_target ?? meta.protein ?? 0);
  const carbs = Number(meal.carbs_target ?? meta.carbs_target ?? meta.carbs ?? 0);
  const fat = Number(meal.fat_target ?? meta.fat_target ?? meta.fat ?? 0);

  const hasMacros = calories > 0 || protein > 0 || carbs > 0 || fat > 0;

  const canEdit = !!meal.itemId && (!!onRemoveFoodLine || !!onUpdateItem);
  const { foodLines, substitutionLines } = parseDescriptionLines(meal.description);
  const hasDescriptionLines = foodLines.length > 0;

  const handleUpdateTitle = () => {
    if (!canEdit || !meal.itemId || !titleValue.trim() || titleValue === meal.title) {
      setEditingTitle(false);
      return;
    }
    if (onUpdateItem) {
      saveToHistory();
      onUpdateItem(meal.itemId, { title: titleValue.trim() });
    }
    setEditingTitle(false);
    toast.success("Nome da refeição atualizado");
  };

  const handleRemoveLine = (lineIdx: number) => {
    if (!canEdit || !meal.itemId) return;
    const newRemoved = new Set(removedLines);
    newRemoved.add(lineIdx);
    setRemovedLines(newRemoved);

    const remainingFoodLines = foodLines.filter((_, i) => !newRemoved.has(i));
    const newDescription = rebuildDescription(remainingFoodLines, substitutionLines);
    if (onUpdateItem) {
      // REGRA: O banco gerencia os macros via target_percentage. 
      // Não enviamos macroPatch no cliente para evitar inconsistências.
      onUpdateItem(meal.itemId, { description: newDescription });
    } else if (onRemoveFoodLine) {
      onRemoveFoodLine(meal.itemId, newDescription);
    }
  };

  const handleUpdateLine = (lineIdx: number) => {
    if (!canEdit || !meal.itemId || !lineNameValue.trim()) {
      setEditingLineIdx(null);
      return;
    }
    
    if (linePortionValue.trim() && !validatePortion(linePortionValue)) {
      setLinePortionError(PORTION_ERROR_MESSAGE);
      return;
    }


    const name = lineNameValue.trim();
    const portion = linePortionValue.trim();
    const newLine = `• ${name}${portion ? ` — ${portion}` : ""}`;
    
    const newFoodLines = foodLines.map((l, i) => i === lineIdx ? newLine : l);
    const newDescription = rebuildDescription(newFoodLines, substitutionLines);
    if (onUpdateItem) {
      // REGRA: O banco gerencia os macros via target_percentage.
      onUpdateItem(meal.itemId, { description: newDescription });
    } else if (onRemoveFoodLine) {
      onRemoveFoodLine(meal.itemId, newDescription);
    }
    setEditingLineIdx(null);
    toast.success("Alimento atualizado");
  };

  const handleAddManualFood = () => {
    if (!canEdit || !meal.itemId || !manualFoodName.trim()) return;
    
    if (manualFoodPortion.trim() && !validatePortion(manualFoodPortion)) {
      setManualPortionError(PORTION_ERROR_MESSAGE);
      return;
    }


    const name = manualFoodName.trim();
    const portion = manualFoodPortion.trim();
    const newLine = `• ${name}${portion ? ` — ${portion}` : ""}`;
    
    const newFoodLines = [...foodLines, newLine];
    const newDescription = rebuildDescription(newFoodLines, substitutionLines);
    if (onUpdateItem) {
      // REGRA: O banco gerencia os macros via target_percentage.
      onUpdateItem(meal.itemId, { description: newDescription });
    } else if (onRemoveFoodLine) {
      onRemoveFoodLine(meal.itemId, newDescription);
    }
    setManualFoodName("");
    setManualFoodPortion("");
    setShowManualFoodInput(false);
    toast.success("Alimento adicionado");
  };

  const handleRemoveSubLine = (lineIdx: number) => {
    if (!canEdit || !meal.itemId) return;
    const newSubs = substitutionLines.filter((_, i) => i !== lineIdx);
    const remainingFoodLines = foodLines.filter((_, i) => !removedLines.has(i));
    const newDescription = rebuildDescription(remainingFoodLines, newSubs);
    if (onUpdateItem) {
      onUpdateItem(meal.itemId, { description: newDescription });
    } else if (onRemoveFoodLine) {
      onRemoveFoodLine(meal.itemId, newDescription);
    }
  };

  const handleUpdateSubLine = (lineIdx: number) => {
    if (!canEdit || !meal.itemId || !subLineValue.trim()) {
      setEditingSubLineIdx(null);
      return;
    }
    const newLine = subLineValue.trim().startsWith("•") ? subLineValue.trim() : `• ${subLineValue.trim()}`;
    const newSubs = substitutionLines.map((l, i) => i === lineIdx ? newLine : l);
    const remainingFoodLines = foodLines.filter((_, i) => !removedLines.has(i));
    const newDescription = rebuildDescription(remainingFoodLines, newSubs);
    if (onUpdateItem) {
      onUpdateItem(meal.itemId, { description: newDescription });
    } else if (onRemoveFoodLine) {
      onRemoveFoodLine(meal.itemId, newDescription);
    }
    setEditingSubLineIdx(null);
    toast.success("Substituição atualizada");
  };

  const handleRegenerateSubstitutions = () => {
    if (!canEdit || !meal.itemId) return;
    const remainingFoodLines = foodLines.filter((_, i) => !removedLines.has(i));
    const newSubs = generateSubstitutionsFromFoodLines(remainingFoodLines, meal.meal_type || "");
    const newDescription = rebuildDescription(remainingFoodLines, newSubs);
    if (onUpdateItem) {
      onUpdateItem(meal.itemId, { description: newDescription });
    } else if (onRemoveFoodLine) {
      onRemoveFoodLine(meal.itemId, newDescription);
    }
    toast.success(`🔄 ${newSubs.length} substituições regeneradas com porções`);
  };

  const handleAddManualSub = () => {
    if (!canEdit || !meal.itemId || !manualSubInput.trim()) return;
    const newLine = manualSubInput.trim().startsWith("•") ? manualSubInput.trim() : `• ${manualSubInput.trim()}`;
    const newSubs = [...substitutionLines, newLine];
    const remainingFoodLines = foodLines.filter((_, i) => !removedLines.has(i));
    const newDescription = rebuildDescription(remainingFoodLines, newSubs);
    if (onUpdateItem) {
      onUpdateItem(meal.itemId, { description: newDescription });
    } else if (onRemoveFoodLine) {
      onRemoveFoodLine(meal.itemId, newDescription);
    }
    setManualSubInput("");
    setShowManualSubInput(false);
    toast.success("✅ Substituição adicionada manualmente");
  };

  const handleSaveMacros = () => {
    if (!canEdit || !meal.itemId || !onUpdateItem) return;
    const patch = {
      calories_target: macroValues.calories ? Number(macroValues.calories) : null,
      protein_target: macroValues.protein ? Number(macroValues.protein) : null,
      carbs_target: macroValues.carbs ? Number(macroValues.carbs) : null,
      fat_target: macroValues.fat ? Number(macroValues.fat) : null,
    };
    saveToHistory();
    onUpdateItem(meal.itemId, patch);
    setEditingMacros(false);
    toast.success("Macros atualizados manualmente");
  };

  const handleSelectImage = (newUrl: string) => {
    if (!meal.itemId || !onChangeImage) return;
    onChangeImage(meal.itemId, newUrl);
    setShowImagePicker(false);
    toast.success("📸 Imagem da refeição atualizada!");
  };

  const filteredImages = imageSearch.trim()
    ? libraryImages.filter(img =>
        img.name.toLowerCase().includes(imageSearch.toLowerCase())
      )
    : libraryImages;

  // Reset state when modal closes
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setRemovedLines(new Set());
      setShowImagePicker(false);
      setShowManualSubInput(false);
      setManualSubInput("");
      setImageSearch("");
      setEditingTitle(false);
      setEditingMacros(false);
      setEditingLineIdx(null);
      setLinePortionError(null);
      setEditingSubLineIdx(null);
      setShowManualFoodInput(false);
      setManualFoodName("");
      setManualFoodPortion("");
      setManualPortionError(null);

    }
    onOpenChange(v);
  };

  // Image picker sub-view
  if (showImagePicker) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden rounded-2xl border-border/50 shadow-2xl">
            {/* ... same content ... */}
            <div className="px-6 pt-6 pb-3 space-y-3">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Trocar Imagem da Refeição
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Selecione uma imagem do banco de alimentos
                </DialogDescription>
              </DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar alimento..."
                  value={imageSearch}
                  onChange={e => setImageSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 max-h-[calc(90vh-180px)]">
              {loadingImages ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Carregando...</div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma imagem encontrada</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredImages.map(img => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => handleSelectImage(img.image_url)}
                      className="group rounded-xl overflow-hidden border border-border hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all"
                    >
                      <div className="aspect-square relative">
                        <img src={img.image_url} alt={img.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Check className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <p className="text-[10px] font-medium px-1.5 py-1 truncate text-center">{img.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 pb-4">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowImagePicker(false)}>
                Voltar
              </Button>
            </div>
                  </DialogContent>
                </Dialog>

                {/* Modal de Histórico Clínico */}
                <Dialog open={showHistory} onOpenChange={setShowHistory}>
                  <DialogContent className="max-w-lg p-6 rounded-2xl border-border/50 shadow-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <ScrollText className="w-5 h-5 text-primary" />
                        Histórico Clínico de Versões
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        Rastreabilidade total de todas as alterações feitas nesta refeição.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 mt-4">
                      {dbHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10 text-sm italic">Nenhuma versão anterior registrada.</p>
                      ) : (
                        dbHistory.map((v, i) => (
                          <div key={v.id} className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3 group hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {new Date(v.created_at).toLocaleString("pt-BR")}
                                </p>
                                <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">
                                  {v.action_type === 'manual_update' ? 'Edição Manual' : 
                                   v.action_type === 'auto_correction' ? 'Auto-Correção' : 'Restauração'}
                                </Badge>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] gap-1.5 bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => rollbackToVersion(v)}
                              >
                                <RefreshCw className="w-3 h-3" />
                                Restaurar
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { l: 'Kcal', v: v.snapshot_data.calories_target },
                                { l: 'Prot', v: v.snapshot_data.protein_target },
                                { l: 'Carb', v: v.snapshot_data.carbs_target },
                                { l: 'Fat', v: v.snapshot_data.fat_target },
                              ].map(m => (
                                <div key={m.l} className="text-center bg-white/50 rounded-lg py-1 border border-border/30">
                                  <p className="text-[8px] uppercase text-muted-foreground font-bold">{m.l}</p>
                                  <p className="text-xs font-bold">{Math.round(m.v || 0)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <Button variant="outline" className="w-full mt-4" onClick={() => setShowHistory(false)}>
                      Fechar
                    </Button>
                  </DialogContent>
                </Dialog>

        <datalist id={PORTION_DATALIST_ID}>
          {getPortionAutocompleteOptions(
            editingLineIdx !== null ? linePortionValue : manualFoodPortion,
          ).map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </>
    );

  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>

      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden rounded-2xl border-border/50 shadow-2xl backdrop-blur-sm fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        {/* Hero Photo */}
        {imageUrl && (
          <div className="relative w-full h-48 overflow-hidden">
            <img
              src={imageUrl}
              alt={meal.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            {/* Change image button */}
            {canEdit && onChangeImage && (
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium transition-colors border border-white/20"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Trocar Imagem
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/10">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white drop-shadow-lg">{meal.title}</h3>
                  {mealTypeInfo && (
                    <p className="text-xs text-white/70 drop-shadow">{mealTypeInfo.emoji} {mealTypeInfo.label}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header (without photo) */}
        {!imageUrl && (
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
            <DialogHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 group/title">
                      {editingTitle ? (
                        <div className="flex gap-1 items-center flex-1">
                          <Input
                            autoFocus
                            value={titleValue}
                            onChange={e => setTitleValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleUpdateTitle();
                              if (e.key === "Escape") setEditingTitle(false);
                            }}
                            className="h-8 text-lg font-bold py-0"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleUpdateTitle}>
                            <Check className="w-4 h-4 text-primary" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <DialogTitle className="text-lg font-bold leading-tight">{meal.title}</DialogTitle>
                          {canEdit && (
                            <button
                              onClick={() => { setEditingTitle(true); setTitleValue(meal.title); }}
                              className="p-1 rounded hover:bg-primary/10 sm:opacity-0 group-hover/title:opacity-100 transition-opacity"
                            >
                              <Pencil className="w-3.5 h-3.5 text-primary" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <DialogDescription className="text-xs mt-0.5">
                      {mealTypeInfo
                        ? `${mealTypeInfo.emoji} ${mealTypeInfo.label}`
                        : meal.description
                          ? meal.description
                          : "Detalhes da refeição"}
                    </DialogDescription>
                  </div>
                </div>
                {canEdit && onChangeImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 text-[10px] h-7"
                    onClick={() => setShowImagePicker(true)}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Trocar Imagem
                  </Button>
                )}
              </div>
            </DialogHeader>
          </div>
        )}

        {/* Tags row */}
        {(goalTag || clinicalTags.length > 0 || prepTime || source === "library") && (
          <div className="flex flex-wrap gap-1.5 px-6 pt-3">
            {goalTag && GOAL_LABELS[goalTag] && (
              <Badge variant="outline" className={`text-[10px] ${GOAL_LABELS[goalTag].color}`}>
                <Target className="w-2.5 h-2.5 mr-1" />
                {GOAL_LABELS[goalTag].label}
              </Badge>
            )}
            {clinicalTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] bg-accent/50 border-accent">
                <Leaf className="w-2.5 h-2.5 mr-1" />
                {CLINICAL_LABELS[tag] || tag.replace(/_/g, " ")}
              </Badge>
            ))}
            {prepTime && (
              <Badge variant="outline" className="text-[10px]">
                <Clock className="w-2.5 h-2.5 mr-1" /> {prepTime} min
              </Badge>
            )}
            {source === "library" && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary">
                Banco FitJourney
              </Badge>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8 space-y-6 max-h-[calc(90vh-160px)]">
          {/* Macros */}
          {(hasMacros || editingMacros) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-base">Metas da Refeição</h4>
                  {(() => {
                    const visual = calculateVisualMacrosFromDescription(meal.description || "");
                    const isAnyInconsistent = 
                      getMacroStatusLabel(visual.protein, protein) !== "OK" ||
                      getMacroStatusLabel(visual.carbs, carbs) !== "OK" ||
                      getMacroStatusLabel(visual.fat, fat) !== "OK";
                    
                    return isAnyInconsistent && (
                      <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Divergência detectada
                      </Badge>
                    );
                  })()}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary"
                    onClick={() => setEditingMacros(!editingMacros)}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                    {editingMacros ? "Cancelar" : "Ajustar"}
                  </Button>
                )}
              </div>
              
              {editingMacros ? (
                <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  {[
                    { key: "calories", label: "Kcal", icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
                    { key: "protein", label: "Prot (g)", icon: <Beef className="w-3.5 h-3.5 text-red-500" /> },
                    { key: "carbs", label: "Carb (g)", icon: <Wheat className="w-3.5 h-3.5 text-amber-500" /> },
                    { key: "fat", label: "Gord (g)", icon: <Droplets className="w-3.5 h-3.5 text-yellow-500" /> },
                  ].map(m => (
                    <div key={m.key} className="space-y-1">
                      <label className="text-[9px] font-medium text-muted-foreground flex items-center gap-1">
                        {m.icon} {m.label}
                      </label>
                      <Input
                        type="number"
                        value={macroValues[m.key as keyof typeof macroValues]}
                        onChange={e => setMacroValues(prev => ({ ...prev, [m.key]: e.target.value }))}
                        className="h-8 text-xs p-1 px-2"
                      />
                    </div>
                  ))}
                  <div className="col-span-4 mt-2">
                    <Button size="sm" className="w-full h-8" onClick={handleSaveMacros}>
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Salvar Macros
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Calorias", value: calories, unit: "", icon: <Flame className="w-5 h-5 text-orange-500" />, requested: calculateVisualMacrosFromDescription(meal.description || "").calories },
                    { label: "Proteína", value: protein, unit: "g", icon: <Beef className="w-5 h-5 text-red-500" />, requested: calculateVisualMacrosFromDescription(meal.description || "").protein },
                    { label: "Carbs", value: carbs, unit: "g", icon: <Wheat className="w-5 h-5 text-amber-500" />, requested: calculateVisualMacrosFromDescription(meal.description || "").carbs },
                    { label: "Gordura", value: fat, unit: "g", icon: <Droplets className="w-5 h-5 text-yellow-500" />, requested: calculateVisualMacrosFromDescription(meal.description || "").fat },
                  ].map(m => {
                    const status = getMacroStatusLabel(m.requested, Number(m.value));
                    const color = getMacroStatusColor(m.requested, Number(m.value));
                    const diff = Math.round(Number(m.value) - m.requested);
                    
                    return (
                      <div key={m.label} className="relative rounded-xl bg-secondary/60 p-3 text-center border border-transparent hover:border-border transition-all group/macro">
                        <div className="flex justify-center mb-1.5">{m.icon}</div>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        <p className="font-bold text-base">{m.value != null ? `${fmtMacro(m.value)}${m.unit}` : "—"}</p>
                        
                        {status !== "OK" && (
                          <div className="mt-1 flex flex-col items-center gap-0.5 animate-in fade-in slide-in-from-top-1">
                            <span className={`text-[9px] font-bold ${color}`}>
                              {diff > 0 ? `+${diff}` : diff}{m.unit}
                            </span>
                            <span className="text-[8px] text-muted-foreground/70 leading-none">
                              Sugestão: {m.requested}{m.unit}
                            </span>
            </div>
          )}

          {/* Assistente de Sugestões Rápidas */}
          {(() => {
            const visual = calculateVisualMacrosFromDescription(meal.description || "");
            const delta = {
              protein: protein - visual.protein,
              carbs: carbs - visual.carbs,
              fat: fat - visual.fat
            };
            const suggestions = getSmartSuggestions(delta);
            
            return (
              <>
                {suggestions.length > 0 && (
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">Ações Corretivas Sugeridas</span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary gap-1"
                          onClick={() => { setShowHistory(true); fetchDbHistory(); }}
                        >
                          <ScrollText className="w-3 h-3" />
                          Histórico ({dbHistory.length})
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s, idx) => (
                        <Button 
                          key={idx} 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-[10px] gap-1.5 bg-white hover:bg-primary/5 hover:text-primary transition-all border-primary/20"
                          onClick={s.action}
                        >
                          {s.icon}
                          {s.label}
                          <Plus className="w-3 h-3 ml-0.5" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Dialog open={!!pendingSuggestion} onOpenChange={() => setPendingSuggestion(null)}>
                  <DialogContent className="max-w-md p-6 rounded-2xl border-border/50 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Confirmar Ajuste Sugerido
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        Você deseja adicionar <strong>{pendingSuggestion?.name} ({pendingSuggestion?.portion})</strong> a esta refeição?
                      </DialogDescription>
                    </DialogHeader>

                    {pendingSuggestion && (
                      <div className="py-4 space-y-4">
                        <div className="grid grid-cols-3 gap-3 p-3 bg-secondary/30 rounded-xl border border-border/50">
                          {[
                            { label: "Proteína", before: pendingSuggestion.before.protein, after: pendingSuggestion.after.protein, unit: "g" },
                            { label: "Carbs", before: pendingSuggestion.before.carbs, after: pendingSuggestion.after.carbs, unit: "g" },
                            { label: "Fat", before: pendingSuggestion.before.fat, after: pendingSuggestion.after.fat, unit: "g" },
                          ].map(m => {
                            const diff = m.after - m.before;
                            return (
                              <div key={m.label} className="text-center space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{m.label}</p>
                                <div className="flex flex-col">
                                  <span className="text-xs line-through text-muted-foreground/60">{m.before}{m.unit}</span>
                                  <span className="text-sm font-bold">{m.after}{m.unit}</span>
                                  {diff !== 0 && (
                                    <span className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {diff > 0 ? '+' : ''}{diff}{m.unit}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {pendingSuggestion && isInvalidSuggestion(pendingSuggestion).isInvalid && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 mb-2">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span className="text-[11px] font-bold text-rose-500 uppercase tracking-tight">
                            BLOQUEIO: {isInvalidSuggestion(pendingSuggestion).reason}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex gap-2 w-full">
                        <Button variant="outline" className="flex-1" onClick={() => setPendingSuggestion(null)}>
                          Cancelar
                        </Button>
                        <Button 
                          className="flex-1" 
                          onClick={confirmSuggestion}
                          disabled={pendingSuggestion ? isInvalidSuggestion(pendingSuggestion).isInvalid : false}
                        >
                          Confirmar Alteração
                        </Button>
                      </div>
                    </div>

                  </DialogContent>
                </Dialog>

                {/* Modal de Histórico Clínico */}
                <Dialog open={showHistory} onOpenChange={setShowHistory}>
                  <DialogContent className="max-w-lg p-6 rounded-2xl border-border/50 shadow-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <ScrollText className="w-5 h-5 text-primary" />
                        Histórico Clínico de Versões
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        Rastreabilidade total e auditoria de alterações.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 mt-4 custom-scrollbar">
                      {dbHistory.length === 0 && !loadingHistory ? (
                        <p className="text-center text-muted-foreground py-10 text-sm italic">Nenhuma versão anterior registrada.</p>
                      ) : (
                        <>
                          {dbHistory.map((v, i) => (
                            <div key={v.id} className="p-4 rounded-xl border border-border bg-secondary/10 space-y-3 group hover:border-primary/30 transition-all">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      {new Date(v.created_at).toLocaleString("pt-BR")}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="outline" className={`text-[9px] border-primary/20 ${
                                      v.action_type === 'restore_version' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/5 text-primary'
                                    }`}>
                                      {v.action_type === 'manual_update' ? 'Edição Manual' : 
                                       v.action_type === 'auto_correction' ? 'Auto-Correção' : 'Restauração'}
                                    </Badge>
                                    {v.restored_from_version_id && (
                                      <Badge variant="outline" className="text-[9px] bg-secondary text-muted-foreground">
                                        ID Origem: {v.restored_from_version_id.slice(0, 8)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-[10px] gap-1.5 bg-white shadow-sm hover:bg-primary hover:text-white transition-all"
                                  onClick={() => rollbackToVersion(v)}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Restaurar
                                </Button>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { l: 'Kcal', v: v.snapshot_data.calories_target },
                                  { l: 'Prot', v: v.snapshot_data.protein_target },
                                  { l: 'Carb', v: v.snapshot_data.carbs_target },
                                  { l: 'Fat', v: v.snapshot_data.fat_target },
                                ].map(m => {
                                  const currentVal = m.l === 'Kcal' ? calories : 
                                                   m.l === 'Prot' ? protein : 
                                                   m.l === 'Carb' ? carbs : fat;
                                  const diffValue = currentVal - (m.v || 0);
                                  
                                  return (
                                    <div key={m.l} className="text-center bg-white/50 rounded-lg py-1 border border-border/30 relative">
                                      <p className="text-[8px] uppercase text-muted-foreground font-bold">{m.l}</p>
                                      <p className="text-xs font-bold">{Math.round(m.v || 0)}</p>
                                      {Math.abs(diffValue) > 0.5 && (
                                        <div className={`text-[8px] font-bold ${diffValue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                          {diffValue > 0 ? '↓' : '↑'} {Math.abs(Math.round(diffValue))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {hasMoreHistory && (
                            <Button 
                              variant="ghost" 
                              className="w-full text-xs text-muted-foreground hover:text-primary"
                              onClick={() => fetchDbHistory(dbHistory.length)}
                              disabled={loadingHistory}
                            >
                              {loadingHistory ? "Carregando..." : "Carregar mais versões"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    <Button variant="outline" className="w-full mt-4" onClick={() => setShowHistory(false)}>
                      Fechar
                    </Button>
                  </DialogContent>
                </Dialog>
              </>
            );
          })()}

                        {/* Tooltip de assistência */}
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] p-2 rounded-lg shadow-xl border border-border opacity-0 group-hover/macro:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          {status === "OK" ? "✓ Macros em conformidade" : `Assistente: Diferença de ${Math.abs(diff)}${m.unit}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Description as editable food lines */}
          {hasDescriptionLines && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ChefHat className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-base">Composição</h4>
                {canEdit && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto h-7 px-2 gap-1.5 text-xs text-primary"
                    onClick={() => setShowManualFoodInput(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Alimento
                  </Button>
                )}
              </div>
              
              {showManualFoodInput && (
                <div className="flex flex-col gap-2 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Alimento</label>
                      <Input
                        autoFocus
                        placeholder="Ex: Frango Grelhado"
                        value={manualFoodName}
                        onChange={e => setManualFoodName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Porção</label>
                      <Input
                        placeholder={PORTION_PLACEHOLDER}
                        value={manualFoodPortion}
                        list={PORTION_DATALIST_ID}
                        className={`h-9 text-sm ${manualPortionError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        onChange={e => {
                          const val = e.target.value;
                          setManualFoodPortion(val);
                          if (validatePortion(val)) setManualPortionError(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleAddManualFood();
                          if (e.key === "Escape") setShowManualFoodInput(false);
                        }}
                      />
                      {manualPortionError && (
                        <p className="text-[10px] text-destructive font-medium px-1 animate-in fade-in slide-in-from-top-1">
                          {manualPortionError}
                        </p>
                      )}
                    </div>

                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8" onClick={() => { saveToHistory(); handleAddManualFood(); }} disabled={!manualFoodName.trim()}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowManualFoodInput(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {(meal.title.toLowerCase().includes("marmita") || (meal.metadata as any)?.is_fixed) && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-xl border border-primary/10 shadow-sm">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-primary block text-[10px] uppercase tracking-wider">Marmita Fixa Sugerida</span>
                    <span className="text-muted-foreground">Você escolheu / Hoje: <span className="font-bold text-foreground text-sm">{meal.title}</span></span>
                  </div>
                </div>
              )}

              <ul className="space-y-1.5">
                {foodLines.map((line, idx) => {
                  if (removedLines.has(idx)) return null;
                  const isBullet = line.startsWith("•");
                  const displayText = isBullet ? line.slice(1).trim() : line;

                  if (editingLineIdx === idx) {
                    return (
                      <li key={idx} className="flex flex-col gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Alimento</label>
                            <Input
                              autoFocus
                              value={lineNameValue}
                              onChange={e => setLineNameValue(e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Porção</label>
                            <Input
                              value={linePortionValue}
                              list={PORTION_DATALIST_ID}
                              placeholder={PORTION_PLACEHOLDER}
                              className={`h-9 text-sm ${linePortionError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              onChange={e => {
                                const val = e.target.value;
                                setLinePortionValue(val);
                                if (validatePortion(val)) setLinePortionError(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleUpdateLine(idx);
                                if (e.key === "Escape") setEditingLineIdx(null);
                              }}
                            />
                            {linePortionError && (
                              <p className="text-[10px] text-destructive font-medium px-1 mt-1 animate-in fade-in slide-in-from-top-1">
                                {linePortionError}
                              </p>
                            )}
                          </div>

                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 h-8" onClick={() => { saveToHistory(); handleUpdateLine(idx); }}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Salvar Alterações
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingLineIdx(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </li>
                    );
                  }

                  // Extract portion if present (e.g., "Frango — 150g")
                  const portionMatch = displayText.match(/—\s*(.+)$/);
                  const foodName = portionMatch ? displayText.replace(/—\s*.+$/, "").trim() : displayText;
                  const portion = portionMatch ? portionMatch[1].trim() : null;

                  return (
                    <li key={idx} className="flex items-center gap-2 text-sm bg-secondary/30 rounded-lg px-3 py-2 group/line hover:bg-secondary/50 transition-colors">
                      <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                      <span className="flex-1 font-medium text-[13px]">{foodName}</span>
                      {portion && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold bg-secondary rounded px-2 py-0.5">
                          <Ruler className="w-3 h-3 text-primary/60" />
                          {portion}
                        </span>
                      )}
                      {canEdit && (
                        <div className="flex items-center gap-0.5 sm:opacity-0 group-hover/line:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                                  saveToHistory();
                                  setEditingLineIdx(idx);
                              setLineNameValue(foodName);
                              setLinePortionValue(portion || "");
                              setLinePortionError(null);

                            }}
                            className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                            title="Editar Alimento"
                          >
                            <Pencil className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveToHistory();
                              handleRemoveLine(idx);
                            }}
                            className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                            title="Remover"
                          >
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Non-parsed description fallback (when no bullet lines) */}
          {!hasDescriptionLines && meal.description && (
            <p className="text-sm text-muted-foreground">{meal.description}</p>
          )}

          {/* Structured Ingredients from metadata */}
          {foods.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ChefHat className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-base">Ingredientes</h4>
              </div>
              <ul className="space-y-2.5">
                {foods.map((food, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm bg-secondary/30 rounded-lg px-3 py-2.5">
                    <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                    <span className="flex-1 font-medium">{food.name}</span>
                    <span className="text-xs text-muted-foreground font-semibold bg-secondary rounded px-2 py-0.5">{food.portion}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Instructions */}
          {instructions && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ScrollText className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-base">Modo de Preparo</h4>
                </div>
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{instructions}</p>
                </div>
              </section>
            </>
          )}

          {/* Regenerate substitutions button (when no subs exist yet) */}
          {substitutionLines.length === 0 && canEdit && hasDescriptionLines && (
            <>
              <Separator />
              <section className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleRegenerateSubstitutions(); }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar Substituições Equivalentes
                </Button>
                {showManualSubInput ? (
                  <div className="flex gap-1.5">
                    <Input
                      autoFocus
                      value={manualSubInput}
                      onChange={e => setManualSubInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleAddManualSub();
                        if (e.key === "Escape") { setShowManualSubInput(false); setManualSubInput(""); }
                      }}
                      placeholder="Ex: Frango → Peixe (150g), Carne (150g)"
                      className="h-8 text-[11px]"
                    />
                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleAddManualSub} disabled={!manualSubInput.trim()}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowManualSubInput(true)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary py-1.5 px-3 rounded-lg border border-dashed border-border hover:border-primary transition-colors w-full justify-center"
                  >
                    <Pencil className="w-3 h-3" />
                    Ou escrever manualmente
                  </button>
                )}
              </section>
            </>
          )}

          {/* Substitutions from description */}
          {substitutionLines.length > 0 && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shuffle className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-base">Substituições</h4>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto gap-1.5 text-[10px] h-6 px-2"
                      onClick={(e) => { e.stopPropagation(); saveToHistory(); handleRegenerateSubstitutions(); }}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerar
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {substitutionLines.map((line, idx) => {
                    const isBullet = line.startsWith("•");
                    const content = isBullet ? line.slice(1).trim() : line;

                    if (editingSubLineIdx === idx) {
                      return (
                        <div key={idx} className="flex gap-1.5 items-center">
                          <Input
                            autoFocus
                            value={subLineValue}
                            onChange={e => setSubLineValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleUpdateSubLine(idx);
                              if (e.key === "Escape") setEditingSubLineIdx(null);
                            }}
                            className="h-9 text-xs flex-1"
                          />
                          <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => { saveToHistory(); handleUpdateSubLine(idx); }}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setEditingSubLineIdx(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    }

                    // Parse "Food → Alt1 (100g), Alt2 (80g)"
                    const arrowParts = content.split("→");
                    const originalFood = arrowParts[0]?.trim() || content;
                    const alternatives = arrowParts[1]?.trim() || "";

                    return (
                      <div key={idx} className="rounded-lg bg-secondary/40 p-3 group/subline hover:bg-secondary/60 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Trocar <span className="text-foreground font-semibold">{originalFood}</span> por:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {alternatives.split(",").map((alt, ai) => {
                                const trimmedAlt = alt.trim();
                                if (!trimmedAlt) return null;
                                // Check if alt has portion info (e.g., "arroz (150g)")
                                const portionMatch = trimmedAlt.match(/\(([^)]+)\)/);
                                return (
                                  <Badge key={ai} variant="secondary" className="text-xs gap-1">
                                    {portionMatch
                                      ? trimmedAlt.replace(/\([^)]+\)/, "").trim()
                                      : trimmedAlt}
                                    {portionMatch && (
                                      <span className="text-[10px] text-primary font-bold ml-0.5">
                                        📏 {portionMatch[1]}
                                      </span>
                                    )}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/subline:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSubLineIdx(idx);
                                  setSubLineValue(content);
                                }}
                                className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5 text-primary" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveToHistory();
                                  handleRemoveSubLine(idx);
                                }}
                                className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                                title="Remover"
                              >
                                <X className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Manual substitution input */}
                {canEdit && (
                  <div className="mt-3">
                    {showManualSubInput ? (
                      <div className="flex gap-1.5">
                        <Input
                          autoFocus
                          value={manualSubInput}
                          onChange={e => setManualSubInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleAddManualSub();
                            if (e.key === "Escape") { setShowManualSubInput(false); setManualSubInput(""); }
                          }}
                          placeholder="Ex: Frango → Peixe (150g), Carne (150g)"
                          className="h-8 text-[11px]"
                        />
                        <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => { saveToHistory(); handleAddManualSub(); }} disabled={!manualSubInput.trim()}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowManualSubInput(true)}
                        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary py-1.5 px-3 rounded-lg border border-dashed border-border hover:border-primary transition-colors w-full justify-center"
                      >
                        <Pencil className="w-3 h-3" />
                        Adicionar substituição manualmente
                      </button>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Substitutions from metadata (legacy) */}
          {substitutions.length > 0 && substitutionLines.length === 0 && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shuffle className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-base">Substituições</h4>
                </div>
                <div className="space-y-2.5">
                  {substitutions.map((sub, idx) => (
                    <div key={idx} className="rounded-lg bg-secondary/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Trocar <span className="text-foreground font-semibold">{sub.replace}</span> por:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.options.map((opt, oi) => (
                          <Badge key={oi} variant="secondary" className="text-xs">{opt}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Empty state */}
          {foods.length === 0 && !instructions && substitutions.length === 0 && !hasMacros && !imageUrl && !hasDescriptionLines && (
            <div className="text-center py-10 text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Detalhes serão adicionados pelo seu nutricionista.</p>
              <p className="text-xs mt-1">Macros, ingredientes e instruções aparecerão aqui.</p>
            </div>
          )}
        </div>
        <DialogClose />
      </DialogContent>
    </Dialog>

    <datalist id={PORTION_DATALIST_ID}>
      {getPortionAutocompleteOptions(
        editingLineIdx !== null ? linePortionValue : manualFoodPortion,
      ).map((opt) => (
        <option key={opt} value={opt} />
      ))}
    </datalist>
  </>
);
}

