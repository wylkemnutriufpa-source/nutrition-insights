import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MealVisualItem } from "@/types/mealVisualLibrary";

/**
 * Hook that resolves a visual library item by ID, with in-memory cache.
 */
const cache = new Map<string, MealVisualItem>();

export function useMealVisualItem(visualLibraryItemId: string | null | undefined) {
  const [item, setItem] = useState<MealVisualItem | null>(
    visualLibraryItemId ? cache.get(visualLibraryItemId) || null : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visualLibraryItemId) { setItem(null); return; }

    if (cache.has(visualLibraryItemId)) {
      setItem(cache.get(visualLibraryItemId)!);
      return;
    }

    setLoading(true);
    supabase
      .from("meal_visual_library" as any)
      .select("*")
      .eq("id", visualLibraryItemId)
      .single()
      .then(({ data }) => {
        if (data) {
          const typed = data as unknown as MealVisualItem;
          cache.set(visualLibraryItemId, typed);
          setItem(typed);
        }
        setLoading(false);
      });
  }, [visualLibraryItemId]);

  return { item, loading };
}
