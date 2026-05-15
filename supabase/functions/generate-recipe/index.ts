import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { isLLMEnabled, llmBlockedResponse } from "../_shared/llm-gate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, nutritionist_id } = await req.json();
    if (!prompt || !nutritionist_id) throw new Error("prompt and nutritionist_id required");

    // Rate limit: 20 requests per 5 minutes
    const rl = await checkRateLimit("generate-recipe", nutritionist_id, 20, 5);
    if (!rl.allowed) return rateLimitResponse();

    // LLM Gate — admin control
    if (!(await isLLMEnabled())) return llmBlockedResponse(corsHeaders);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um nutricionista chef especialista em receitas saudáveis brasileiras.
Crie uma receita completa baseada no pedido do usuário.
Use a ferramenta create_recipe para retornar os dados estruturados.
Seja criativo mas prático. Ingredientes devem ser acessíveis no Brasil.
Calcule macros por porção com precisão.`;

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
          { role: "user", content: `Crie uma receita: ${prompt}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_recipe",
            description: "Create a structured recipe with nutritional info. All macro values are per serving and foods must include grams for engine scaling.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                ingredients: { type: "array", items: { type: "string" } },
                instructions: { type: "array", items: { type: "string" } },
                foods: {
                  type: "array",
                  description: "Structured food items with grams and per-gram macros for scaling engine",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      grams_reference: { type: "number" },
                      calories_per_gram: { type: "number" },
                      protein_per_gram: { type: "number" },
                      carbs_per_gram: { type: "number" },
                      fat_per_gram: { type: "number" },
                    },
                    required: ["name", "grams_reference", "calories_per_gram", "protein_per_gram", "carbs_per_gram", "fat_per_gram"],
                  },
                },
                prep_time_minutes: { type: "number" },
                cook_time_minutes: { type: "number" },
                servings: { type: "number" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                category: { type: "string", enum: ["main", "snack", "dessert", "breakfast", "salad", "soup", "drink"] },
                calorias_por_porcao: { type: "number" },
                proteinas_por_porcao: { type: "number" },
                carboidratos_por_porcao: { type: "number" },
                gorduras_por_porcao: { type: "number" },
              },
              required: ["title", "description", "ingredients", "instructions", "foods", "prep_time_minutes", "cook_time_minutes", "servings", "difficulty", "category", "calorias_por_porcao", "proteinas_por_porcao", "carboidratos_por_porcao", "gorduras_por_porcao"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_recipe" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Tente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error: " + response.status);
    }

    const aiResp = await response.json();
    const toolCall = aiResp.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const recipe = JSON.parse(toolCall.function.arguments);

    // Save to DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.from("recipes").insert({
      nutritionist_id,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      category: recipe.category,
      calorias_por_porcao: recipe.calorias_por_porcao,
      proteinas_por_porcao: recipe.proteinas_por_porcao,
      carboidratos_por_porcao: recipe.carboidratos_por_porcao,
      gorduras_por_porcao: recipe.gorduras_por_porcao,
      is_ai_generated: true,
    }).select().single();

    if (error) throw error;

    // Save structured recipe_items for scaling engine
    if (recipe.foods && recipe.foods.length > 0 && data) {
      const recipeItems = recipe.foods.map((f: any, i: number) => ({
        recipe_id: data.id,
        food_name: f.name,
        grams_reference: f.grams_reference,
        is_scalable: true,
        display_order: i,
      }));
      await supabase.from("recipe_items").insert(recipeItems);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-recipe error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
