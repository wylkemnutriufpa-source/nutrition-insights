import React, { createContext, useContext, useState, useCallback } from "react";
import { MealDetailModal, type MealDetailData } from "@/components/patient/MealDetailModal";

interface MealDetailContextType {
  openMealDetail: (meal: MealDetailData) => void;
  /** Register a callback for when food lines are removed in review */
  setOnRemoveFoodLine: (fn: ((itemId: string, newDesc: string) => void) | null) => void;
  /** Register a callback for when image is changed */
  setOnChangeImage: (fn: ((itemId: string, newImageUrl: string) => void) | null) => void;
}

const MealDetailContext = createContext<MealDetailContextType | null>(null);

export function useMealDetail() {
  const ctx = useContext(MealDetailContext);
  if (!ctx) {
    return { openMealDetail: () => {}, setOnRemoveFoodLine: () => {}, setOnChangeImage: () => {} };
  }
  return ctx;
}

export function MealDetailProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<MealDetailData | null>(null);
  const [removeFn, setRemoveFn] = useState<((itemId: string, newDesc: string) => void) | null>(null);
  const [changeImageFn, setChangeImageFn] = useState<((itemId: string, newImageUrl: string) => void) | null>(null);

  const openMealDetail = useCallback((meal: MealDetailData) => {
    setSelected(meal);
  }, []);

  const setOnRemoveFoodLine = useCallback((fn: ((itemId: string, newDesc: string) => void) | null) => {
    setRemoveFn(() => fn);
  }, []);

  const setOnChangeImage = useCallback((fn: ((itemId: string, newImageUrl: string) => void) | null) => {
    setChangeImageFn(() => fn);
  }, []);

  return (
    <MealDetailContext.Provider value={{ openMealDetail, setOnRemoveFoodLine, setOnChangeImage }}>
      {children}
      <MealDetailModal
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        meal={selected}
        onRemoveFoodLine={removeFn || undefined}
        onChangeImage={changeImageFn || undefined}
      />
    </MealDetailContext.Provider>
  );
}
