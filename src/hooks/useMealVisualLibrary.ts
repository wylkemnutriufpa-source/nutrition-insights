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

/** Protein keywords mapped to their base slug */
const PROTEIN_MAP: Record<string, string> = {
  frango: "frango", peito: "frango", sobrecoxa: "frango",
  carne: "carne", bife: "carne", alcatra: "carne", patinho: "carne", acem: "carne", maminha: "carne",
  picanha: "picanha", costelinha: "costelinha",
  porco: "porco", suino: "porco", lombo: "porco",
  peixe: "peixe", tilapia: "peixe", salmao: "peixe", pescada: "peixe", merluza: "peixe",
  camarao: "camarao", ovo: "ovo", ovos: "ovo", omelete: "ovo",
};

const CARB_IGNORE = new Set([
  "arroz", "batata", "macarrao", "feijao", "pure", "mandioca",
  "inhame", "legumes", "salada", "brocolis", "macaxeira",
]);

const GENERIC_TITLES = new Set([
  "almoco", "jantar", "cafe da manha", "lanche",
  "lanche da manha", "lanche da tarde", "ceia",
]);

export function useMealVisualMatch(title: string | null | undefined, description?: string | null) {
  const [match, setMatch] = useState<MealVisualItem | null>(null);

  useEffect(() => {
    if (!title) { setMatch(null); return; }

    const normalized = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

    const isGenericTitle = GENERIC_TITLES.has(normalized);

    /**
     * Extract the first protein from description text.
     * Only parses food lines (starting with • or -), stops before substitution section.
     */
    const extractProteinFromDescription = (desc: string): string | null => {
      const lines = desc.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
        if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;

        const normLine = trimmed
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s]/g, "")
          .trim();

        if (normLine.includes("carne moida")) return "carne moida";

        const words = normLine.split(/\s+/);
        for (const word of words) {
          if (CARB_IGNORE.has(word)) continue;
          if (PROTEIN_MAP[word]) return PROTEIN_MAP[word];
        }
      }
      return null;
    };

    const findMatch = async () => {
      // For generic titles, extract protein from description
      const searchTerm = isGenericTitle && description
        ? extractProteinFromDescription(description) || normalized
        : normalized;

      // If still generic after extraction, don't match
      if (GENERIC_TITLES.has(searchTerm)) {
        setMatch(null);
        return;
      }

      // Strategy 1: exact alias match
      const { data: aliasData } = await supabase
        .from("meal_visual_aliases" as any)
        .select("library_item_id")
        .eq("normalized_alias", searchTerm)
        .limit(1);

      if (aliasData && aliasData.length > 0) {
        const { data: item } = await supabase
          .from("meal_visual_library" as any)
          .select("*")
          .eq("id", (aliasData[0] as any).library_item_id)
          .eq("is_active", true)
          .single();
        if (item) { setMatch(item as unknown as MealVisualItem); return; }
      }

      // Strategy 2: protein-first keyword extraction
      const words = searchTerm.split(/\s+/);
      for (const word of words) {
        if (CARB_IGNORE.has(word)) continue;
        const proteinBase = PROTEIN_MAP[word];
        if (proteinBase) {
          const { data: proteinAlias } = await supabase
            .from("meal_visual_aliases" as any)
            .select("library_item_id")
            .eq("normalized_alias", proteinBase)
            .limit(1);
          if (proteinAlias && proteinAlias.length > 0) {
            const { data: item } = await supabase
              .from("meal_visual_library" as any)
              .select("*")
              .eq("id", (proteinAlias[0] as any).library_item_id)
              .eq("is_active", true)
              .single();
            if (item) { setMatch(item as unknown as MealVisualItem); return; }
          }
          break;
        }
      }

      // Strategy 3: partial name match (fallback) - only for non-generic titles
      if (!isGenericTitle) {
        const { data: nameData } = await supabase
          .from("meal_visual_library" as any)
          .select("*")
          .eq("is_active", true)
          .ilike("name", `%${searchTerm.split(" ").slice(0, 3).join("%")}%`)
          .limit(1);

        if (nameData && nameData.length > 0) {
          setMatch(nameData[0] as unknown as MealVisualItem);
        } else {
          setMatch(null);
        }
      } else {
        setMatch(null);
      }
    };

    findMatch();
  }, [title, description]);

  return match;
}
