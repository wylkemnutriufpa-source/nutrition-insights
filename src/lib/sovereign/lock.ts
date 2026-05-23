import { assertNotLegacyCode, assertSnapshotIntegrity } from './invariantAssertions';
import { FRONTEND_PASSIVE_RULES } from './sovereignRules';

/**
 * 🛡️ ARCHITECTURE LOCK — FitJourney 2.0
 * 
 * Este módulo provê travas de runtime para impedir regressões.
 */

export const ArchitectureLock = {
  /**
   * Bloqueia a execução se for detectado um símbolo proibido.
   */
  enforce(symbolName: string, context: string) {
    assertNotLegacyCode(symbolName, context);
  },

  /**
   * Valida se a UI está operando em modo passivo (Snapshot -> Render).
   */
  validatePassiveRender(data: any, component: string) {
    if (FRONTEND_PASSIVE_RULES.SNAPSHOT_IS_SOURCE_OF_TRUTH) {
      assertSnapshotIntegrity(data, component);
    }
    
    // Anti-Recalc Check: Detectar se há campos que sugerem cálculo manual
    if (data && 'calculated_at' in data && !('generated_at' in data)) {
      throw new Error(`[ARCHITECTURE_LOCK] Tentativa de renderizar dados calculados no frontend em ${component}`);
    }
  },

  /**
   * Protege contra mutações de dados soberanos.
   */
  freezeSnapshot<T>(snapshot: T): Readonly<T> {
    return Object.freeze(snapshot);
  }
};
