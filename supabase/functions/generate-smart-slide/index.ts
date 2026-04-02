import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isLLMEnabled, llmBlockedResponse } from "../_shared/llm-gate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THEME_DESCRIPTIONS: Record<string, string> = {
  neon_green: "Futurista verde neon com glow sutil, fundo escuro tecnológico, partículas energéticas",
  holographic: "Holográfico clínico com tons de azul e ciano, efeitos prisma, transparências",
  metabolic_energy: "Energia metabólica com gradientes laranja/vermelho, chamas estilizadas, calor",
  body_transformation: "Corpo em transformação com silhuetas, before/after estilizado, evolução",
  tech_dashboard: "Dashboard tecnológico com grids, dados flutuantes, interface sci-fi",
  journey_evolution: "Jornada evolutiva com caminho ascendente, fases, marcos luminosos",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  inspirational: "Tom inspirador e aspiracional, como um TED Talk motivacional",
  scientific: "Tom científico e baseado em evidências, profissional e credível",
  commercial: "Tom comercial e persuasivo, focado em conversão e valor",
  motivational: "Tom motivacional direto, frases curtas e impactantes, energia alta",
  premium: "Tom premium sofisticado, exclusividade, linguagem elegante e minimalista",
};

const GRADIENT_MAP: Record<string, string> = {
  neon_green: "from-emerald-500 to-teal-600",
  holographic: "from-cyan-400 to-blue-600",
  metabolic_energy: "from-orange-500 to-red-600",
  body_transformation: "from-violet-500 to-purple-600",
  tech_dashboard: "from-slate-400 to-indigo-600",
  journey_evolution: "from-amber-400 to-emerald-600",
};

const EMOJI_MAP: Record<string, string> = {
  feature: "🚀",
  clinical_benefit: "💚",
  motivational: "🔥",
  gamification: "🏆",
  body_projection: "🧬",
  clinical_result: "📊",
  educational: "🧠",
  instagram: "📱",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // LLM Gate — admin control
    if (!(await isLLMEnabled())) return llmBlockedResponse(corsHeaders);

    const { slide_type, theme, tone, custom_context } = await req.json();

    // Gather real system data for context
    let systemContext = "";
    try {
      const { count: patientCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { data: recentCheckins } = await supabase.from("checkins").select("id").limit(100);
      const { count: activeAlerts } = await supabase.from("clinical_alerts").select("*", { count: "exact", head: true }).eq("is_active", true);

      systemContext = `
DADOS REAIS DO SISTEMA (use para enriquecer o conteúdo quando relevante):
- Pacientes cadastrados: ${patientCount || 0}
- Check-ins recentes: ${recentCheckins?.length || 0}
- Alertas clínicos ativos: ${activeAlerts || 0}`;
    } catch { /* ignore data fetch errors */ }

    const themeDesc = THEME_DESCRIPTIONS[theme] || THEME_DESCRIPTIONS.neon_green;
    const toneInst = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.inspirational;

    const prompt = `Você é um diretor criativo especializado em apresentações cinematográficas para plataformas de saúde premium.

PLATAFORMA: FitJourney — sistema clínico inteligente para nutricionistas
ESTILO VISUAL: ${themeDesc}
TOM: ${toneInst}
TIPO DE SLIDE: ${slide_type}
${custom_context ? `CONTEXTO ADICIONAL: ${custom_context}` : ""}
${systemContext}

Gere um slide cinematográfico em JSON PURO (sem markdown):

{
  "title": "título impactante (max 8 palavras, emocional e direto)",
  "subtitle": "subtítulo clínico-tecnológico (max 20 palavras)",
  "bullets": ["benefício 1", "benefício 2", "benefício 3", "benefício 4"],
  "cta_text": "call-to-action emocional (max 6 palavras)",
  "icon_suggestion": "nome do ícone Lucide React mais adequado (ex: Brain, Heart, Zap, Target)",
  "animation_suggestion": "tipo de animação sugerida (ex: fade-scale, slide-up-stagger, glow-pulse)",
  "soundtrack_suggestion": "tipo de trilha ambiente sugerida (ex: ambient-tech, cinematic-hope, minimal-pulse)",
  "emoji": "emoji representativo único"
}

REGRAS:
- Título deve causar impacto emocional imediato
- Bullets devem ser benefícios concretos e mensuráveis
- CTA deve criar urgência ou desejo
- Ícone deve ser um nome válido do Lucide React
- Responda APENAS o JSON`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "";
    const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const generated = JSON.parse(jsonStr);

    // Enrich with theme-specific data
    const result = {
      ...generated,
      gradient: GRADIENT_MAP[theme] || GRADIENT_MAP.neon_green,
      emoji: generated.emoji || EMOJI_MAP[slide_type] || "✨",
      slide_type,
      theme,
      tone,
      target_audience: slide_type === "instagram" ? "both" : (slide_type === "clinical_benefit" || slide_type === "motivational" ? "patient" : "professional"),
    };

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
