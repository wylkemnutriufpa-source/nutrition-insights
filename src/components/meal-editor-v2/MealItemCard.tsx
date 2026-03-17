import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Flame, Beef, PencilLine, CopyPlus, X, Loader2, Check, Eye,
} from "lucide-react";
import { useMealPlanEditorV2Store, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { getCategoryDot } from "@/components/meals/FoodSubstitutions";
import { useMealDetail } from "@/components/patient/MealDetailContext";

interface MealItemCardProps {
  item: MealPlanItem;
  isSyncing: boolean;
}

export function MealItemCard({ item, isSyncing }: MealItemCardProps) {
  const { updateItem, deleteItem, duplicateItem } = useMealPlanEditorV2Store();
  const [inlineEdit, setInlineEdit] = useState(false);
  const [editValue, setEditValue] = useState(item.title);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== item.title) {
      updateItem(item.id, { title: trimmed });
    }
    setInlineEdit(false);
  }, [editValue, item.id, item.title, updateItem]);

  const catDot = getCategoryDot(item.title);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-secondary/60 rounded-md px-2 py-1.5 hover:bg-secondary transition-colors group/item relative"
    >
      {inlineEdit ? (
        <div className="flex gap-1">
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setInlineEdit(false);
            }}
            onBlur={commitEdit}
            className="w-full text-[11px] bg-transparent border-b border-primary outline-none"
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1">
            {catDot && <span className={`w-1.5 h-1.5 rounded-full ${catDot} shrink-0`} />}
            <p className="text-[11px] font-medium leading-tight truncate flex-1">{item.title}</p>
          </div>
          {item.description && (
            <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground">
            {item.calories_target != null && (
              <span className="flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 text-orange-400" />{item.calories_target}
              </span>
            )}
            {item.protein_target != null && (
              <span className="flex items-center gap-0.5">
                <Beef className="w-2.5 h-2.5 text-red-400" />{Number(item.protein_target).toFixed(0)}g
              </span>
            )}
          </div>
          {isSyncing && (
            <span className="inline-flex items-center gap-1 mt-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
              sincronizando...
            </span>
          )}
          {/* Action buttons */}
          <div className="absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setInlineEdit(true); setEditValue(item.title); }}
              className="p-0.5 rounded hover:bg-accent/50"
              title="Editar"
            >
              <PencilLine className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); duplicateItem(item.id); }}
              className="p-0.5 rounded hover:bg-accent/50"
              title="Duplicar"
            >
              <CopyPlus className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
              className="p-0.5 rounded hover:bg-destructive/10"
              title="Remover"
            >
              <X className="w-3 h-3 text-destructive" />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
