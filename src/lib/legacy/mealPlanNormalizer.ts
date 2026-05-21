// 🛡️ LEGADO V1/V2 - NÃO UTILIZAR PARA V3
// Este arquivo está mantido apenas para compatibilidade com planos antigos.
// Planos V3 são auto-suficientes e determinísticos desde o Editor.

export function normalizeMealPlan(rawData: any): any {
  if (rawData?.snapshot?.snapshot_version === 'v3') return rawData;
  
  // 🛡️ REPARAÇÃO LEGADA: Se não é V3, extraímos os itens do formato antigo
  // para garantir que pacientes com planos V1/V2 não vejam telas vazias.
  const meals = rawData?.meal_plan_items || rawData?.items || [];
  
  return { 
    ...rawData,
    id: rawData?.id || 'legacy', 
    editor_version: rawData?.editor_version || 'v2',
    meals: meals 
  };
}
