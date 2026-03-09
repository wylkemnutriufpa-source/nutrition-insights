import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { patients } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Você é um assistente clínico de nutrição. Analise os dados dos pacientes abaixo e gere insights clínicos acionáveis.

DADOS DOS PACIENTES:
${JSON.stringify(patients, null, 2)}

Gere insights em formato JSON com a estrutura abaixo. Retorne SOMENTE o JSON, sem markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a clinical nutrition AI assistant. Always respond in Brazilian Portuguese. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_clinical_insights",
            description: "Generate clinical insights about patient data",
            parameters: {
              type: "object",
              properties: {
                attention_needed: {
                  type: "array",
                  description: "Patients that need attention today",
                  items: {
                    type: "object",
                    properties: {
                      patient_id: { type: "string" },
                      patient_name: { type: "string" },
                      reason: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      action_suggested: { type: "string" }
                    },
                    required: ["patient_id", "patient_name", "reason", "priority"],
                    additionalProperties: false
                  }
                },
                insights: {
                  type: "array",
                  description: "General clinical insights about the patient base",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string", enum: ["sleep", "metabolism", "nutrition", "adherence", "risk", "progress"] },
                      affected_count: { type: "number" },
                      severity: { type: "string", enum: ["info", "warning", "critical"] }
                    },
                    required: ["title", "description", "category", "severity"],
                    additionalProperties: false
                  }
                },
                summary: {
                  type: "object",
                  properties: {
                    total_analyzed: { type: "number" },
                    high_risk_count: { type: "number" },
                    avg_adherence_estimate: { type: "number" },
                    top_concern: { type: "string" }
                  },
                  required: ["total_analyzed", "high_risk_count", "top_concern"],
                  additionalProperties: false
                }
              },
              required: ["attention_needed", "insights", "summary"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_clinical_insights" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    let insights;
    if (toolCall?.function?.arguments) {
      insights = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = result.choices?.[0]?.message?.content || "{}";
      insights = JSON.parse(content);
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("clinical-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
