import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame, Beef, PencilLine, CopyPlus, X, Loader2, Check, Eye, Camera, SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { MacroEditDialog } from "./MacroEditDialog";
import { useMealPlanEditorV2Store, type MealPlanItem } from "@/stores/mealPlanEditorV2Store";
import { getCategoryDot } from "@/components/meals/FoodSubstitutions";
import { useMealDetail } from "@/components/patient/MealDetailContext";
import { MealPhotoUpload } from "./MealPhotoUpload";
import { useMealVisualItem } from "@/hooks/useMealVisualItem";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { fmtMacro, getPortionWarning } from "@/lib/formatMacros";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MealItemCardProps {
  item: MealPlanItem;
  isSyncing: boolean;
}

export function MealItemCard({ item, isSyncing }: MealItemCardProps) {
  const { updateItem, deleteItem, duplicateItem } = useMealPlanEditorV2Store();
  const { openMealDetail, setOnRemoveFoodLine, setOnChangeImage, setOnUpdateItem } = useMealDetail();
  const [inlineEdit, setInlineEdit] = useState(false);
  const [editValue, setEditValue] = useState(item.title);
  const [macroEditOpen, setMacroEditOpen] = useState(false);

  useEffect(() => {
    setOnRemoveFoodLine((itemId: string, newDescription: string) => {
      updateItem(itemId, { description: newDescription });
    });
    return () => setOnRemoveFoodLine(null);
  }, [setOnRemoveFoodLine, updateItem]);

  useEffect(() => {
    setOnChangeImage((itemId: string, newImageUrl: string) => {
      updateItem(itemId, { image_url: newImageUrl });
    });
    return () => setOnChangeImage(null);
  }, [setOnChangeImage, updateItem]);

  useEffect(() => {
    setOnUpdateItem((itemId: string, patch: any) => {
      updateItem(itemId, patch);
    });
    return () => setOnUpdateItem(null);
  }, [setOnUpdateItem, updateItem]);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== item.title) {
      updateItem(item.id, { title: trimmed });
    }
    setInlineEdit(false);
  }, [editValue, item.id, item.title, updateItem]);

  const catDot = getCategoryDot(item.title);
  const imageUrl = (item as any).image_url as string | null | undefined;
  const visualLibraryItemId = (item as any).visual_library_item_id as string | null | undefined;

  const needsVisualFallback = !imageUrl && !!visualLibraryItemId;
  const { item: visualItem } = useMealVisualItem(needsVisualFallback ? visualLibraryItemId : null);
  const fallbackImage = visualItem?.image_url || visualItem?.image_path || null;
  const { url: signedFallback } = useSignedStorageUrl(fallbackImage, {
    bucket: "meal-images",
    enabled: !!fallbackImage,
  });

  const resolvedImage = imageUrl || signedFallback || null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-secondary/60 rounded-md hover:bg-secondary transition-colors group/item relative cursor-pointer overflow-hidden"
      onClick={() => {
        if (!inlineEdit) {
          openMealDetail({
            title: item.title,
            description: item.description,
            meal_type: item.meal_type,
            calories_target: item.calories_target,
            protein_target: item.protein_target,
            carbs_target: item.carbs_target,
            fat_target: item.fat_target,
            metadata: (item as any).edit_metadata ?? (item as any).metadata,
            image_url: resolvedImage,
            itemId: item.id,
          });
        }
      }}
    >
      {resolvedImage ? (
        <div className="relative w-full aspect-[16/9] overflow-hidden shrink-0 bg-muted/30">
          <img
            src={resolvedImage}
            alt={item.title}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {visualItem && !imageUrl && (
            <div className="absolute bottom-0.5 left-0.5">
              <span className="text-[7px] px-1 py-0.5 rounded bg-primary/60 text-primary-foreground backdrop-blur-sm">
                📸 Biblioteca
              </span>
            </div>
          )}
          {imageUrl && (
            <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateItem(item.id, { image_url: null } as any);
                }}
                className="p-0.5 rounded bg-black/50 hover:bg-destructive/80"
                title="Remover foto"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
          <MealPhotoUpload
            compact
            onUploaded={(url) => updateItem(item.id, { image_url: url } as any)}
            onRemoved={() => {}}
          />
        </div>
      )}

      <div className="px-2 py-1.5">
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
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-4 break-words overflow-hidden whitespace-pre-line">
                {item.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground">
              {item.calories_target != null && (
                <span className="flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-orange-400" />{fmtMacro(item.calories_target)}
                </span>
              )}
              {item.protein_target != null && (
                <span className="flex items-center gap-0.5">
                  <Beef className="w-2.5 h-2.5 text-red-400" />{fmtMacro(item.protein_target)}g
                </span>
              )}
              {getPortionWarning(item) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px] max-w-[200px] p-2 bg-amber-50 text-amber-900 border-amber-200">
                      <p className="font-semibold mb-0.5">Alerta de Cálculo</p>
                      <p>{getPortionWarning(item)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {isSyncing && (
              <span className="inline-flex items-center gap-1 mt-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                sincronizando...
              </span>
            )}
            <div className="absolute top-1 right-1 z-10 flex gap-0.5 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMacroEditOpen(true); }}
                className="p-0.5 rounded hover:bg-accent/50"
                title="Editar macros"
              >
                <SlidersHorizontal className="w-2.5 h-2.5 text-muted-foreground" />
              </button>
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
      </div>
      <MacroEditDialog
        open={macroEditOpen}
        onOpenChange={setMacroEditOpen}
        item={item}
      />
    </motion.div>
  );
}
