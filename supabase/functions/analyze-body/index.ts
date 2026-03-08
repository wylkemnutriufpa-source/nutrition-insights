import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { analysis_id, front_image_url, side_image_url, back_image_url, previous_analysis } = await req.json();
    if (!analysis_id) throw new Error("analysis_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em avaliação corporal e composição física.
Analise as imagens corporais do paciente (frente, lateral, costas) e forneça:
- Estimativa de percentual de gordura corporal
- Classificação de biotipo (ectomorfo, mesomorfo, endomorfo ou misto)
- Nível de definição muscular (1-10)
- Distribuição de gordura
- Resumo geral e recomendações

${previous_analysis ? `ANÁLISE ANTERIOR para comparação:
- Data: ${previous_analysis.analysis_date}
- % Gordura: ${previous_analysis.body_fat_estimate || 'N/A'}
- Biotipo: ${previous_analysis.body_type || 'N/A'}
- Definição: ${previous_analysis.muscle_definition || 'N/A'}
Compare com a análise anterior e destaque mudanças.` : 'Esta é a primeira análise do paciente.'}

Use a ferramenta analyze_body para retornar os dados estruturados.
Responda em português brasileiro.`;

    // Build user content with images
    const userContent: any[] = [{ type: "text", text: "Analise as fotos corporais deste paciente:" }];
    
    if (front_image_url) userContent.push({ type: "image_url", image_url: { url: front_image_url } });
    if (side_image_url) userContent.push({ type: "image_url", image_url: { url: side_image_url } });
    if (back_image_url) userContent.push({ type: "image_url", image_url: { url: back_image_url } });

    if (userContent.length === 1) {
      // No images, just do text-based analysis
      userContent[0].text = "Não há imagens disponíveis. Faça uma avaliação geral baseada nos dados disponíveis.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_body",
            description: "Return structured body composition analysis",
            parameters: {
              type: "object",
              properties: {
                body_fat_estimate: { type: "number", description: "Estimated body fat %" },
                muscle_definition: { type: "integer", description: "Muscle definition score 1-10" },
                body_type: { type: "string", enum: ["ectomorfo", "mesomorfo", "endomorfo", "ecto-mesomorfo", "endo-mesomorfo"] },
                fat_distribution: { type: "object", properties: {
                  pattern: { type: "string" },
                  areas: { type: "array", items: { type: "string" } },
                }},
                summary: { type: "string", description: "Detailed analysis summary in Portuguese" },
                recommendations: { type: "array", items: { type: "string" }, description: "Actionable recommendations in Portuguese" },
                progress_highlights: { type: "string", description: "Comparison with previous analysis if available" },
              },
              required: ["body_fat_estimate", "muscle_definition", "body_type", "fat_distribution", "summary", "recommendations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_body" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error: " + response.status);
    }

    const aiResp = await response.json();
    const toolCall = aiResp.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Update DB record
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("body_analyses").update({
      body_fat_estimate: analysis.body_fat_estimate,
      muscle_definition: analysis.muscle_definition,
      body_type: analysis.body_type,
      fat_distribution: analysis.fat_distribution,
      ai_analysis: { summary: analysis.summary, recommendations: analysis.recommendations },
      progress_comparison: analysis.progress_highlights ? { highlights: analysis.progress_highlights } : null,
    }).eq("id", analysis_id);

    if (error) throw error;

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-body error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
