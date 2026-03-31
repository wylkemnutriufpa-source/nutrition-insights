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

    // Verify user is admin
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

    // Normalize function
    const normalize = (text: string): string => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Protein keywords
    const PROTEIN_MAP: Record<string, string> = {
      frango: "frango", carne: "carne", bife: "carne",
      picanha: "picanha", costelinha: "costelinha",
      peixe: "peixe", tilapia: "peixe", salmao: "peixe",
      camarao: "camarao", ovo: "ovo", ovos: "ovo", omelete: "ovo",
    };
    const CARB_IGNORE = new Set(["arroz", "batata", "macarrao", "feijao", "pure", "mandioca", "inhame", "legumes", "salada"]);

    const findMatch = (title: string): string | null => {
      const norm = normalize(title);
      if (aliasMap.has(norm)) return aliasMap.get(norm)!;

      const words = norm.split(/\s+/);
      for (const word of words) {
        if (CARB_IGNORE.has(word)) continue;
        const base = PROTEIN_MAP[word];
        if (base) {
          for (const [alias, itemId] of aliasMap) {
            if (alias === base || alias.startsWith(base + " ")) return itemId;
          }
        }
      }

      for (const [alias, itemId] of aliasMap) {
        if (norm.includes(alias) || alias.includes(norm)) return itemId;
      }
      return null;
    };

    let totalLinked = 0;
    let totalAnalyzed = 0;
    let totalAlreadyLinked = 0;
    const unrecognized = new Map<string, number>();

    // Process meal_plan_items in batches
    let offset = 0;
    const batchSize = 500;
    while (true) {
      const { data: items } = await supabase
        .from('meal_plan_items')
        .select('id, title, visual_library_item_id')
        .is('visual_library_item_id', null)
        .not('title', 'is', null)
        .range(offset, offset + batchSize - 1);

      if (!items || items.length === 0) break;

      for (const item of items) {
        totalAnalyzed++;
        const match = findMatch(item.title || '');
        if (match) {
          await supabase.from('meal_plan_items').update({ visual_library_item_id: match }).eq('id', item.id);
          totalLinked++;
        } else {
          const norm = normalize(item.title || '');
          unrecognized.set(norm, (unrecognized.get(norm) || 0) + 1);
        }
      }

      if (items.length < batchSize) break;
      offset += batchSize;
    }

    // Process saved_meals
    const { data: savedMeals } = await supabase
      .from('saved_meals')
      .select('id, title, visual_library_item_id')
      .is('visual_library_item_id', null)
      .not('title', 'is', null)
      .limit(1000);

    for (const item of (savedMeals || [])) {
      totalAnalyzed++;
      const match = findMatch(item.title || '');
      if (match) {
        await supabase.from('saved_meals').update({ visual_library_item_id: match }).eq('id', item.id);
        totalLinked++;
      }
    }

    // Count already linked
    const { count: linkedCount } = await supabase
      .from('meal_plan_items')
      .select('*', { count: 'exact', head: true })
      .not('visual_library_item_id', 'is', null);
    totalAlreadyLinked = linkedCount || 0;

    const topUnrecognized = [...unrecognized.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([name, count]) => ({ name, count }));

    return new Response(JSON.stringify({
      totalAnalyzed,
      totalLinked,
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
