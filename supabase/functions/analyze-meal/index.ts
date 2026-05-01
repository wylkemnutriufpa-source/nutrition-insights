import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isLLMEnabled } from "../_shared/llm-gate.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://fitjourney.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Vary": "Origin"
};

// ═══════════════════════════════════════════════════
// ANALYZE-MEAL v5.0 — Phase 4: Enterprise Hardening
// Priority: Cache → Enhanced DB lookup → deterministic calc → AI fallback
// Enhanced tracking, connectors, quantities, units, regional names
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
  match_method?: string;
}

interface FoodDbRow {
  food_name: string;
  normalized_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  portion_reference: string;
  synonyms: string[] | null;
}

interface MatchResult {
  food: FoodDbRow;
  method: "exact" | "synonym" | "contains" | "singular" | "word_score";
}

// ─── Text Normalization ───
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s,./]/g, "")
    .trim();
}

// ─── Singularize simple Portuguese words ───
function singularize(word: string): string {
  if (word.endsWith("oes")) return word.slice(0, -3) + "ao";
  if (word.endsWith("aes")) return word.slice(0, -3) + "ao";
  if (word.endsWith("is") && word.length > 3) return word.slice(0, -2) + "l";
  if (word.endsWith("ns")) return word.slice(0, -2) + "m";
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function normalizePlural(text: string): string {
  return text.split(/\s+/).map(singularize).join(" ");
}

// ─── Simple hash for cache key ───
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ─── Enhanced quantity parsing ───
const WORD_NUMBERS: Record<string, number> = {
  "um": 1, "uma": 1, "meia": 0.5, "meio": 0.5,
  "dois": 2, "duas": 2, "tres": 3, "quatro": 4, "cinco": 5,
  "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10,
};

function parseQuantity(token: string): { qty: number; unit: string; rest: string } {
  const trimmed = token.trim();

  // Fraction like "1/2"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (fracMatch) {
    const qty = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
    const afterFrac = fracMatch[3].trim();
    const unitMatch = afterFrac.match(/^(g|kg|ml|l|un|unidade|unidades|fatia|fatias|colher|colheres|xicara|xicaras|copo|copos|col|sopa|cha|concha|conchas|prato|pratos|pedaco|pedacos)\s*(.*)$/i);
    if (unitMatch) return { qty, unit: unitMatch[1].toLowerCase(), rest: unitMatch[2].trim() };
    return { qty, unit: "", rest: afterFrac };
  }

  // Numeric like "2" or "1.5" or "1,5"
  const numMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|un|unidade|unidades|fatia|fatias|colher|colheres|xicara|xicaras|copo|copos|col|sopa|cha|concha|conchas|prato|pratos|pedaco|pedacos)?\s*(.*)$/i);
  if (numMatch) {
    const qty = parseFloat(numMatch[1].replace(",", "."));
    const unit = (numMatch[2] || "").toLowerCase();
    const rest = (numMatch[3] || "").trim();
    return { qty, unit, rest };
  }

  // Word-based numbers: "duas fatias", "meia xícara"
  const words = trimmed.split(/\s+/);
  const firstWord = normalizeText(words[0]);
  if (WORD_NUMBERS[firstWord] !== undefined) {
    const qty = WORD_NUMBERS[firstWord];
    const remaining = words.slice(1).join(" ");
    const unitMatch = remaining.match(/^(g|kg|ml|l|un|unidade|unidades|fatia|fatias|colher|colheres|xicara|xicaras|copo|copos|col|sopa|cha|concha|conchas|prato|pratos|pedaco|pedacos)\s*(.*)$/i);
    if (unitMatch) return { qty, unit: unitMatch[1].toLowerCase(), rest: unitMatch[2].trim() };
    return { qty, unit: "", rest: remaining };
  }

  return { qty: 1, unit: "", rest: trimmed };
}

