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

const GENERIC_TITLES = new Set([
  "almoco", "jantar", "cafe da manha", "lanche",
  "lanche da manha", "lanche da tarde", "ceia",
  "refeicao", "marmita",
]);

const CARB_IGNORE = new Set([
  "arroz", "batata", "macarrao", "feijao", "pure", "mandioca",
  "inhame", "legumes", "salada", "brocolis", "macaxeira",
  "farinha", "farofa",
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Remove measurement phrases that contain food-like words (e.g. "col. sopa" = tablespoon)
    .replace(/col\.?\s*de?\s*sopa/gi, "")
    .replace(/colher(es)?\s*de?\s*sopa/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function isWholeWordSubstring(text: string, phrase: string): boolean {
  const idx = text.indexOf(phrase);
  if (idx === -1) return false;
  const before = idx === 0 || text[idx - 1] === ' ';
  const after = (idx + phrase.length) >= text.length || text[idx + phrase.length] === ' ';
  return before && after;
}

export function useMealVisualMatch(title: string | null | undefined, description?: string | null) {
  const [match, setMatch] = useState<MealVisualItem | null>(null);

  useEffect(() => {
    if (!title) { setMatch(null); return; }

    const normalized = normalizeText(title);

    if (GENERIC_TITLES.has(normalized) && !description) {
      setMatch(null);
      return;
    }

    const findMatchAsync = async () => {
      // Load all aliases
      const { data: allAliases } = await supabase
        .from("meal_visual_aliases" as any)
        .select("library_item_id, normalized_alias");

      if (!allAliases) { setMatch(null); return; }

      const aliasMap = new Map<string, string>();
      for (const row of allAliases as unknown as MealVisualAlias[]) {
        if (!aliasMap.has(row.normalized_alias)) {
          aliasMap.set(row.normalized_alias, row.library_item_id);
        }
      }

      // Determine search text
      let searchText = normalized;
      if (GENERIC_TITLES.has(normalized) && description) {
        // Extract food from description
        const lines = description.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
          if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;
          const normLine = normalizeText(trimmed);
          // Try longest alias match in this line
          const lineMatch = findBestAlias(normLine, aliasMap);
          if (lineMatch) {
            const { data: item } = await supabase
              .from("meal_visual_library" as any)
              .select("*")
              .eq("id", lineMatch)
              .eq("is_active", true)
              .single();
            if (item) { setMatch(item as unknown as MealVisualItem); return; }
          }
        }
        setMatch(null);
        return;
      }

      // Priority 1: exact alias match
      if (aliasMap.has(searchText)) {
        const itemId = aliasMap.get(searchText)!;
        const { data: item } = await supabase
          .from("meal_visual_library" as any)
          .select("*")
          .eq("id", itemId)
          .eq("is_active", true)
          .single();
        if (item) { setMatch(item as unknown as MealVisualItem); return; }
      }

      // Priority 2: longest alias sub-phrase match
      const bestMatch = findBestAlias(searchText, aliasMap);
      if (bestMatch) {
        const { data: item } = await supabase
          .from("meal_visual_library" as any)
          .select("*")
          .eq("id", bestMatch)
          .eq("is_active", true)
          .single();
        if (item) { setMatch(item as unknown as MealVisualItem); return; }
      }

      // Priority 3: single keyword
      const words = searchText.split(/\s+/);
      for (const word of words) {
        if (CARB_IGNORE.has(word) || word.length < 3) continue;
        if (aliasMap.has(word)) {
          const { data: item } = await supabase
            .from("meal_visual_library" as any)
            .select("*")
            .eq("id", aliasMap.get(word)!)
            .eq("is_active", true)
            .single();
          if (item) { setMatch(item as unknown as MealVisualItem); return; }
        }
      }

      setMatch(null);
    };

    findMatchAsync();
  }, [title, description]);

  return match;
}

/**
 * Find the longest alias that appears as whole-word substring in text
 */
function findBestAlias(text: string, aliasMap: Map<string, string>): string | null {
  let bestId: string | null = null;
  let bestLen = 0;

  for (const [alias, itemId] of aliasMap) {
    if (alias.length < 3) continue;
    if (text === alias) return itemId;
    if (alias.length > bestLen && isWholeWordSubstring(text, alias)) {
      bestId = itemId;
      bestLen = alias.length;
    }
  }

  return bestId;
}
