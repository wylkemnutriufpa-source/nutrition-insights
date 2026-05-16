
import { supabase } from '@/integrations/supabase/client';

export type SovereigntyEventType = 
  | 'snapshot_render' 
  | 'legacy_fallback' 
  | 'macro_recalculation' 
  | 'visual_fallback' 
  | 'hydration_event'
  | 'identity_breach'
  | 'integrity_failure';

export interface SovereigntyMetric {
  event_type: SovereigntyEventType;
  component: string;
  message: string;
  metadata?: any;
  stack?: string;
}

/**
 * SISTEMA FORENSE AUTO-AUDITÁVEL (SOVEREIGNTY MONITOR)
 * Rastrea e denuncia traições arquiteturais em tempo real.
 */
export const SovereignMonitor = {
  /**
   * Registra um evento de telemetria ou denúncia arquitetural.
   */
  async log(metric: SovereigntyMetric) {
    const { event_type, component, message, metadata, stack } = metric;
    
    // Log local para desenvolvimento
    const color = event_type === 'snapshot_render' ? 'color: #10b981' : 'color: #ef4444';
    console.log(`%c[V3-SOVEREIGNTY] [${event_type.toUpperCase()}] at ${component}: ${message}`, color, { metadata, stack: stack || new Error().stack });

    // Persistência em banco para observabilidade real
    try {
      await supabase.from('user_behavior_events').insert({
        event_name: `sovereignty_${event_type}`,
        context: {
          component,
          message,
          metadata,
          stack: stack || new Error().stack,
          v3_sovereign: true
        },
        created_at: new Date().toISOString()
      });
    } catch (e) {
      // Falha silenciosa no log não deve travar o app
    }
    
    // Se for uma traição crítica (recalculo de macro no paciente), emitimos um erro operacional
    if (event_type === 'macro_recalculation' || event_type === 'legacy_fallback') {
      const error = new Error(`[TRAIÇÃO ARQUITETURAL] Componente ${component} tentou recalcular dados soberanos.`);
      console.error(error);
      // Aqui poderíamos disparar um toast de sistema ou erro de fronteira no futuro
    }
  },

  /**
   * Helper para garantir que um componente não está "pensando"
   */
  assertSovereignty(component: string, plan: any) {
    if (plan?.editor_version !== 'v3') {
      this.log({
        event_type: 'legacy_fallback',
        component,
        message: `Componente operando em modo legado (version: ${plan?.editor_version || 'unknown'})`
      });
    }
  }
};