// ─── Enhanced description splitting ───
function splitDescription(description: string): string[] {
  // First split by comma, newline, bullet, semicolon
  const rawParts = description
    .split(/[,;\n•]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Then split each part by connectors: "e", "com", "+", "/"
  // But keep compound dishes together when they make sense
  const COMPOUND_PREFIXES = ["cafe com leite", "pao com", "arroz com", "vitamina de", "suco de", "caldo de", "salada de", "pure de", "mingau de", "iogurte com", "acai com", "tapioca com", "omelete com", "sanduiche de", "wrap de", "torrada com"];

  const result: string[] = [];
  for (const part of rawParts) {
    const normalized = normalizeText(part);
    // Check if it's a known compound dish pattern
    const isCompound = COMPOUND_PREFIXES.some(p => normalized.startsWith(p));
    if (isCompound) {
      result.push(part);
    } else {
      // Split by "e", "com", "+", "/"
      const subParts = part.split(/\s+(?:e|com)\s+|\s*[+\/]\s*/i);
      result.push(...subParts.map(s => s.trim()).filter(s => s.length > 1));
    }
  }
  return result;
}

// ─── Enhanced DB Matching with Synonyms ───
function findBestMatch(normalizedItem: string, foodDb: FoodDbRow[]): MatchResult | null {
  const singularItem = normalizePlural(normalizedItem);

  // 1. Exact match on normalized_name
  let match = foodDb.find(f => f.normalized_name === normalizedItem || f.normalized_name === singularItem);
  if (match) return { food: match, method: "exact" };

  // 2. Synonym match
  match = foodDb.find(f => f.synonyms?.some(s => {
    const ns = normalizeText(s);
    return ns === normalizedItem || ns === singularItem || normalizedItem.includes(ns) || ns.includes(normalizedItem);
  }));
  if (match) return { food: match, method: "synonym" };

  // 3. Contains match
  match = foodDb.find(f => normalizedItem.includes(f.normalized_name) || f.normalized_name.includes(normalizedItem));
  if (match) return { food: match, method: "contains" };

  // 3b. Singular contains
  match = foodDb.find(f => {
    const singularFood = normalizePlural(f.normalized_name);
    return singularItem.includes(singularFood) || singularFood.includes(singularItem);
  });
  if (match) return { food: match, method: "singular" };

  // 4. Word-level scoring
  const itemWords = singularItem.split(/\s+/).filter(w => w.length > 2);
  let bestScore = 0;
  let bestMatch: FoodDbRow | null = null;

  for (const food of foodDb) {
    const foodWords = normalizePlural(food.normalized_name).split(/\s+/).filter(w => w.length > 2);
    const allTerms = [...foodWords];
    if (food.synonyms) {
      for (const s of food.synonyms) {
        allTerms.push(...normalizeText(s).split(/\s+/).filter(w => w.length > 2));
      }
    }
    const uniqueTerms = [...new Set(allTerms)];
    const commonWords = itemWords.filter(w => uniqueTerms.some(fw => fw.includes(w) || w.includes(fw)));
    const score = commonWords.length / Math.max(foodWords.length, 1);
    if (score > bestScore && commonWords.length >= 1) {
      bestScore = score;
      bestMatch = food;
    }
  }

  return bestScore >= 0.4 && bestMatch ? { food: bestMatch, method: "word_score" } : null;
}

function estimatePortionMultiplier(qty: number, unit: string, portionRef: string): number {
  const refGrams = portionRef.match(/(\d+)\s*g/)?.[1];
  if (unit === "g" && refGrams) return qty / parseFloat(refGrams);
  if (unit === "kg") {
    const refG = refGrams ? parseFloat(refGrams) : 100;
    return (qty * 1000) / refG;
  }
  if (["ml", "l"].includes(unit)) {
    const refMl = portionRef.match(/(\d+)\s*ml/)?.[1];
    if (unit === "l") return refMl ? (qty * 1000) / parseFloat(refMl) : qty;
    if (refMl) return qty / parseFloat(refMl);
  }
  if (["un", "unidade", "unidades", "fatia", "fatias", "pedaco", "pedacos"].includes(unit)) return qty;
  if (["colher", "colheres", "col", "sopa"].includes(unit)) return qty * 0.5;
  if (["xicara", "xicaras", "copo", "copos"].includes(unit)) return qty * 2;
  if (["concha", "conchas"].includes(unit)) return qty * 1.5;
  if (["prato", "pratos"].includes(unit)) return qty * 3;
  return qty;
}

function computeScore(totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number }): number {
  let score = 50;
  if (totals.protein >= 20 && totals.protein <= 40) score += 15;
  else if (totals.protein >= 10) score += 8;
  else score -= 5;
  if (totals.fiber >= 5) score += 10;
  else if (totals.fiber >= 2) score += 5;
  if (totals.calories >= 300 && totals.calories <= 700) score += 15;
  else if (totals.calories >= 200 && totals.calories <= 900) score += 8;
  else score -= 5;
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

    // ═══ LAYER 0: Cache Check ═══
    const descHash = simpleHash(normalizeText(sanitizedDescription) + (image_url ? "|img" : ""));

    const { data: cached } = await sb
      .from("meal_analysis_cache")
      .select("analysis_result, id, hit_count")
      .eq("description_hash", descHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      sb.from("meal_analysis_cache")
        .update({ hit_count: (cached.hit_count || 0) + 1 })
        .eq("id", cached.id)
        .then(() => {});

      await sb.from("ai_usage_tracking").insert({
        user_id: user.id,
        feature_key: "analyze-meal",
        metadata: {
          source: "cache_hit",
          cache_id: cached.id,
          description_hash: descHash,
          has_image: !!image_url,
        },
      });

      const result = cached.analysis_result as Record<string, unknown>;
      return new Response(JSON.stringify({ ...result, source: "cache_hit" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ LAYER 1: Deterministic Analysis ═══
    const { data: foodDb } = await sb
      .from("ifj_food_database")
      .select("food_name, normalized_name, calories, protein, carbs, fats, fiber, portion_reference, synonyms")
      .eq("is_active", true);

    const foods = (foodDb || []) as FoodDbRow[];
    const items = splitDescription(sanitizedDescription);
    const matchedFoods: FoodMatch[] = [];
    const unmatchedItems: string[] = [];
    let usedSynonymMatch = false;
    let usedPluralNormalization = false;
    let usedCompoundMatch = false;
    const resolvedFoods: string[] = [];

    for (const item of items) {
      const normalized = normalizeText(item);
      const { qty, unit, rest } = parseQuantity(normalized);
      const searchTerm = rest || normalized;

      // Check if plural normalization was needed
      if (searchTerm !== normalizePlural(searchTerm)) {
        usedPluralNormalization = true;
      }

      const matchResult = findBestMatch(searchTerm, foods);
      if (matchResult) {
        const { food: dbMatch, method } = matchResult;
        if (method === "synonym") usedSynonymMatch = true;
        if (method === "contains" || method === "word_score") usedCompoundMatch = true;

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
          match_method: method,
        });
        resolvedFoods.push(dbMatch.food_name);
      } else {
        unmatchedItems.push(item.trim());
      }
    }

    const matchRatio = items.length > 0 ? matchedFoods.length / items.length : 0;
    const needsAIFallback = (matchRatio < 0.5 && items.length > 0) || !!image_url;

    // ─── Enhanced tracking metadata ───
    const trackingMetadata = {
      source: needsAIFallback ? "ai_fallback" : "deterministic",
      match_ratio: Math.round(matchRatio * 100) / 100,
      matched_count: matchedFoods.length,
      total_items: items.length,
      unmatched_items: unmatchedItems.slice(0, 10),
      has_image: !!image_url,
      description_hash: descHash,
      resolved_foods: resolvedFoods.slice(0, 15),
      used_synonym_match: usedSynonymMatch,
      used_plural_normalization: usedPluralNormalization,
      used_compound_match: usedCompoundMatch,
    };

    // Log deterministic usage
    if (!needsAIFallback) {
      await sb.from("ai_usage_tracking").insert({
        user_id: user.id,
        feature_key: "analyze-meal",
        metadata: trackingMetadata,
      });
    }

    // ═══ LAYER 2: AI Fallback (only if needed) ═══
    if (needsAIFallback) {
      // LLM Gate — admin control: if LLM disabled, return deterministic only
      if (!(await isLLMEnabled())) {
        return returnDeterministicResult(matchedFoods, unmatchedItems, items.length);
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return returnDeterministicResult(matchedFoods, unmatchedItems, items.length);
      }

      // Log AI usage with enhanced metadata
      await sb.from("ai_usage_tracking").insert({
        user_id: user.id,
        feature_key: "analyze-meal",
        metadata: {
          ...trackingMetadata,
          source: "ai_fallback",
          ai_reason: image_url ? "image_analysis" : "low_match_ratio",
        },
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
            const aiResult = { ...analysis, source: "ai_fallback", ai_reason: image_url ? "image_analysis" : "unmatched_foods" };

            // Cache the AI result for 30 days
            await sb.from("meal_analysis_cache").upsert({
              description_hash: descHash,
              description_original: sanitizedDescription.slice(0, 500),
              has_image: !!image_url,
              analysis_result: aiResult,
              source: "ai_fallback",
              hit_count: 0,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }, { onConflict: "description_hash" });

            return new Response(JSON.stringify(aiResult), {
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
    matched_foods: matchedFoods.map(f => ({ name: f.food_name, calories: f.calories, qty: f.quantity, method: f.match_method })),
    unmatched_items: unmatchedItems,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
