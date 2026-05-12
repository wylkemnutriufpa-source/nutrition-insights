import React, { createContext, useContext, useState, useCallback } from "react";
import { MealDetailModal, type MealDetailData } from "@/components/patient/MealDetailModal";
import type { MealPlanItem } from "@/stores/mealPlanEditorV2Store";

interface MealDetailContextType {
  openMealDetail: (meal: MealDetailData) => void;
  setOnRemoveFoodLine: (fn: ((itemId: string, newDesc: string) => void) | null) => void;
  setOnChangeImage: (fn: ((itemId: string, newImageUrl: string) => void) | null) => void;
  setOnUpdateItem: (fn: ((itemId: string, patch: Partial<MealPlanItem>) => void) | null) => void;
}

const MealDetailContext = createContext<MealDetailContextType | null>(null);

export function useMealDetail() {
  const ctx = useContext(MealDetailContext);
  if (!ctx) {
    return { 
      openMealDetail: () => {}, 
      setOnRemoveFoodLine: () => {}, 
      setOnChangeImage: () => {},
      setOnUpdateItem: () => {},
    };
  }
  return ctx;
}

export function MealDetailProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<MealDetailData | null>(null);
  const [removeFn, setRemoveFn] = useState<((itemId: string, newDesc: string) => void) | null>(null);
  const [changeImageFn, setChangeImageFn] = useState<((itemId: string, newImageUrl: string) => void) | null>(null);
  const [updateItemFn, setUpdateItemFn] = useState<((itemId: string, patch: Partial<MealPlanItem>) => void) | null>(null);

  const handleUpdateItem = useCallback((itemId: string, patch: Partial<MealPlanItem>) => {
    if (updateItemFn) updateItemFn(itemId, patch);
    // Update local state to reflect changes in modal
    setSelected(prev => {
      if (!prev || prev.itemId !== itemId) return prev;
      return { ...prev, ...patch };
    });
  }, [updateItemFn]);

  const openMealDetail = useCallback((meal: MealDetailData) => {
    setSelected(meal);
  }, []);

  const setOnRemoveFoodLine = useCallback((fn: ((itemId: string, newDesc: string) => void) | null) => {
    setRemoveFn(() => fn);
  }, []);

  const setOnChangeImage = useCallback((fn: ((itemId: string, newImageUrl: string) => void) | null) => {
    setChangeImageFn(() => fn);
  }, []);

  const setOnUpdateItem = useCallback((fn: ((itemId: string, patch: Partial<MealPlanItem>) => void) | null) => {
    setUpdateItemFn(() => fn);
  }, []);

  return (
    <MealDetailContext.Provider value={{ openMealDetail, setOnRemoveFoodLine, setOnChangeImage, setOnUpdateItem }}>
      {children}
      <MealDetailModal
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        meal={selected}
        onRemoveFoodLine={removeFn || undefined}
        onChangeImage={changeImageFn || undefined}
        onUpdateItem={handleUpdateItem}
      />
    </MealDetailContext.Provider>
  );
}
