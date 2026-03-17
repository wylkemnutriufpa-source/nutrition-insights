import React, { createContext, useContext, useState, useCallback } from "react";
import { MealDetailModal, type MealDetailData } from "@/components/patient/MealDetailModal";

interface MealDetailContextType {
  openMealDetail: (meal: MealDetailData) => void;
}

const MealDetailContext = createContext<MealDetailContextType | null>(null);

export function useMealDetail() {
  const ctx = useContext(MealDetailContext);
  if (!ctx) {
    // Fallback: no-op when used outside provider (safe for editor preview etc.)
    return { openMealDetail: () => {} };
  }
  return ctx;
}

/**
 * Wrap any part of the tree with this provider to enable
 * `useMealDetail().openMealDetail(data)` from any meal card.
 */
export function MealDetailProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<MealDetailData | null>(null);

  const openMealDetail = useCallback((meal: MealDetailData) => {
    setSelected(meal);
  }, []);

  return (
    <MealDetailContext.Provider value={{ openMealDetail }}>
      {children}
      <MealDetailModal
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        meal={selected}
      />
    </MealDetailContext.Provider>
  );
}
