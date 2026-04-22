import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════
// DETERMINISTIC REPORT GENERATOR v1.0
// No AI calls — template-based executive summary
// ═══════════════════════════════════════════════════

function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Eutrófico";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidade I";
  if (bmi < 40) return "Obesidade II";
  return "Obesidade III";
}

function generateExecutiveSummary(
  profile: any,
  assessments: any[],
  meals: any[],
  mealPlan: any,
  bodyAnalyses: any[],
): string {
  const lines: string[] = [];
  const latest = assessments[0];

  lines.push(`Paciente: ${profile?.full_name || "N/A"}`);
  lines.push(`Data do relatório: ${new Date().toLocaleDateString("pt-BR")}\n`);

  // Assessment summary
  if (latest) {
    lines.push(`📐 Última avaliação (${new Date(latest.assessment_date).toLocaleDateString("pt-BR")}):`);
    if (latest.weight) lines.push(`  • Peso: ${latest.weight} kg`);
    if (latest.bmi) lines.push(`  • IMC: ${latest.bmi} — ${classifyBMI(latest.bmi)}`);
    if (latest.body_fat_percentage) lines.push(`  • Gordura corporal: ${latest.body_fat_percentage}%`);
  } else {
    lines.push("📐 Nenhuma avaliação física registrada.");
  }

  // Evolution
  if (assessments.length >= 2) {
    const first = assessments[assessments.length - 1];
    const last = assessments[0];
    if (first.weight && last.weight) {
      const diff = last.weight - first.weight;
      lines.push(`\n📈 Evolução de peso: ${first.weight}kg → ${last.weight}kg (${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg)`);
      if (diff < -1) lines.push("  ✅ Tendência de perda de peso observada.");
      else if (diff > 1) lines.push("  ⚠️ Ganho de peso no período.");
      else lines.push("  ➡️ Peso estável no período.");
    }
  }

  // Meals
  lines.push(`\n🍎 Refeições registradas: ${meals.length} (últimos 30 dias)`);
  if (meals.length >= 10) {
    lines.push("  ✅ Bom registro alimentar — dados suficientes para análise.");
  } else if (meals.length > 0) {
    lines.push("  ⚠️ Registro alimentar baixo — estimular adesão ao diário.");
  } else {
    lines.push("  🔴 Nenhuma refeição registrada — priorizar orientação de registro.");
  }

  // Meal plan
  if (mealPlan) {
    lines.push(`\n🍽️ Plano alimentar ativo: ${mealPlan.title}`);
    lines.push(`  • Itens no plano: ${mealPlan.meal_plan_items?.length || 0}`);
  } else {
    lines.push("\n🍽️ Sem plano alimentar ativo.");
  }

  // Body analyses
  if (bodyAnalyses.length > 0) {
    lines.push(`\n📊 Análises corporais realizadas: ${bodyAnalyses.length}`);
    const latestBody = bodyAnalyses[0];
    if (latestBody.body_fat_estimate) lines.push(`  • Última %GC estimada: ${latestBody.body_fat_estimate}%`);
    if (latestBody.body_type) lines.push(`  • Biotipo: ${latestBody.body_type}`);
  }

  // Clinical recommendation
  lines.push("\n── Recomendação Geral ──");
  const adherenceSignal = meals.length >= 15 ? "boa" : meals.length >= 5 ? "moderada" : "baixa";
  lines.push(`Adesão ao registro alimentar: ${adherenceSignal}.`);
  if (adherenceSignal === "baixa") {
    lines.push("Priorizar estratégias de engajamento e simplificação do plano.");
  } else if (adherenceSignal === "moderada") {
    lines.push("Continuar acompanhamento com ajustes pontuais conforme evolução.");
  } else {
    lines.push("Manter protocolo atual e reavaliar metas na próxima consulta.");
  }

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { patient_id, nutritionist_id } = await req.json();
    if (!patient_id || !nutritionist_id) throw new Error("patient_id and nutritionist_id required");

    if (user.id !== nutritionist_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify linkage
    const { data: linkage } = await supabase
      .from("nutritionist_patients")
      .select("id")
      .eq("nutritionist_id", nutritionist_id)
      .eq("patient_id", patient_id)
      .eq("status", "active")
      .maybeSingle();

    if (!linkage) {
      return new Response(JSON.stringify({ error: "Forbidden: patient not linked" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _function_name: "generate-report",
      _client_key: clientIP,
      _max_requests: 3,
      _window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    // Fetch data
    const [profileRes, assessmentsRes, mealsRes, mealPlansRes, bodyRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", patient_id).single(),
      supabase.from("physical_assessments").select("*").eq("patient_id", patient_id).order("assessment_date", { ascending: false }).limit(5),
      supabase.from("meals").select("*").eq("user_id", patient_id).order("logged_at", { ascending: false }).limit(30),
      supabase.from("meal_plans").select("*, meal_plan_items(*)").eq("patient_id", patient_id).eq("is_active", true).limit(1),
      supabase.from("body_analyses").select("*").eq("patient_id", patient_id).order("analysis_date", { ascending: false }).limit(3),
    ]);

    const profile = profileRes.data;
    const assessments = assessmentsRes.data || [];
    const meals = mealsRes.data || [];
    const mealPlan = mealPlansRes.data?.[0];
    const bodyAnalyses = bodyRes.data || [];

    // Fetch recipes for meal plan items
    const visualItemIds = mealPlan?.meal_plan_items?.map((i: any) => i.visual_library_item_id).filter(Boolean) || [];
    const mealPlanItemTitles = mealPlan?.meal_plan_items?.map((i: any) => i.title).filter(Boolean) || [];
    
    let recipesMap: Record<string, any> = {};
    
    if (visualItemIds.length > 0 || mealPlanItemTitles.length > 0) {
      // Fetch from visual library
      const { data: visualItems } = await supabase
        .from("meal_visual_library")
        .select("id, display_name, base_recipe")
        .in("id", visualItemIds);
      
      if (visualItems) {
        visualItems.forEach((item: any) => {
          if (item.base_recipe) recipesMap[item.id] = item.base_recipe;
        });
      }

      // Fetch from meal recipes (marmitas)
      const { data: mealRecipes } = await supabase
        .from("meal_recipes")
        .select("name, base_recipe")
        .in("name", mealPlanItemTitles.map(t => t.replace(/^🍱\s*/, '')));
      
      if (mealRecipes) {
        mealRecipes.forEach((r: any) => {
          if (r.base_recipe) {
            // Find which item uses this recipe name (considering emoji prefix)
            const item = mealPlan.meal_plan_items.find((i: any) => i.title.replace(/^🍱\s*/, '') === r.name);
            if (item) recipesMap[item.id] = r.base_recipe;
          }
        });
      }
    }

    // Deterministic summary (NO AI)
    const executiveSummary = generateExecutiveSummary(profile, assessments, meals, mealPlan, bodyAnalyses);

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

<div class="section"><h2>📋 Resumo Executivo</h2><div class="summary">${executiveSummary}</div></div>

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

${mealPlan && Object.keys(recipesMap).length > 0 ? `<div class="section">
  <h2>📖 Livro de Receitas</h2>
  <div style="display: flex; flex-direction: column; gap: 20px;">
    ${mealPlan.meal_plan_items
      .filter((item: any) => recipesMap[item.visual_library_item_id] || recipesMap[item.id])
      .map((item: any) => {
        const recipe = recipesMap[item.visual_library_item_id] || recipesMap[item.id];
        return `
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
          <h3 style="color: #10b981; margin-bottom: 10px;">${recipe.title || item.title}</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px;">
            <div>
              <p><strong>Ingredientes:</strong></p>
              <ul style="padding-left: 20px; margin-top: 5px;">
                ${(recipe.ingredients || []).map((ing: string) => `<li>${ing}</li>`).join('')}
              </ul>
            </div>
            <div>
              <p><strong>Modo de Preparo:</strong></p>
              <ol style="padding-left: 20px; margin-top: 5px;">
                ${(recipe.steps || []).map((step: string) => `<li>${step}</li>`).join('')}
              </ol>
            </div>
          </div>
          ${recipe.tips ? `<p style="margin-top: 10px; font-size: 12px; color: #666; font-style: italic;">💡 Dica: ${recipe.tips}</p>` : ''}
        </div>`;
      }).join('')}
  </div>
</div>` : ''}
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
    <tr><th>Data</th><th>Refeição</th><th>Kcal</th><th>Score</th></tr>
    ${meals.slice(0, 10).map(m => `<tr><td>${new Date(m.logged_at).toLocaleDateString('pt-BR')}</td><td>${m.title}</td><td>${m.calories || '-'}</td><td>${m.ai_score ? m.ai_score + '/100' : '-'}</td></tr>`).join('')}
  </table>` : '<p style="color:#666;">Nenhuma refeição registrada.</p>'}
</div>

<div class="footer">
  <p>Relatório gerado automaticamente pelo FitJourney • ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
  <p>Este documento é confidencial e destinado exclusivamente ao profissional e paciente envolvidos.</p>
</div>
</body>
</html>`;

    return new Response(JSON.stringify({ html, patient_name: profile?.full_name || "Paciente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
