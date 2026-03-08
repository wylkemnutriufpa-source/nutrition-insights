import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, nutritionist_id } = await req.json();
    if (!prompt || !nutritionist_id) throw new Error("prompt and nutritionist_id required");

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
            description: "Create a structured recipe with nutritional info",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                ingredients: { type: "array", items: { type: "string" } },
                instructions: { type: "array", items: { type: "string" } },
                prep_time_minutes: { type: "number" },
                cook_time_minutes: { type: "number" },
                servings: { type: "number" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                category: { type: "string", enum: ["main", "snack", "dessert", "breakfast", "salad", "soup", "drink"] },
                calories_per_serving: { type: "number" },
                protein_per_serving: { type: "number" },
                carbs_per_serving: { type: "number" },
                fat_per_serving: { type: "number" },
              },
              required: ["title", "description", "ingredients", "instructions", "prep_time_minutes", "cook_time_minutes", "servings", "difficulty", "category", "calories_per_serving", "protein_per_serving", "carbs_per_serving", "fat_per_serving"],
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
      calories_per_serving: recipe.calories_per_serving,
      protein_per_serving: recipe.protein_per_serving,
      carbs_per_serving: recipe.carbs_per_serving,
      fat_per_serving: recipe.fat_per_serving,
      is_ai_generated: true,
    }).select().single();

    if (error) throw error;

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
