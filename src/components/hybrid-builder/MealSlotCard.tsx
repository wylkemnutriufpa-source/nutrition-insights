import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import {
  Plus,
  Flame,
  Beef,
  Sparkles,
  Loader2,
  Clipboard,
  ClipboardPaste,
  Scissors,
  RefreshCcw,
  Search,
  CalendarRange,
  Save,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { composeMealForTarget, type ComposerMode, type MacroTarget } from "@/lib/mealComposer";
import type { PatientContext } from "@/lib/mealComposer";
import SmartMealSelectorModal from "./SmartMealSelectorModal";
import MealSlotItemCard from "./MealSlotItemCard";
import FoodSearchInline from "./FoodSearchInline";
import SaveMealSlotDialog from "./SaveMealSlotDialog";
import { smartSubstituteFood } from "@/lib/smartFoodSubstitution";

interface Props {
  day: number;
  mealType: MealType;
  label: string;
  icon: React.ReactNode;
  items: MealPlanItem[];
  patientContext?: PatientContext | null;
  mealMacroTarget?: MacroTarget | null;
  composerMode?: ComposerMode;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

let clipboard: { items: MealPlanItem[]; cut: boolean; sourceDay: number; sourceMeal: MealType } | null = null;

export default function MealSlotCard({ day, mealType, label, icon, items, patientContext, mealMacroTarget, composerMode = "quick" }: Props) {
  const store = useMealPlanEditorV2Store();
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${day}-${mealType}` });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState("");
  const [composing, setComposing] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [foodSearchOpen, setFoodSearchOpen] = useState(false);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false);

  const totalKcal = items.reduce((s, i) => s + (i.calories_target || 0), 0);
  const totalProt = items.reduce((s, i) => s + (i.protein_target || 0), 0);
  const hasItems = items.length > 0;

  const handleDelete = (itemId: string) => {
    store.deleteItem(itemId);
    toast.success("Item removido");
  };

  const handleDuplicate = (itemId: string) => {
    store.duplicateItem(itemId);
    toast.success("Item duplicado");
  };

  const handleReplace = async (item: MealPlanItem) => {
    const grams = parseQuantity(item);
    const tId = toast.loading(`🔄 Buscando equivalente para ${item.title}...`);
    try {
      const result = await smartSubstituteFood({
        currentTitle: item.title || "",
        currentDescription: item.description,
        currentGrams: grams,
        mealType,
        excludeNames: [item.title || ""],
      });
      if (!result) {
        toast.dismiss(tId);
        // Fallback: open manual search
        setReplacingItemId(item.id);
        setFoodSearchOpen(true);
        toast.info("Sem equivalente automático. Buscando manualmente...");
        return;
      }
      store.updateItem(item.id, {
        title: result.newName,
        description: result.newDescription,
        calories_target: result.calories_target,
        protein_target: result.protein_target,
        carbs_target: result.carbs_target,
        fat_target: result.fat_target,
      });
      toast.success(`✅ ${item.title} → ${result.newName} (${grams}g)`, { id: tId });
    } catch (e) {
      toast.dismiss(tId);
      toast.error("Erro ao trocar alimento");
    }
  };

  const handleManualReplace = (item: MealPlanItem) => {
    setReplacingItemId(item.id);
    setFoodSearchOpen(true);
  };

  const parseQuantity = (item: MealPlanItem): number => {
    const match = item.description?.match(/(\d+)\s*g/i);
    return match ? parseInt(match[1]) : 100;
  };

  const applyGramsUpdate = (item: MealPlanItem, newGrams: number) => {
    const oldGrams = parseQuantity(item);
    const ratio = newGrams / oldGrams;
    return {
      calories_target: Math.round((item.calories_target || 0) * ratio),
      protein_target: Math.round(((item.protein_target || 0) * ratio) * 10) / 10,
      carbs_target: Math.round(((item.carbs_target || 0) * ratio) * 10) / 10,
      fat_target: Math.round(((item.fat_target || 0) * ratio) * 10) / 10,
      description: item.description?.replace(/\d+\s*g/i, `${newGrams}g`) || `${newGrams}g`,
    };
  };

  const handleGramsChange = (item: MealPlanItem) => {
    const newGrams = parseFloat(editGrams);
    if (isNaN(newGrams) || newGrams <= 0) {
      setEditingId(null);
      return;
    }
    store.updateItem(item.id, applyGramsUpdate(item, newGrams));
    setEditingId(null);
    toast.success("Gramagem atualizada — macros recalculados");
  };

  const handleGramsChangeAllDays = (item: MealPlanItem) => {
    const newGrams = parseFloat(editGrams);
    if (isNaN(newGrams) || newGrams <= 0) {
      setEditingId(null);
      return;
    }
    // Update current item
    store.updateItem(item.id, applyGramsUpdate(item, newGrams));
    
    // Find matching items on other days (same title + meal_type)
    const allItems = store.items;
    const matchingItems = allItems.filter(
      (i) => i.id !== item.id && i.title === item.title && i.meal_type === item.meal_type
    );
    matchingItems.forEach((match) => {
      store.updateItem(match.id, applyGramsUpdate(match, newGrams));
    });

    setEditingId(null);
    toast.success(`Gramagem atualizada em todos os dias (${matchingItems.length + 1} itens)`);
  };

  const handleCompose = async () => {
    if (!patientContext || !mealMacroTarget) {
      toast.error("Contexto do paciente não disponível");
      return;
    }
    setComposing(true);
    try {
      const meal = await composeMealForTarget(mealType as any, mealMacroTarget, patientContext, composerMode);
      if (meal.items.length === 0) {
        toast.error("Não foi possível compor a refeição");
        return;
      }
      const planId = store.plan?.id;
      if (!planId) return;

      for (const ci of meal.items) {
        store.addItem({
          meal_plan_id: planId,
          title: ci.food_name,
          description: `${ci.food_name} ${ci.grams}g`,
          day_of_week: day,
          meal_type: mealType,
          calories_target: ci.calories,
          protein_target: ci.protein,
          carbs_target: ci.carbs,
          fat_target: ci.fat,
          item_origin: "composer_auto",
        });
      }
      toast.success(`Refeição composta: ${meal.items.length} itens • ${Math.round(meal.totalCalories)} kcal`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao compor refeição");
    } finally {
      setComposing(false);
    }
  };

  const handleToggleLock = (item: MealPlanItem) => {
    store.updateItem(item.id, { is_locked: !item.is_locked });
    toast.info(item.is_locked ? "Item desbloqueado" : "Item travado");
  };

  const handleCopySlot = () => {
    clipboard = { items: [...items], cut: false, sourceDay: day, sourceMeal: mealType };
    toast.success("Refeição copiada");
  };

  const handleCutSlot = () => {
    clipboard = { items: [...items], cut: true, sourceDay: day, sourceMeal: mealType };
    toast.success("Refeição recortada");
  };

  const handlePasteSlot = () => {
    if (!clipboard || clipboard.items.length === 0) {
      toast.error("Nada na área de transferência");
      return;
    }
    const planId = store.plan?.id;
    if (!planId) return;

    store.deleteItemsInCell(day, mealType);

    clipboard.items.forEach((item) => {
      store.addItem({
        meal_plan_id: planId,
        title: item.title,
        description: item.description,
        day_of_week: day,
        meal_type: mealType,
        calories_target: item.calories_target,
        protein_target: item.protein_target,
        carbs_target: item.carbs_target,
        fat_target: item.fat_target,
        item_origin: (item as any).item_origin || "manual",
      });
    });

    if (clipboard.cut) {
      store.deleteItemsInCell(clipboard.sourceDay, clipboard.sourceMeal);
      clipboard = null;
    }

    toast.success("Refeição colada");
  };

  const handleApplyToAllDays = () => {
    if (items.length === 0) return;
    const planId = store.plan?.id;
    if (!planId) return;

    const otherDays = ALL_DAYS.filter((d) => d !== day);
    
    // Clear same meal type on other days, then copy items
    otherDays.forEach((targetDay) => {
      store.deleteItemsInCell(targetDay, mealType);
      items.forEach((item) => {
        store.addItem({
          meal_plan_id: planId,
          title: item.title,
          description: item.description,
          day_of_week: targetDay,
          meal_type: mealType,
          calories_target: item.calories_target,
          protein_target: item.protein_target,
          carbs_target: item.carbs_target,
          fat_target: item.fat_target,
          item_origin: (item as any).item_origin || "manual",
        });
      });
    });

    toast.success(`${label} aplicado em todos os dias da semana`);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={`rounded-xl border p-3 transition-all min-h-[100px] ${
          isOver
            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
            : "border-border bg-card/50 hover:border-border/80"
        }`}
      >
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <span className="text-xs font-semibold truncate">{label}</span>
            {hasItems && (
              <button
                onClick={() => setSelectorOpen(true)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted transition-colors"
                title="Substituir refeição por uma pronta"
              >
                <RefreshCcw className="w-3 h-3" /> Substituir
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasItems && (
              <>
                <button onClick={() => setSaveTemplateOpen(true)} className="p-1 rounded hover:bg-muted" title="Salvar refeição como template">
                  <Save className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={handleApplyToAllDays} className="p-1 rounded hover:bg-primary/10" title="Aplicar em todos os dias">
                  <CalendarRange className="w-3 h-3 text-primary" />
                </button>
                <button onClick={handleCopySlot} className="p-1 rounded hover:bg-muted" title="Copiar refeição">
                  <Clipboard className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={handleCutSlot} className="p-1 rounded hover:bg-muted" title="Recortar refeição">
                  <Scissors className="w-3 h-3 text-muted-foreground" />
                </button>
              </>
            )}
            <button onClick={() => setLoadTemplateOpen(true)} className="p-1 rounded hover:bg-muted" title="Usar refeição salva">
              <FolderOpen className="w-3 h-3 text-muted-foreground" />
            </button>
            {clipboard && clipboard.items.length > 0 && (
              <button onClick={handlePasteSlot} className="p-1 rounded hover:bg-muted" title="Colar refeição">
                <ClipboardPaste className="w-3 h-3 text-primary" />
              </button>
            )}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-1">
              <Flame className="w-3 h-3" /> {Math.round(totalKcal)} kcal
              <Beef className="w-3 h-3 ml-1" /> {Math.round(totalProt)}g
            </div>
          </div>
        </div>

        {!hasItems ? (
          <div
            className="flex flex-col items-center justify-center py-4 gap-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
            onClick={() => setSelectorOpen(true)}
          >
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Selecionar refeição
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {patientContext && mealMacroTarget && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCompose(); }}
                  disabled={composing}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {composing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Compor IA
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setLoadTemplateOpen(true); }}
                className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <FolderOpen className="w-3 h-3" /> Template salvo
              </button>
              {clipboard && clipboard.items.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handlePasteSlot(); }}
                  className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ClipboardPaste className="w-3 h-3" /> Colar
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <MealSlotItemCard
                key={item.id}
                item={item}
                qty={parseQuantity(item)}
                editingId={editingId}
                editGrams={editGrams}
                setEditingId={setEditingId}
                setEditGrams={setEditGrams}
                onApplyGramsChange={handleGramsChange}
                onApplyGramsChangeAllDays={handleGramsChangeAllDays}
                onToggleLock={handleToggleLock}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onReplace={handleReplace}
              />
            ))}
            {foodSearchOpen && (
              <FoodSearchInline
                day={day}
                mealType={mealType}
                replacingItemId={replacingItemId}
                onClose={() => { setFoodSearchOpen(false); setReplacingItemId(null); }}
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setFoodSearchOpen(!foodSearchOpen)}
                className="flex-1 py-1.5 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
              >
                <Search className="w-3 h-3" /> Buscar alimento
              </button>
              <button
                onClick={() => setSelectorOpen(true)}
                className="flex-1 py-1.5 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCcw className="w-3 h-3" /> Substituir refeição
              </button>
              <button
                onClick={() => setSelectorOpen(true)}
                className="flex-1 py-1.5 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Banco de refeições
              </button>
            </div>
          </div>
        )}
      </div>

      <SmartMealSelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        day={day}
        mealType={mealType}
        mealLabel={label}
      />

      {/* Save meal as template */}
      <SaveMealSlotDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        mode="save"
        day={day}
        mealType={mealType}
        items={items}
      />

      {/* Load saved meal template */}
      <SaveMealSlotDialog
        open={loadTemplateOpen}
        onOpenChange={setLoadTemplateOpen}
        mode="load"
        day={day}
        mealType={mealType}
        items={items}
      />
    </>
  );
}
