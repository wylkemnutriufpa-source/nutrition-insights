import { SovereignTelemetry } from "./sovereignTelemetry";

/**
 * FitJourney — Sovereign Audit Scanner
 * 
 * Executa varredura de runtime para detectar contaminações legadas.
 */

export const SovereignAuditScanner = {
  /**
   * Varre o estado atual do plano em busca de inconsistências.
   */
  scanPlanIntegrity: async (plan: any) => {
    const correlation_id = `audit_${crypto.randomUUID().substring(0, 8)}`;
    console.log(`[AUDIT] Iniciando varredura de integridade do plano (ID: ${plan.id})`);

    const incidents: string[] = [];

    // 1. Verificar se há itens sem clinical_mass_g
    plan.meals?.forEach((meal: any) => {
      meal.items?.forEach((item: any) => {
        if (item.clinical_mass_g === undefined || item.clinical_mass_g === null) {
          incidents.push(`Item ${item.name} sem clinical_mass_g (Soberania violada)`);
        }
        if (!item.instanceId) {
          incidents.push(`Item ${item.name} sem instanceId (Rastreabilidade perdida)`);
        }
        // Verificar se macros batem (recalculo local detectado se houver drift)
        // Isso é complexo de fazer aqui sem o motor, mas podemos checar se existem
        if (item.kcal === undefined || item.protein === undefined) {
          incidents.push(`Item ${item.name} sem macros no snapshot (Passive Consumer falhará)`);
        }
      });
    });

    if (incidents.length > 0) {
      await SovereignTelemetry.log({
        runtime_source: 'audit_scanner',
        event_type: 'schema_violation',
        severity: 'warning',
        message: `Auditoria detectou ${incidents.length} incidentes de integridade.`,
        correlation_id,
        metadata: { incidents, plan_id: plan.id }
      });
    }

    return {
      ok: incidents.length === 0,
      incidents,
      correlation_id
    };
  },

  /**
   * Detecta se o runtime atual está usando fallbacks proibidos.
   */
  detectForbiddenFallbacks: () => {
    // Implementação de scan de memória ou estado global se necessário
    // Por enquanto, apenas um placeholder para expansão
    return true;
  }
};
