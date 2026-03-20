import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Database-backed rate limiting (5 req/60s per user)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data: allowed } = await sb.rpc("check_rate_limit", {
      _function_name: "analyze-meal",
      _client_key: clientIP,
      _max_requests: 5,
      _window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    const { description, image_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um nutricionista especialista em análise de refeições. Analise a refeição descrita e retorne uma avaliação nutricional.

IMPORTANTE: Use a ferramenta analyze_meal para retornar os dados estruturados.

Critérios de avaliação (score 0-100):
- Variedade de nutrientes
- Equilíbrio entre macronutrientes
- Presença de fibras e micronutrientes
- Porção adequada
- Qualidade dos alimentos

Seja preciso nas estimativas calóricas e de macros. O feedback deve ser em português brasileiro, motivacional e com dicas práticas de melhoria.`;

    const userMessage = image_url 
      ? `Analise esta refeição: "${description}". Imagem da refeição: ${image_url}`
      : `Analise esta refeição: "${description}"`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_meal",
              description: "Return structured nutritional analysis of a meal",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short name for the meal" },
                  calories: { type: "number", description: "Estimated total calories" },
                  protein: { type: "number", description: "Estimated protein in grams" },
                  carbs: { type: "number", description: "Estimated carbs in grams" },
                  fat: { type: "number", description: "Estimated fat in grams" },
                  fiber: { type: "number", description: "Estimated fiber in grams" },
                  score: { type: "number", description: "Nutritional quality score 0-100" },
                  feedback: { type: "string", description: "Detailed nutritional feedback in Brazilian Portuguese with tips" },
                },
                required: ["title", "calories", "protein", "carbs", "fat", "fiber", "score", "feedback"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_meal" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione fundos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-meal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
