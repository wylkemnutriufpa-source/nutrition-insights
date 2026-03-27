import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════
// DETERMINISTIC FEATURE MARKETING GENERATOR v1.0
// Replaces AI with parameterized templates
// ═══════════════════════════════════════════════════

function generateSlideData(feature: any) {
  const isPremium = feature.is_premium;
  const name = feature.name || "Novo Recurso";
  const desc = feature.short_description || "";
  const bullets = feature.bullets || [];

  return {
    headline: name.length > 40 ? name.substring(0, 37) + "..." : name,
    subtitle: desc.length > 80 ? desc.substring(0, 77) + "..." : desc,
    bullets: bullets.length > 0
      ? bullets.slice(0, 4)
      : [
          `${name} integrado ao seu fluxo`,
          "Resultados visíveis desde o primeiro uso",
          "Compatível com todos os planos",
          "Suporte e atualizações contínuas",
        ],
    cta: isPremium ? "Ativar Recurso Premium" : "Começar Agora",
    badge: isPremium ? "PREMIUM" : "NOVO RECURSO",
  };
}

function generateInstagramPost(feature: any) {
  const name = feature.name || "Novo Recurso";
  const audience = feature.target_audience || "profissionais de nutrição";
  const impact = feature.emotional_impact || "transformação";
  const bullets = feature.bullets || [];

  const emotionalHeadlines: Record<string, string> = {
    transformação: `Transforme sua prática com ${name}`,
    produtividade: `Multiplique seus resultados com ${name}`,
    confiança: `Mais segurança nas suas decisões clínicas`,
    inovação: `O futuro da nutrição chegou`,
    controle: `Controle total da sua carteira de pacientes`,
  };

  return {
    headline: emotionalHeadlines[impact] || `Conheça o ${name}`,
    subtitle: `Desenvolvido para ${audience}`,
    bullets: bullets.length > 0
      ? bullets.slice(0, 4)
      : [
          "Tecnologia de ponta",
          "Interface intuitiva",
          "Resultados mensuráveis",
          "Integração completa",
        ],
    closing_phrase: "O futuro da nutrição é inteligente. E começa agora.",
    cta: "Link na bio 🔗",
  };
}

function generateCaption(feature: any): string {
  const name = feature.name || "Novo Recurso";
  const desc = feature.short_description || "uma nova funcionalidade";
  const category = feature.category || "inovação";

  return `🚀 ${name} — ${desc}. Desenvolvido para elevar sua prática clínica ao próximo nível. 💚 #FitJourney #Nutrição #${category.replace(/\s+/g, "")} #HealthTech #NutriçãoInteligente`;
}

function generateImagePrompt(feature: any): string {
  const name = feature.name || "Feature";
  const category = feature.category || "health";
  return `Futuristic neon green health tech dashboard showing ${name}, ${category} theme, dark background, glowing UI elements, 1080x1080, premium SaaS style`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { feature_id } = await req.json();
    if (!feature_id) throw new Error("feature_id required");

    const { data: feature, error: fErr } = await supabase
      .from("feature_registry")
      .select("*")
      .eq("id", feature_id)
      .single();
    if (fErr || !feature) throw new Error("Feature not found");

    // Deterministic generation (NO AI)
    const generated = {
      slide_internal: generateSlideData(feature),
      post_instagram: generateInstagramPost(feature),
      caption: generateCaption(feature),
      image_prompt: generateImagePrompt(feature),
    };

    // Upsert
    const { error: upsertErr } = await supabase
      .from("feature_marketing_assets")
      .upsert({
        feature_id,
        slide_data: generated.slide_internal,
        post_instagram_data: generated.post_instagram,
        post_image_prompt: generated.image_prompt,
        caption: generated.caption,
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
