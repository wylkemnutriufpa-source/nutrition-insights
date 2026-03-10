import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { patientData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Você é um assistente clínico de nutrição especializado em suporte à decisão. Analise os dados do paciente abaixo e gere uma análise clínica completa.

DADOS DO PACIENTE:
- Nome: ${patientData.name}
- Anamnese: ${JSON.stringify(patientData.anamnesis || "Não preenchida")}
- Métricas de adesão:
  - Checklist: ${patientData.metrics.checklistAdherence}%
  - Plano alimentar: ${patientData.metrics.mealPlanAdherence}%
  - Dias desde último check-in: ${patientData.metrics.daysSinceLastCheckin}
  - Total de check-ins: ${patientData.metrics.totalCheckins}
- Histórico de peso: ${JSON.stringify(patientData.metrics.weightHistory)}
- Dificuldades relatadas: ${JSON.stringify(patientData.metrics.difficulties)}
- Feedbacks recentes: ${JSON.stringify(patientData.metrics.recentFeedbacks)}
- Dados corporais: ${JSON.stringify(patientData.bodyData || "Sem avaliação")}
- Protocolos ativos: ${patientData.activeProtocolCount}
- Protocolos disponíveis do profissional: ${JSON.stringify(patientData.availableProtocols)}

Gere uma resposta em JSON com exatamente esta estrutura (sem markdown, apenas JSON puro):
{
  "clinicalAnalysis": "Texto descritivo de 3-5 parágrafos analisando a situação clínica do paciente, padrões de comportamento, riscos e pontos positivos.",
  "suggestedAdjustments": [
    "Sugestão 1 específica e acionável",
    "Sugestão 2 específica e acionável",
    "..."
  ],
  "recommendedProtocols": [
    { "title": "Nome do protocolo disponível", "reason": "Por que este protocolo é indicado" }
  ],
  "alerts": [
    { "type": "abandonment|stagnation|low_adherence", "message": "Descrição do alerta", "severity": "high|medium|low" }
  ]
}

Regras:
- recommendedProtocols deve conter APENAS protocolos que existem na lista de protocolos disponíveis do profissional
- Se não houver protocolos disponíveis adequados, retorne array vazio
- Sugira entre 3-6 ajustes concretos e práticos
- Gere entre 0-3 alertas relevantes
- A análise clínica deve ser em português brasileiro, profissional e baseada em evidências
- Retorne APENAS o JSON, sem código markdown`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um assistente clínico de nutrição. Responda APENAS em JSON válido, sem markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI gateway error: ${response.status} - ${errText}`);
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content || "";

    // Clean markdown wrapping if any
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Clinical decision support error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
