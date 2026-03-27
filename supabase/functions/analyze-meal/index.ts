import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════
// ANALYZE-MEAL v3.0 — Hybrid Deterministic + AI Fallback
// Priority: DB lookup → deterministic calc → AI only if needed
// ═══════════════════════════════════════════════════

interface FoodMatch {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  portion_reference: string;
  quantity: number;
  matched: boolean;
}

// ─── Text Parsing ───
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s,]/g, "")
    .trim();
}

function parseQuantity(token: string): { qty: number; unit: string; rest: string } {
  // Match patterns like "2 ovos", "200g frango", "1 xicara arroz", "3 fatias pao"
  const match = token.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|un|unidade|unidades|fatia|fatias|colher|colheres|xicara|xicaras|copo|copos)?\s*(.*)$/i);
  if (match) {
    const qty = parseFloat(match[1].replace(",", "."));
    const unit = (match[2] || "").toLowerCase();
    const rest = (match[3] || "").trim();
    return { qty, unit, rest };
  }
  return { qty: 1, unit: "", rest: token };
}

function splitDescription(description: string): string[] {
  // Split by commas, "e", "com", newlines
  return description
    .split(/[,\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .flatMap(s => s.split(/\s+e\s+/))
    .map(s => s.trim())
    .filter(s => s.length > 1);
}

// ─── DB Matching ───
function findBestMatch(
  normalizedItem: string,
  foodDb: Array<{ food_name: string; normalized_name: string; calories: number; protein: number; carbs: number; fats: number; fiber: number; portion_reference: string }>
): typeof foodDb[0] | null {
  // Exact match
  let match = foodDb.find(f => f.normalized_name === normalizedItem);
  if (match) return match;

  // Contains match
  match = foodDb.find(f => normalizedItem.includes(f.normalized_name) || f.normalized_name.includes(normalizedItem));
  if (match) return match;

  // Word-level matching (at least 2 words in common)
  const itemWords = normalizedItem.split(/\s+/).filter(w => w.length > 2);
  let bestScore = 0;
  let bestMatch: typeof foodDb[0] | null = null;

  for (const food of foodDb) {
    const foodWords = food.normalized_name.split(/\s+/).filter(w => w.length > 2);
    const commonWords = itemWords.filter(w => foodWords.some(fw => fw.includes(w) || w.includes(fw)));
    const score = commonWords.length / Math.max(foodWords.length, 1);
    if (score > bestScore && commonWords.length >= 1) {
      bestScore = score;
      bestMatch = food;
    }
  }

  return bestScore >= 0.5 ? bestMatch : null;
}

function estimatePortionMultiplier(qty: number, unit: string, portionRef: string): number {
  // If user specified grams, scale relative to portion reference
  const refGrams = portionRef.match(/(\d+)\s*g/)?.[1];
  if (unit === "g" && refGrams) {
    return qty / parseFloat(refGrams);
  }
  if (unit === "kg") {
    const refG = refGrams ? parseFloat(refGrams) : 100;
    return (qty * 1000) / refG;
  }
  // For units like "fatia", "un" etc, just use the qty
  if (["un", "unidade", "unidades", "fatia", "fatias"].includes(unit)) {
    return qty;
  }
  // Default: treat as portion count
  return qty;
}

function computeScore(totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number }): number {
  let score = 50; // Base

  // Protein quality (target: 20-40g per meal)
  if (totals.protein >= 20 && totals.protein <= 40) score += 15;
  else if (totals.protein >= 10) score += 8;
  else score -= 5;

  // Fiber presence
  if (totals.fiber >= 5) score += 10;
  else if (totals.fiber >= 2) score += 5;

  // Calorie range (target: 300-700 per meal)
  if (totals.calories >= 300 && totals.calories <= 700) score += 15;
  else if (totals.calories >= 200 && totals.calories <= 900) score += 8;
  else score -= 5;

  // Macro balance (protein should be 20-35% of calories)
  const proteinPct = (totals.protein * 4) / Math.max(totals.calories, 1) * 100;
  if (proteinPct >= 20 && proteinPct <= 35) score += 10;
  else if (proteinPct >= 15) score += 5;

  return Math.max(0, Math.min(100, score));
}

function generateFeedback(totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number }, score: number, matchedCount: number, totalItems: number): string {
  const lines: string[] = [];

  if (score >= 75) lines.push("🎯 Excelente refeição! Boa composição nutricional.");
  else if (score >= 50) lines.push("👍 Refeição adequada, com espaço para otimização.");
  else lines.push("⚠️ Refeição precisa de ajustes para melhor equilíbrio nutricional.");

  if (totals.protein < 15) lines.push("💡 Dica: inclua uma fonte de proteína (frango, ovo, peixe) para melhorar saciedade.");
  if (totals.fiber < 3) lines.push("💡 Dica: adicione vegetais ou salada para aumentar fibras e micronutrientes.");
  if (totals.calories > 900) lines.push("⚡ Atenção: refeição com alto valor calórico. Considere reduzir porções.");
  if (totals.fat > 30 && totals.fat > totals.protein) lines.push("💡 Dica: a gordura está proporcionalmente alta. Prefira preparações grelhadas ou assadas.");

  if (matchedCount < totalItems) {
    lines.push(`\nℹ️ ${matchedCount} de ${totalItems} alimento(s) identificados na base TACO/IBGE. Valores podem ter margem de variação.`);
  }

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth check ──
    const authHeader = req.headers.get("Authorization");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || user.id;

    // Rate limiting
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data: allowed } = await sb.rpc("check_rate_limit", {
      _function_name: "analyze-meal",
      _client_key: clientIP,
      _max_requests: 10,
      _window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    const { description, image_url } = await req.json();

    // ── Input validation ──
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Descrição é obrigatória." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (description.length > 2000) {
      return new Response(JSON.stringify({ error: "Descrição muito longa (máx 2000 caracteres)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (image_url) {
      if (typeof image_url !== "string" || image_url.length > 1000 || !/^https:\/\//.test(image_url)) {
        return new Response(JSON.stringify({ error: "URL de imagem inválida. Use HTTPS." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const sanitizedDescription = description.trim().replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");

    // ═══ LAYER 1: Deterministic Analysis ═══
    // Load food database
    const { data: foodDb } = await sb
      .from("ifj_food_database")
      .select("food_name, normalized_name, calories, protein, carbs, fats, fiber, portion_reference")
      .eq("is_active", true);

    const foods = foodDb || [];
    const items = splitDescription(sanitizedDescription);
    const matchedFoods: FoodMatch[] = [];
    const unmatchedItems: string[] = [];

    for (const item of items) {
      const normalized = normalizeText(item);
      const { qty, unit, rest } = parseQuantity(normalized);
      const searchTerm = rest || normalized;
      
      const dbMatch = findBestMatch(searchTerm, foods);
      if (dbMatch) {
        const multiplier = estimatePortionMultiplier(qty, unit, dbMatch.portion_reference || "100g");
        matchedFoods.push({
          food_name: dbMatch.food_name,
          calories: Math.round((dbMatch.calories || 0) * multiplier),
          protein: Math.round((dbMatch.protein || 0) * multiplier * 10) / 10,
          carbs: Math.round((dbMatch.carbs || 0) * multiplier * 10) / 10,
          fats: Math.round((dbMatch.fats || 0) * multiplier * 10) / 10,
          fiber: Math.round((dbMatch.fiber || 0) * multiplier * 10) / 10,
          portion_reference: dbMatch.portion_reference || "",
          quantity: qty,
          matched: true,
        });
      } else {
        unmatchedItems.push(item.trim());
      }
    }

    const matchRatio = items.length > 0 ? matchedFoods.length / items.length : 0;
    const needsAIFallback = (matchRatio < 0.5 && items.length > 0) || !!image_url;

    // ═══ LAYER 2: AI Fallback (only if needed) ═══
    if (needsAIFallback) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        // No AI key — return best-effort deterministic result
        return returnDeterministicResult(matchedFoods, unmatchedItems, items.length);
      }

      // Log AI usage
      await sb.from("ai_usage_tracking").insert({
        user_id: user.id,
        feature_key: "analyze-meal",
        metadata: { reason: image_url ? "image_analysis" : "low_match_ratio", match_ratio: matchRatio, unmatched: unmatchedItems },
      });

      const systemPrompt = `Você é um nutricionista especialista. Analise a refeição e retorne dados estruturados via a ferramenta analyze_meal.
Critérios de score (0-100): variedade, equilíbrio de macros, fibras, porção, qualidade dos alimentos.
Feedback em português brasileiro, motivacional e com dicas práticas.`;

      const userMessage = image_url
        ? `Analise esta refeição: <user_input>${sanitizedDescription}</user_input>. Imagem: ${image_url}`
        : `Analise esta refeição: <user_input>${sanitizedDescription}</user_input>`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            tools: [{
              type: "function",
              function: {
                name: "analyze_meal",
                description: "Return structured nutritional analysis of a meal",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    calories: { type: "number" },
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fat: { type: "number" },
                    fiber: { type: "number" },
                    score: { type: "number" },
                    feedback: { type: "string" },
                  },
                  required: ["title", "calories", "protein", "carbs", "fat", "fiber", "score", "feedback"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "analyze_meal" } },
          }),
        });

        if (response.ok) {
          const aiResponse = await response.json();
          const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const analysis = JSON.parse(toolCall.function.arguments);
            return new Response(JSON.stringify({ ...analysis, source: "ai_fallback", ai_reason: image_url ? "image_analysis" : "unmatched_foods" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch {
        // AI failed — fall through to deterministic
      }
    }

    // ═══ Return Deterministic Result ═══
    return returnDeterministicResult(matchedFoods, unmatchedItems, items.length);
  } catch (e) {
    console.error("analyze-meal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function returnDeterministicResult(matchedFoods: FoodMatch[], unmatchedItems: string[], totalItems: number) {
  const totals = matchedFoods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fats,
      fiber: acc.fiber + f.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const title = matchedFoods.length > 0
    ? matchedFoods.map(f => f.food_name).join(" + ")
    : "Refeição analisada";

  const score = computeScore(totals);
  const feedback = generateFeedback(totals, score, matchedFoods.length, totalItems);

  return new Response(JSON.stringify({
    title,
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
    score,
    feedback,
    source: "deterministic",
    matched_foods: matchedFoods.map(f => ({ name: f.food_name, calories: f.calories, qty: f.quantity })),
    unmatched_items: unmatchedItems,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
