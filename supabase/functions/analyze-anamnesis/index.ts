import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { anamnesis_id } = await req.json();
    if (!anamnesis_id) {
      return new Response(JSON.stringify({ error: "anamnesis_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch anamnesis
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: anamnesis, error: fetchErr } = await serviceClient
      .from("patient_anamnesis")
      .select("*")
      .eq("id", anamnesis_id)
      .single();

    if (fetchErr || !anamnesis) {
      return new Response(JSON.stringify({ error: "Anamnese não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answers = anamnesis.answers as Record<string, any>;

    // Build prompt for AI
    const prompt = `Você é um assistente de nutrição inteligente. Analise a anamnese de um paciente e gere uma leitura inteligente.

IMPORTANTE: Use linguagem de OBSERVAÇÃO e RECOMENDAÇÃO. NÃO use linguagem de diagnóstico médico. Seja empático e motivador.

Dados da anamnese:
- Objetivo: ${answers.goal || "não informado"}
- Sexo: ${answers.sex || "não informado"}
- Idade: ${answers.age || "não informada"}
- Peso: ${answers.weight || "não informado"} kg
- Altura: ${answers.height || "não informada"} cm
- TMB calculada: ${anamnesis.computed_tmb || "não calculada"} kcal
- Meta calórica: ${anamnesis.computed_kcal_target || "não calculada"} kcal
- Nível de atividade: ${answers.activity_level || "não informado"}
- Tipos de exercício: ${JSON.stringify(answers.exercise_type || [])}
- Hora de acordar: ${answers.wake_time || "não informado"}
- Hora de dormir: ${answers.sleep_time || "não informado"}
- Copos de água/dia: ${answers.water_intake || "não informado"}
- Restrições: ${JSON.stringify(answers.restrictions || [])}
- Alergias: ${JSON.stringify(answers.allergies || [])}
- Condições de saúde: ${JSON.stringify(answers.health_conditions || [])}
- Preferência culinária: ${answers.cooking_preference || "não informado"}
- Orçamento: ${answers.budget || "não informado"}
- Refeições/dia: ${answers.meals_per_day || "não informado"}
- Alimentos que não gosta: ${answers.disliked_foods || "nenhum"}
- Alimentos favoritos: ${answers.favorite_foods || "nenhum"}
- Como se sente com alimentação: ${answers.feeling || "não informado"}
- Motivação: ${answers.motivation || "não informado"}
- Nível de energia: ${answers.energy_level || "não informado"}
- Qualidade do sono: ${answers.sleep_quality || "não informado"}
- Digestão: ${answers.digestion || "não informado"}
- Fome/compulsão: ${answers.hunger_compulsion || "não informado"}
- Sintomas: ${JSON.stringify(answers.symptoms || [])}
- Histórico clínico: ${answers.clinical_history || "nenhum"}
- Medicamentos: ${answers.medications || "nenhum"}
- Limitações físicas: ${answers.physical_limitations || "nenhuma"}
- Gestação/pós-parto: ${answers.pregnancy_status || "não se aplica"}

Retorne EXATAMENTE um JSON com esta estrutura (sem markdown, apenas JSON puro):`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista inteligente que analisa dados de anamnese. Responda APENAS com JSON válido, sem markdown. Use linguagem de observação, não de diagnóstico médico."
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_anamnesis",
              description: "Analisa anamnese do paciente e retorna insights estruturados",
              parameters: {
                type: "object",
                properties: {
                  risk_level: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Nível de atenção nutricional necessário"
                  },
                  primary_goal: {
                    type: "string",
                    description: "Objetivo principal traduzido em linguagem clara (ex: 'Redução de gordura corporal com ganho de energia')"
                  },
                  metabolic_profile: {
                    type: "string",
                    description: "Breve perfil metabólico observacional (2-3 frases)"
                  },
                  main_pains: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 principais dores/desafios observados"
                  },
                  nutrition_focus: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 focos nutricionais prioritários"
                  },
                  behavior_focus: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 focos comportamentais"
                  },
                  movement_focus: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 recomendações de movimento"
                  },
                  suggested_protocol: {
                    type: "string",
                    description: "Nome sugerido para o protocolo inicial (ex: 'Protocolo Emagrecimento Gradual 12 semanas')"
                  },
                  personalized_tips: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tip: { type: "string" },
                        category: { type: "string", enum: ["nutrition", "hydration", "sleep", "exercise", "motivation", "planning"] },
                        icon: { type: "string" }
                      },
                      required: ["tip", "category", "icon"]
                    },
                    description: "5-8 dicas personalizadas com emoji"
                  },
                  ai_summary: {
                    type: "string",
                    description: "Resumo geral em 3-5 frases, empático e motivador"
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["nutrition", "exercise", "sleep", "hydration", "behavior", "supplement"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        icon: { type: "string" }
                      },
                      required: ["category", "title", "description", "priority", "icon"]
                    },
                    description: "5-10 recomendações acionáveis"
                  }
                },
                required: ["risk_level", "primary_goal", "metabolic_profile", "main_pains", "nutrition_focus", "behavior_focus", "movement_focus", "suggested_protocol", "personalized_tips", "ai_summary", "recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_anamnesis" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();

    // Extract tool call result
    let insights: any;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      insights = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content directly
      const content = aiData.choices?.[0]?.message?.content || "{}";
      insights = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    }

    // Save AI insights
    const { data: insightRow, error: insightErr } = await serviceClient
      .from("anamnesis_ai_insights")
      .insert({
        user_id: anamnesis.user_id,
        anamnesis_id,
        risk_level: insights.risk_level || "low",
        primary_goal: insights.primary_goal || "",
        metabolic_profile: insights.metabolic_profile || "",
        main_pains: insights.main_pains || [],
        nutrition_focus: insights.nutrition_focus || [],
        behavior_focus: insights.behavior_focus || [],
        movement_focus: insights.movement_focus || [],
        suggested_protocol: insights.suggested_protocol || "",
        personalized_tips: insights.personalized_tips || [],
        ai_summary: insights.ai_summary || "",
        raw_response: aiData,
      })
      .select()
      .single();

    if (insightErr) {
      console.error("Insert insight error:", insightErr);
      throw insightErr;
    }

    // Save recommendations
    const recommendations = (insights.recommendations || []).map((rec: any) => ({
      user_id: anamnesis.user_id,
      insight_id: insightRow.id,
      category: rec.category,
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
      icon: rec.icon,
    }));

    if (recommendations.length > 0) {
      await serviceClient.from("patient_recommendations").insert(recommendations);
    }

    // Save personalized tips to patient_tips
    const tips = (insights.personalized_tips || []).map((t: any) => ({
      user_id: anamnesis.user_id,
      tip: t.tip,
      category: t.category,
      icon: t.icon,
    }));
    
    // Clear old tips and insert new
    await serviceClient.from("patient_tips").delete().eq("user_id", anamnesis.user_id);
    if (tips.length > 0) {
      await serviceClient.from("patient_tips").insert(tips);
    }

    // Add timeline events
    const timelineEvents = [
      {
        patient_id: anamnesis.user_id,
        event_type: "achievement",
        title: "Anamnese Inteligente Concluída",
        description: `Nível de atenção: ${insights.risk_level === "high" ? "Alto" : insights.risk_level === "medium" ? "Médio" : "Baixo"} • Objetivo: ${insights.primary_goal}`,
        metadata: { type: "anamnesis_completed", risk_level: insights.risk_level },
        created_by: anamnesis.user_id,
      },
      {
        patient_id: anamnesis.user_id,
        event_type: "protocol",
        title: "Protocolo Sugerido pela IA",
        description: insights.suggested_protocol,
        metadata: { type: "suggested_protocol_created" },
        created_by: anamnesis.user_id,
      },
      {
        patient_id: anamnesis.user_id,
        event_type: "note",
        title: "Dicas Personalizadas Geradas",
        description: `${tips.length} dicas criadas com base na anamnese`,
        metadata: { type: "personalized_tip_created", count: tips.length },
        created_by: anamnesis.user_id,
      },
    ];

    await serviceClient.from("patient_timeline").insert(timelineEvents);

    return new Response(
      JSON.stringify({
        success: true,
        insight_id: insightRow.id,
        risk_level: insights.risk_level,
        tips_count: tips.length,
        recommendations_count: recommendations.length,
        summary: insights.ai_summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-anamnesis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
