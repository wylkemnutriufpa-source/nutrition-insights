/**
 * Editor V3 — Pipeline Trace & Clinical Guard
 * ----------------------------------------------------------------
 * Responsável pela pureza do pipeline entre o Motor e o Editor.
 * Garante que a massa clínica seja preservada e que os limites
 * fisiológicos sejam respeitados.
 */

export interface PipelineTraceStep {
  stage: string;
  data: any;
  timestamp: string;
}

export class PipelineTrace {
  private steps: PipelineTraceStep[] = [];
  private static instance: PipelineTrace;

  private constructor() {}

  static getInstance(): PipelineTrace {
    if (!PipelineTrace.instance) {
      PipelineTrace.instance = new PipelineTrace();
    }
    return PipelineTrace.instance;
  }

  trace(stage: string, data: any) {
    const step = {
      stage,
      data: JSON.parse(JSON.stringify(data)),
      timestamp: new Date().toISOString()
    };
    this.steps.push(step);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PipelineTrace] ${stage}:`, data);
    }
  }

  getHistory() {
    return this.steps;
  }

  clear() {
    this.steps = [];
  }
}

export const ClinicalGuard = {
  /**
   * Garante que a massa de um alimento esteja dentro de limites humanos.
   * Evita bugs de explosão (ex: 27kg de arroz).
   */
  clampQuantity: (quantity: number, name: string = 'alimento', type: string = 'gram'): number => {
    // Limites superiores e inferiores baseados no tipo
    const limits: Record<string, { min: number, max: number }> = {
      gram: { min: 1, max: 10000 },    // Máximo 10kg por item (explosão absurda)
      ml: { min: 1, max: 10000 },     // Máximo 10L por item (explosão absurda)
      unit: { min: 0.1, max: 1000 },   // Máximo 1000 unidades
      spoon: { min: 0.1, max: 1000 },  // Máximo 1000 colheres
    };

    const limit = limits[type] || limits.gram;
    
    if (quantity > limit.max) {
      console.warn(`[ClinicalGuard] OVERFLOW DETECTED: ${name} (${quantity}${type}) exceeds max ${limit.max}. Clamping.`);
      return limit.max;
    }
    
    if (quantity < limit.min && quantity > 0) {
      console.warn(`[ClinicalGuard] UNDERFLOW DETECTED: ${name} (${quantity}${type}) below min ${limit.min}. Clamping.`);
      return limit.min;
    }

    return quantity;
  },

  /**
   * Sanitiza macros para evitar valores impossíveis.
   */
  sanitizeMacros: (macros: { kcal: number, protein: number, carbs: number, fat: number }) => {
    return {
      kcal: Math.max(0, Math.min(2500, macros.kcal)),      // Max 2500kcal por item (muito improvável)
      protein: Math.max(0, Math.min(250, macros.protein)), // Max 250g de proteína por item
      carbs: Math.max(0, Math.min(300, macros.carbs)),     // Max 300g de carbo por item
      fat: Math.max(0, Math.min(100, macros.fat))          // Max 100g de gordura por item
    };
  }
};
