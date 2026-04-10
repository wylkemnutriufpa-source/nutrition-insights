import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import {
  GripVertical,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Check,
  X,
  CalendarRange,
  RefreshCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { MealPlanItem } from "@/stores/mealPlanEditorV2Store";

interface Props {
  item: MealPlanItem;
  qty: number;
  editingId: string | null;
  editGrams: string;
  setEditingId: (id: string | null) => void;
  setEditGrams: (value: string) => void;
  onApplyGramsChange: (item: MealPlanItem) => void;
  onApplyGramsChangeAllDays: (item: MealPlanItem) => void;
  onToggleLock: (item: MealPlanItem) => void;
  onDuplicate: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onReplace: (item: MealPlanItem) => void;
}

export default function MealSlotItemCard({
  item,
  qty,
  editingId,
  editGrams,
  setEditingId,
  setEditGrams,
  onApplyGramsChange,
  onApplyGramsChangeAllDays,
  onToggleLock,
  onDuplicate,
  onDelete,
  onReplace,
}: Props) {
  const isSub = item.description?.startsWith("[Substituição]");
  const isEditing = editingId === item.id;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `meal-item-${item.id}`,
    disabled: isEditing,
    data: {
      type: "existing-item",
      itemId: item.id,
      itemTitle: item.title,
    },
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: isDragging ? 0.45 : 1, y: 0 }}
      className={`group flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
        item.is_locked
          ? "bg-warning/5 border border-warning/20"
          : isSub
            ? "bg-accent/30 border border-accent/20"
            : "bg-muted/30 hover:bg-muted/60"
      }`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab rounded-sm text-muted-foreground/40 hover:text-foreground active:cursor-grabbing"
        title="Arrastar para outra refeição"
        style={{ touchAction: "none" }}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {item.image_url && (
        <img src={item.image_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {isSub && <span className="text-[9px] bg-accent text-accent-foreground px-1 rounded">Sub</span>}
          <p className="font-medium truncate">{item.title}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={editGrams}
                onChange={(e) => setEditGrams(e.target.value)}
                className="h-5 w-16 text-[10px] px-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") onApplyGramsChange(item);
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <button onClick={() => onApplyGramsChange(item)} className="text-primary hover:text-primary/80" title="Aplicar só hoje">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => onApplyGramsChangeAllDays(item)} className="text-primary hover:text-primary/80" title="Aplicar em todos os dias">
                <CalendarRange className="w-3 h-3" />
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

      {/* Action buttons - always visible */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => onReplace(item)} className="p-1 rounded hover:bg-primary/10" title="Trocar por outro alimento">
          <RefreshCcw className="w-3 h-3 text-primary" />
        </button>
        <button onClick={() => onToggleLock(item)} className="p-1 rounded hover:bg-muted" title={item.is_locked ? "Desbloquear" : "Travar"}>
          {item.is_locked ? <Lock className="w-3 h-3 text-warning" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
        </button>
        <button onClick={() => onDuplicate(item.id)} className="p-1 rounded hover:bg-muted" title="Duplicar">
          <Copy className="w-3 h-3 text-muted-foreground" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1 rounded hover:bg-destructive/10" title="Remover">
          <Trash2 className="w-3 h-3 text-destructive" />
        </button>
      </div>
    </motion.div>
  );
}
