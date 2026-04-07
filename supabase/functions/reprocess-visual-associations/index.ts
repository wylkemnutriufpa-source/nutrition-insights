import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Build alias map
    const { data: aliases } = await supabase.from('meal_visual_aliases').select('library_item_id, normalized_alias');
    const aliasMap = new Map<string, string>();
    for (const a of (aliases || [])) {
      aliasMap.set(a.normalized_alias, a.library_item_id);
    }

    const normalize = (text: string): string => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        // Remove measurement phrases containing food-like words (e.g. "col. sopa" = tablespoon)
        .replace(/col\.?\s*de?\s*sopa/gi, "")
        .replace(/colher(es)?\s*de?\s*sopa/gi, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Extended protein map
    const PROTEIN_MAP: Record<string, string> = {
      frango: "frango", peito: "frango", sobrecoxa: "sobrecoxa", coxa: "sobrecoxa",
      carne: "carne", bife: "carne", alcatra: "carne", patinho: "carne",
      acem: "acem", maminha: "maminha",
      "carne moida": "carne moida", "carne de panela": "carne de panela", "carne assada": "carne assada",
      picanha: "picanha", costelinha: "costelinha",
      costela: "costela-suina",
      porco: "porco", suino: "porco", lombo: "lombo suino",
      peixe: "peixe", tilapia: "file de tilapia", salmao: "peixe", pescada: "peixe", merluza: "peixe",
      camarao: "camarao",
      ovo: "ovo", ovos: "ovo", omelete: "ovo",
    };
    const FRUIT_MAP: Record<string, string> = {
      abacaxi: "abacaxi", morango: "morango", melao: "melao", goiaba: "goiaba",
      pera: "pera", uva: "uva", laranja: "laranja", melancia: "melancia",
      manga: "manga", maca: "maca", mamao: "mamao", banana: "banana",
    };
    const CARB_IGNORE = new Set(["arroz", "batata", "macarrao", "feijao", "pure", "mandioca", "inhame", "legumes", "salada", "brocolis", "macaxeira"]);
    const GENERIC_TITLES = new Set(["almoco", "jantar", "cafe da manha", "refeicao", "marmita"]);

    /**
     * Extract the first protein mentioned in the description.
     * Only looks at lines that start with "•" (food lines), ignoring substitution lines.
     */
    const extractFoodFromDescription = (description: string): string | null => {
      const lines = description.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
        if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;

        const normLine = normalize(trimmed);
        const words = normLine.split(/\s+/);

        // Check multi-word items first
        if (normLine.includes("carne moida")) return "carne moida";
        if (normLine.includes("carne de panela")) return "carne de panela";
        if (normLine.includes("carne assada")) return "carne assada";

        for (const word of words) {
          if (CARB_IGNORE.has(word)) continue;
          if (PROTEIN_MAP[word]) return PROTEIN_MAP[word];
          if (FRUIT_MAP[word]) return FRUIT_MAP[word];
        }
      }
      return null;
    };

    const findMatch = (title: string, description?: string): string | null => {
      const norm = normalize(title);

      // If title is a generic meal type, use description to find protein
      if (GENERIC_TITLES.has(norm) && description) {
        const food = extractFoodFromDescription(description);
        if (food) {
          if (aliasMap.has(food)) return aliasMap.get(food)!;
          for (const [alias, itemId] of aliasMap) {
            if (alias === food || alias.startsWith(food + " ")) return itemId;
          }
        }
        return null;
      }

      // Strategy 1: exact alias match
      if (aliasMap.has(norm)) return aliasMap.get(norm)!;

      // Strategy 2: protein keyword extraction from title
      const words = norm.split(/\s+/);
      for (const word of words) {
        if (CARB_IGNORE.has(word)) continue;
        const base = PROTEIN_MAP[word] || FRUIT_MAP[word];
        if (base) {
          for (const [alias, itemId] of aliasMap) {
            if (alias === base || alias.startsWith(base + " ")) return itemId;
          }
        }
      }

      // Strategy 3: partial match (fallback)
      for (const [alias, itemId] of aliasMap) {
        if (norm.includes(alias) || alias.includes(norm)) return itemId;
      }
      return null;
    };

    let totalLinked = 0;
    let totalAnalyzed = 0;
    let totalAlreadyLinked = 0;
    let totalCorrected = 0;
    const unrecognized = new Map<string, number>();

    // Process meal_plan_items in batches - including already-linked items to fix wrong links
    let offset = 0;
    const batchSize = 500;
    while (true) {
      const { data: items } = await supabase
        .from('meal_plan_items')
        .select('id, title, description, visual_library_item_id')
        .not('title', 'is', null)
        .range(offset, offset + batchSize - 1);

      if (!items || items.length === 0) break;

      for (const item of items) {
        totalAnalyzed++;
        const match = findMatch(item.title || '', item.description || '');
        
        if (match) {
          if (item.visual_library_item_id !== match) {
            await supabase.from('meal_plan_items').update({ visual_library_item_id: match }).eq('id', item.id);
            if (item.visual_library_item_id) {
              totalCorrected++;
            } else {
              totalLinked++;
            }
          } else {
            totalAlreadyLinked++;
          }
        } else if (!item.visual_library_item_id) {
          const norm = normalize(item.title || '');
          if (!GENERIC_TITLES.has(norm)) {
            unrecognized.set(norm, (unrecognized.get(norm) || 0) + 1);
          }
        }
      }

      if (items.length < batchSize) break;
      offset += batchSize;
    }

    // Process saved_meals
    const { data: savedMeals } = await supabase
      .from('saved_meals')
      .select('id, title, visual_library_item_id')
      .not('title', 'is', null)
      .limit(1000);

    for (const item of (savedMeals || [])) {
      totalAnalyzed++;
      const match = findMatch(item.title || '');
      if (match && item.visual_library_item_id !== match) {
        await supabase.from('saved_meals').update({ visual_library_item_id: match }).eq('id', item.id);
        totalLinked++;
      }
    }

    const topUnrecognized = [...unrecognized.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([name, count]) => ({ name, count }));

    return new Response(JSON.stringify({
      totalAnalyzed,
      totalLinked,
      totalCorrected,
      totalAlreadyLinked,
      totalUnlinked: unrecognized.size,
      topUnrecognized,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
