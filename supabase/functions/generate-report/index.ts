import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { patient_id, report_type, nutritionist_id } = await req.json();
    if (!patient_id || !nutritionist_id) throw new Error("patient_id and nutritionist_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch patient data
    const [profileRes, anamnesisRes, assessmentsRes, mealsRes, mealPlansRes, bodyRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", patient_id).single(),
      supabase.from("patient_anamnesis").select("*").eq("user_id", patient_id).order("created_at", { ascending: false }).limit(1),
      supabase.from("physical_assessments").select("*").eq("patient_id", patient_id).order("assessment_date", { ascending: false }).limit(5),
      supabase.from("meals").select("*").eq("user_id", patient_id).order("logged_at", { ascending: false }).limit(30),
      supabase.from("meal_plans").select("*, meal_plan_items(*)").eq("patient_id", patient_id).eq("is_active", true).limit(1),
      supabase.from("body_analyses").select("*").eq("patient_id", patient_id).order("analysis_date", { ascending: false }).limit(3),
    ]);

    const profile = profileRes.data;
    const anamnesis = anamnesisRes.data?.[0];
    const assessments = assessmentsRes.data || [];
    const meals = mealsRes.data || [];
    const mealPlan = mealPlansRes.data?.[0];
    const bodyAnalyses = bodyRes.data || [];

    // Generate AI summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiSummary = "";

    if (LOVABLE_API_KEY) {
      const summaryPrompt = `Gere um resumo executivo para o relatório do paciente ${profile?.full_name || ""}:
- Avaliações físicas: ${assessments.length} registros. Último peso: ${assessments[0]?.weight || 'N/A'}kg, IMC: ${assessments[0]?.bmi || 'N/A'}
- Refeições registradas: ${meals.length} nos últimos 30 dias
- Plano alimentar ativo: ${mealPlan ? 'Sim' : 'Não'}
- Análises corporais: ${bodyAnalyses.length}
Faça um resumo profissional em português com destaques e recomendações.`;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Você é um nutricionista criando relatórios profissionais. Responda em português." },
              { role: "user", content: summaryPrompt },
            ],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          aiSummary = aiData.choices?.[0]?.message?.content || "";
        }
      } catch { /* AI optional */ }
    }

    // Build HTML report
    const latestAssessment = assessments[0];
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório - ${profile?.full_name || 'Paciente'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 24px; color: #10b981; }
  .header p { color: #666; font-size: 14px; margin-top: 4px; }
  .section { margin-bottom: 30px; }
  .section h2 { font-size: 18px; color: #10b981; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .metric { background: #f0fdf4; padding: 12px; border-radius: 8px; }
  .metric .label { font-size: 12px; color: #666; }
  .metric .value { font-size: 20px; font-weight: bold; color: #1a1a2e; }
  .summary { background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; line-height: 1.6; font-size: 14px; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f0fdf4; font-weight: 600; }
  .footer { text-align: center; color: #999; font-size: 11px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <h1>📊 Relatório Nutricional</h1>
  <p><strong>${profile?.full_name || 'Paciente'}</strong> — Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
</div>

${aiSummary ? `<div class="section"><h2>📋 Resumo Executivo</h2><div class="summary">${aiSummary}</div></div>` : ''}

${latestAssessment ? `<div class="section">
  <h2>📐 Última Avaliação Física</h2>
  <p style="font-size:12px;color:#666;margin-bottom:10px;">Data: ${new Date(latestAssessment.assessment_date).toLocaleDateString('pt-BR')}</p>
  <div class="grid">
    ${latestAssessment.weight ? `<div class="metric"><div class="label">Peso</div><div class="value">${latestAssessment.weight} kg</div></div>` : ''}
    ${latestAssessment.height ? `<div class="metric"><div class="label">Altura</div><div class="value">${latestAssessment.height} cm</div></div>` : ''}
    ${latestAssessment.bmi ? `<div class="metric"><div class="label">IMC</div><div class="value">${latestAssessment.bmi}</div></div>` : ''}
    ${latestAssessment.body_fat_percentage ? `<div class="metric"><div class="label">% Gordura</div><div class="value">${latestAssessment.body_fat_percentage}%</div></div>` : ''}
    ${latestAssessment.lean_mass ? `<div class="metric"><div class="label">Massa Magra</div><div class="value">${latestAssessment.lean_mass} kg</div></div>` : ''}
    ${latestAssessment.fat_mass ? `<div class="metric"><div class="label">Massa Gorda</div><div class="value">${latestAssessment.fat_mass} kg</div></div>` : ''}
  </div>
</div>` : ''}

${assessments.length > 1 ? `<div class="section">
  <h2>📈 Evolução</h2>
  <table>
    <tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th></tr>
    ${assessments.map(a => `<tr><td>${new Date(a.assessment_date).toLocaleDateString('pt-BR')}</td><td>${a.weight || '-'} kg</td><td>${a.bmi || '-'}</td><td>${a.body_fat_percentage || '-'}%</td></tr>`).join('')}
  </table>
</div>` : ''}

${mealPlan ? `<div class="section">
  <h2>🍽️ Plano Alimentar Ativo</h2>
  <p style="margin-bottom:10px;"><strong>${mealPlan.title}</strong>${mealPlan.description ? ` — ${mealPlan.description}` : ''}</p>
  ${mealPlan.meal_plan_items?.length ? `<table>
    <tr><th>Refeição</th><th>Descrição</th><th>Kcal</th><th>Prot</th></tr>
    ${mealPlan.meal_plan_items.map((item: any) => `<tr><td>${item.title}</td><td>${item.description || '-'}</td><td>${item.calories_target || '-'}</td><td>${item.protein_target || '-'}g</td></tr>`).join('')}
  </table>` : ''}
</div>` : ''}

<div class="section">
  <h2>🍎 Refeições Recentes (${meals.length})</h2>
  ${meals.length > 0 ? `
  <p style="font-size:13px;color:#666;margin-bottom:10px;">Últimas ${Math.min(meals.length, 10)} refeições registradas</p>
  <table>
    <tr><th>Data</th><th>Refeição</th><th>Kcal</th><th>Score IA</th></tr>
    ${meals.slice(0, 10).map(m => `<tr><td>${new Date(m.logged_at).toLocaleDateString('pt-BR')}</td><td>${m.title}</td><td>${m.calories || '-'}</td><td>${m.ai_score ? m.ai_score + '/100' : '-'}</td></tr>`).join('')}
  </table>` : '<p style="color:#666;">Nenhuma refeição registrada.</p>'}
</div>

<div class="footer">
  <p>Relatório gerado automaticamente pelo NutriTrack • ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
  <p>Este documento é confidencial e destinado exclusivamente ao profissional e paciente envolvidos.</p>
</div>
</body>
</html>`;

    return new Response(JSON.stringify({ html, patient_name: profile?.full_name || "Paciente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
