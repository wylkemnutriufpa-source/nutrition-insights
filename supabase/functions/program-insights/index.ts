import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { patient_name, current_phase, weight_history, waist_history, adherence_history, habits_data, anamnesis_summary } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente de IA especializado em nutrição e transformação corporal feminina, integrado ao programa "Projeto Biquíni Branco".

Seu papel é analisar os dados de progresso da paciente e gerar insights clínicos personalizados.

Responda SEMPRE em português brasileiro. Seja objetivo e profissional.`;

    const userPrompt = `Analise os dados da paciente "${patient_name}" no Projeto Biquíni Branco:

Fase atual: ${current_phase}
Histórico de peso (últimas semanas): ${JSON.stringify(weight_history || [])}
Histórico de cintura (cm): ${JSON.stringify(waist_history || [])}
Histórico de adesão (%): ${JSON.stringify(adherence_history || [])}
Hábitos completados: ${JSON.stringify(habits_data || {})}
Resumo da anamnese: ${anamnesis_summary || "Não disponível"}

Gere um JSON com a seguinte estrutura:
{
  "overall_status": "on_track" | "attention" | "at_risk",
  "status_label": "No caminho certo" | "Precisa de atenção" | "Risco de estagnação",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "phase_advice": "conselho específico para a fase atual",
  "motivation_message": "mensagem motivacional personalizada"
}`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "program_insights",
            description: "Return structured insights for the patient's program progress",
            parameters: {
              type: "object",
              properties: {
                overall_status: { type: "string", enum: ["on_track", "attention", "at_risk"] },
                status_label: { type: "string" },
                insights: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                phase_advice: { type: "string" },
                motivation_message: { type: "string" },
              },
              required: ["overall_status", "status_label", "insights", "recommendations", "phase_advice", "motivation_message"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "program_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      result = {
        overall_status: "attention",
        status_label: "Dados insuficientes",
        insights: ["Registre mais dados para insights personalizados"],
        recommendations: ["Continue seguindo o plano alimentar"],
        phase_advice: "Mantenha a consistência",
        motivation_message: "Cada dia é uma nova oportunidade! 💪",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("program-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
