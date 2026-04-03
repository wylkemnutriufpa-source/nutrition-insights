import { useState } from "react";
import { motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Copy, Lock, Unlock, GripVertical,
  Flame, Beef, Wheat, Droplets, Check, X, Sparkles, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { composeMealForTarget, type ComposerMode, type MacroTarget } from "@/lib/mealComposer";
import type { PatientContext } from "@/lib/mealComposer";

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

export default function MealSlotCard({ day, mealType, label, icon, items, patientContext, mealMacroTarget, composerMode = "quick" }: Props) {
  const store = useMealPlanEditorV2Store();
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${day}-${mealType}` });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState("");
  const [composing, setComposing] = useState(false);

  const totalKcal = items.reduce((s, i) => s + (i.calories_target || 0), 0);
  const totalProt = items.reduce((s, i) => s + (i.protein_target || 0), 0);

  const handleDelete = (itemId: string) => {
    store.deleteItem(itemId);
    toast.success("Item removido");
  };

  const handleDuplicate = (itemId: string) => {
    store.duplicateItem(itemId);
    toast.success("Item duplicado");
  };

  // Parse quantity from description (e.g., "Frango grelhado 120g")
  const parseQuantity = (item: MealPlanItem): number => {
    const match = item.description?.match(/(\d+)\s*g/i);
    return match ? parseInt(match[1]) : 100;
  };

  const handleGramsChange = (item: MealPlanItem) => {
    const newGrams = parseFloat(editGrams);
    if (isNaN(newGrams) || newGrams <= 0) {
      setEditingId(null);
      return;
    }
    const oldGrams = parseQuantity(item);
    const ratio = newGrams / oldGrams;

    store.updateItem(item.id, {
      calories_target: Math.round((item.calories_target || 0) * ratio),
      protein_target: Math.round(((item.protein_target || 0) * ratio) * 10) / 10,
      carbs_target: Math.round(((item.carbs_target || 0) * ratio) * 10) / 10,
      fat_target: Math.round(((item.fat_target || 0) * ratio) * 10) / 10,
      description: item.description?.replace(/\d+\s*g/i, `${newGrams}g`) || `${newGrams}g`,
    });
    setEditingId(null);
    toast.success("Gramagem atualizada — macros recalculados");
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

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition-all min-h-[100px] ${
        isOver
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-card/50 hover:border-border/80"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Flame className="w-3 h-3" /> {Math.round(totalKcal)} kcal
          <Beef className="w-3 h-3 ml-1" /> {Math.round(totalProt)}g
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
          <Plus className="w-3.5 h-3.5 mr-1" /> Arraste uma refeição aqui
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const qty = parseQuantity(item);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                  item.is_locked ? "bg-warning/5 border border-warning/20" : "bg-muted/30 hover:bg-muted/60"
                }`}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0 cursor-grab" />

                {item.image_url && (
                  <img src={item.image_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editGrams}
                          onChange={(e) => setEditGrams(e.target.value)}
                          className="h-5 w-16 text-[10px] px-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleGramsChange(item);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button onClick={() => handleGramsChange(item)} className="text-primary hover:text-primary/80">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(item.id); setEditGrams(String(qty)); }}
                        className="hover:text-foreground underline-offset-2 hover:underline"
                      >
                        {qty}g
                      </button>
                    )}
                    <span>•</span>
                    <Flame className="w-2.5 h-2.5" /> {Math.round(item.calories_target || 0)}
                    <Beef className="w-2.5 h-2.5" /> {Math.round(item.protein_target || 0)}
                    <Wheat className="w-2.5 h-2.5" /> {Math.round(item.carbs_target || 0)}
                    <Droplets className="w-2.5 h-2.5" /> {Math.round(item.fat_target || 0)}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => handleToggleLock(item)} className="p-1 rounded hover:bg-muted" title={item.is_locked ? "Desbloquear" : "Travar"}>
                    {item.is_locked ? <Lock className="w-3 h-3 text-warning" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleDuplicate(item.id)} className="p-1 rounded hover:bg-muted" title="Duplicar">
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-destructive/10" title="Remover">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
