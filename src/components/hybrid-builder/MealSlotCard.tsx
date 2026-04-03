import { useState } from "react";
import { motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { useMealPlanEditorV2Store, type MealType, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Copy, Lock, Unlock, GripVertical,
  Flame, Beef, Wheat, Droplets, Pencil, Check, X,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  day: number;
  mealType: MealType;
  label: string;
  icon: React.ReactNode;
  items: MealPlanItem[];
}

export default function MealSlotCard({ day, mealType, label, icon, items }: Props) {
  const store = useMealPlanEditorV2Store();
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${day}-${mealType}` });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState("");

  const totalKcal = items.reduce((s, i) => s + (i.calories || 0), 0);
  const totalProt = items.reduce((s, i) => s + (i.protein || 0), 0);

  const handleDelete = (itemId: string) => {
    store.deleteItem(itemId);
    toast.success("Item removido");
  };

  const handleDuplicate = (itemId: string) => {
    store.duplicateItem(itemId);
    toast.success("Item duplicado");
  };

  const handleGramsChange = (item: MealPlanItem) => {
    const newGrams = parseFloat(editGrams);
    if (isNaN(newGrams) || newGrams <= 0) {
      setEditingId(null);
      return;
    }
    const oldGrams = item.quantity || 100;
    const ratio = newGrams / oldGrams;

    store.updateItem(item.id, {
      quantity: newGrams,
      calories: Math.round((item.calories || 0) * ratio),
      protein: Math.round(((item.protein || 0) * ratio) * 10) / 10,
      carbs: Math.round(((item.carbs || 0) * ratio) * 10) / 10,
      fat: Math.round(((item.fat || 0) * ratio) * 10) / 10,
    });
    setEditingId(null);
    toast.success("Gramagem atualizada — macros recalculados");
  };

  const handleToggleLock = (item: MealPlanItem) => {
    store.updateItem(item.id, { is_locked: !item.is_locked } as any);
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
      {/* Slot header */}
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

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
          <Plus className="w-3.5 h-3.5 mr-1" /> Arraste uma refeição aqui
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                (item as any).is_locked ? "bg-amber-500/5 border border-amber-500/20" : "bg-muted/30 hover:bg-muted/60"
              }`}
            >
              <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0 cursor-grab" />

              {/* Visual */}
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
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
                      <button onClick={() => handleGramsChange(item)} className="text-emerald-500 hover:text-emerald-600">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(item.id); setEditGrams(String(item.quantity || 100)); }}
                      className="hover:text-foreground underline-offset-2 hover:underline"
                    >
                      {item.quantity || "—"}g
                    </button>
                  )}
                  <span>•</span>
                  <Flame className="w-2.5 h-2.5" /> {Math.round(item.calories || 0)}
                  <Beef className="w-2.5 h-2.5" /> {Math.round(item.protein || 0)}
                  <Wheat className="w-2.5 h-2.5" /> {Math.round(item.carbs || 0)}
                  <Droplets className="w-2.5 h-2.5" /> {Math.round(item.fat || 0)}
                </div>
              </div>

              {/* Actions (visible on hover) */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => handleToggleLock(item)} className="p-1 rounded hover:bg-muted" title={(item as any).is_locked ? "Desbloquear" : "Travar"}>
                  {(item as any).is_locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
                </button>
                <button onClick={() => handleDuplicate(item.id)} className="p-1 rounded hover:bg-muted" title="Duplicar">
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-destructive/10" title="Remover">
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
