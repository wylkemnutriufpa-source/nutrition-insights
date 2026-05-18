// 🛡️ LEGADO V1/V2 - NÃO UTILIZAR PARA V3
// Este arquivo está mantido apenas para compatibilidade com planos antigos.
// Planos V3 são auto-suficientes e determinísticos desde o Editor.

export function normalizeMealPlan(rawData: any): any {
  if (rawData?.snapshot?.snapshot_version === 'v3') return rawData;
  return { id: rawData?.id || 'legacy', meals: [] };
}
