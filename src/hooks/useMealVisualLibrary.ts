import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MealVisualItem, MealVisualAlias } from "@/types/mealVisualLibrary";

export function useMealVisualLibrary(options?: { category?: string; search?: string }) {
  const [items, setItems] = useState<MealVisualItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("meal_visual_library" as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (options?.category) {
      query = query.eq("category", options.category);
    }

    const { data } = await query;
    let result = (data || []) as unknown as MealVisualItem[];

    if (options?.search) {
      const s = options.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.display_name.toLowerCase().includes(s) ||
          item.name.toLowerCase().includes(s) ||
          (item.short_description || "").toLowerCase().includes(s) ||
          item.tags.some((t) => t.toLowerCase().includes(s))
      );
    }

    setItems(result);
    setLoading(false);
  }, [options?.category, options?.search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, refetch: fetchItems };
}

export function useMealVisualMatch(title: string | null | undefined) {
  const [match, setMatch] = useState<MealVisualItem | null>(null);

  useEffect(() => {
    if (!title) { setMatch(null); return; }

    const normalized = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

    const findMatch = async () => {
      // Try alias match first
      const { data: aliasData } = await supabase
        .from("meal_visual_aliases" as any)
        .select("library_item_id")
        .eq("normalized_alias", normalized)
        .limit(1);

      if (aliasData && aliasData.length > 0) {
        const { data: item } = await supabase
          .from("meal_visual_library" as any)
          .select("*")
          .eq("id", (aliasData[0] as any).library_item_id)
          .single();
        if (item) { setMatch(item as unknown as MealVisualItem); return; }
      }

      // Try partial name match
      const { data: nameData } = await supabase
        .from("meal_visual_library" as any)
        .select("*")
        .eq("is_active", true)
        .ilike("name", `%${normalized.split(" ").slice(0, 3).join("%")}%`)
        .limit(1);

      if (nameData && nameData.length > 0) {
        setMatch(nameData[0] as unknown as MealVisualItem);
      } else {
        setMatch(null);
      }
    };

    findMatch();
  }, [title]);

  return match;
}
