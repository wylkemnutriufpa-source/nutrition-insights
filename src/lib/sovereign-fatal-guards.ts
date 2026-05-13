import { SovereignTelemetry } from "./sovereignTelemetry";

/**
 * FitJourney — Sovereign Fatal Guards
 * 
 * Centraliza o bloqueio de funções legadas ou comportamentos proibidos.
 */

export const SovereignFatalGuard = {
  /**
   * Bloqueia o uso de normalização legada (heurística textual).
   */
  blockLegacyNormalization: async (source: string, detail: string) => {
    return SovereignTelemetry.abort({
      runtime_source: source,
      event_type: 'legacy_detected',
      severity: 'critical',
      message: `BLOQUEIO SOBERANO: Uso de normalização legada proibido: ${detail}`,
      metadata: { classification: 'LEGADO/ZUMBI' }
    });
  },

  /**
   * Bloqueia recálculo manual de macros fora do core soberano.
   */
  blockManualRecalculation: async (source: string, detail: string) => {
    return SovereignTelemetry.abort({
      runtime_source: source,
      event_type: 'legacy_detected',
      severity: 'critical',
      message: `BLOQUEIO SOBERANO: Recálculo manual de macros proibido: ${detail}`,
      metadata: { classification: 'RUNTIME NÃO SOBERANO' }
    });
  },

  /**
   * Bloqueia o uso de Regex para mutação de dados clínicos.
   */
  blockRegexMutation: async (source: string, detail: string) => {
    return SovereignTelemetry.abort({
      runtime_source: source,
      event_type: 'legacy_detected',
      severity: 'critical',
      message: `BLOQUEIO SOBERANO: Mutação via Regex proibida: ${detail}`,
      metadata: { classification: 'MUTADOR SILENCIOSO' }
    });
  },

  /**
   * Bloqueia inferência de gramagem baseada em heurísticas.
   */
  blockInference: async (source: string, detail: string) => {
    return SovereignTelemetry.abort({
      runtime_source: source,
      event_type: 'inference_blocked',
      severity: 'critical',
      message: `BLOQUEIO SOBERANO: Inferência clínica proibida: ${detail}`,
      metadata: { classification: 'RISCO OPERACIONAL' }
    });
  }
};
