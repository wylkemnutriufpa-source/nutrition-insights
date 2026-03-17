import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { feature_id } = await req.json();
    if (!feature_id) throw new Error("feature_id required");

    // Get the feature
    const { data: feature, error: fErr } = await supabase
      .from("feature_registry")
      .select("*")
      .eq("id", feature_id)
      .single();
    if (fErr || !feature) throw new Error("Feature not found");

    const prompt = `Você é um especialista em marketing digital para plataformas de saúde e nutrição.
A plataforma FitJourney é um sistema clínico inteligente para nutricionistas, com estilo visual futurista, neon verde, premium.

Dado o recurso abaixo, gere conteúdo de marketing em formato JSON PURO (sem markdown):

RECURSO:
- Nome: ${feature.name}
- Descrição: ${feature.short_description}
- Público: ${feature.target_audience}
- Categoria: ${feature.category}
- Impacto emocional: ${feature.emotional_impact}
- Fase da jornada: ${feature.journey_phase}
- Bullets: ${JSON.stringify(feature.bullets)}
- É premium: ${feature.is_premium}

Gere um JSON com esta estrutura exata:
{
  "slide_internal": {
    "headline": "título curto impactante (max 8 palavras)",
    "subtitle": "subtítulo clínico-tecnológico (max 15 palavras)",
    "bullets": ["benefício 1", "benefício 2", "benefício 3", "benefício 4"],
    "cta": "texto do call-to-action",
    "badge": "NOVO RECURSO" ou "PREMIUM" ou null
  },
  "post_instagram": {
    "headline": "frase emocional aspiracional (max 10 palavras)",
    "subtitle": "benefício prático (max 12 palavras)",
    "bullets": ["ponto 1", "ponto 2", "ponto 3", "ponto 4"],
    "closing_phrase": "frase motivacional final",
    "cta": "call-to-action implícito"
  },
  "caption": "legenda completa para Instagram com emojis e hashtags relevantes (max 300 caracteres)",
  "image_prompt": "prompt em inglês para gerar imagem 1080x1080 no estilo futurista neon verde com tema do recurso"
}

Responda APENAS o JSON, sem explicações.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const generated = JSON.parse(jsonStr);

    // Upsert into feature_marketing_assets
    const { error: upsertErr } = await supabase
      .from("feature_marketing_assets")
      .upsert({
        feature_id,
        slide_data: generated.slide_internal || {},
        post_instagram_data: generated.post_instagram || {},
        post_image_prompt: generated.image_prompt || "",
        caption: generated.caption || "",
        status: "draft",
        updated_at: new Date().toISOString(),
      }, { onConflict: "feature_id" });

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true, data: generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
