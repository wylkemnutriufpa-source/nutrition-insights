
/**
 * GUARDA SOBERANO V3
 * Impede que qualquer lógica de reconstrução ou 'inteligência' de runtime seja executada no Patient App.
 */
export const sovereignGuard = {
  /**
   * Valida se o plano é uma fonte de verdade pura (Sovereign Snapshot).
   * Se detectar inconsistências ou necessidade de processamento posterior, o sistema trava.
   */
  validate(plan: any) {
    if (!plan) return;

    const isV3 = plan.editor_version === 'v3' || (plan.snapshot && plan.snapshot.snapshot_version === 'v3');
    
    if (isV3) {
      console.log("[SovereignGuard] Validando integridade V3...");
      
      // 1. Proibir falta de snapshot
      if (!plan.snapshot) {
        throw new Error("[SovereignGuard] VIOLAÇÃO DE CONTRATO: Plano V3 sem snapshot soberano.");
      }

      // 2. Proibir imagens ausentes (devem vir do compiler)
      plan.meals?.forEach((meal: any) => {
        meal.items?.forEach((item: any) => {
          if (!item.imageUrl) {
            console.warn(`[SovereignGuard] Item sem imagem no snapshot: ${item.name}. O Compiler falhou?`);
          }
        });
      });

      // 3. Proibir cálculos de macros no runtime
      // Verificamos se os valores são números e não 'processáveis'
      if (typeof plan.meta_calorias !== 'number') {
        throw new Error("[SovereignGuard] VIOLAÇÃO: Macros não são estáticos.");
      }

      console.log("[SovereignGuard] Integridade Confirmada. Modo: Leitura Passiva.");
    }
  },

  /**
   * Garante que não existem hooks de 'hydration' ou 'normalization' registrados.
   */
  auditRuntime() {
    const forbidden = ['hydrateItem', 'normalizeMealPlan', 'dedupeGroups', 'calculatePrimaryTotals'];
    forbidden.forEach(fn => {
      if ((window as any)[fn]) {
        throw new Error(`[SovereignGuard] ENGINE PARALELA DETECTADA: ${fn} não deve existir no runtime.`);
      }
    });
  }
};
