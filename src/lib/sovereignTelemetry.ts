/**
 * FitJourney — Sovereign Telemetry Service
 * 
 * Centralized logging for clinical sovereignty violations, schema errors, 
 * and legacy runtime detections.
 */

import { supabase } from "@/integrations/supabase/client";

export type SovereignEventType = 
  | 'snapshot_invalid'
  | 'schema_violation'
  | 'hydration_blocked'
  | 'legacy_detected'
  | 'fallback_prohibited'
  | 'inference_blocked'
  | 'missing_clinical_mass'
  | 'missing_metadata'
  | 'missing_instance_id'
  | 'missing_block_id'
  | 'missing_day_of_week';

export type SovereignSeverity = 'info' | 'warning' | 'critical';

export interface SovereignLogParams {
  runtime_source: string;
  event_type: SovereignEventType;
  severity: SovereignSeverity;
  message: string;
  metadata?: Record<string, any>;
  correlation_id?: string;
  editor_version?: string;
  snapshot_version?: string;
}

export const SovereignTelemetry = {
  /**
   * Logs a sovereignty violation to the database and console.
   */
  log: async (params: SovereignLogParams) => {
    const correlation_id = params.correlation_id || `corr_${Math.random().toString(36).substring(2, 11)}`;
    const timestamp = new Date().toISOString();

    // 1. Local Console Log (Deterministic & Immediate)
    const icon = params.severity === 'critical' ? '🔴' : params.severity === 'warning' ? '🟠' : '🔵';
    console.warn(
      `[SOVEREIGN ${params.severity.toUpperCase()}] ${icon} ${params.event_type}\n` +
      `Source: ${params.runtime_source}\n` +
      `Message: ${params.message}\n` +
      `Correlation: ${correlation_id}`
    );

    // 2. Persist to Supabase (Fire-and-forget)
    try {
      const { error } = await supabase
        .from('sovereign_runtime_logs')
        .insert({
          correlation_id,
          runtime_source: params.runtime_source,
          event_type: params.event_type,
          severity: params.severity,
          message: params.message,
          metadata: {
            ...params.metadata,
            log_timestamp: timestamp,
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
          },
          editor_version: params.editor_version || 'V3',
          snapshot_version: params.snapshot_version || '1.0'
        });

      if (error) {
        console.error('[SovereignTelemetry] Failed to persist log:', error);
      }
    } catch (err) {
      console.error('[SovereignTelemetry] Unexpected error during logging:', err);
    }
  },

  /**
   * Helper for critical schema violations that block hydration.
   */
  reportBlockedHydration: (source: string, reason: string, metadata?: any) => {
    return SovereignTelemetry.log({
      runtime_source: source,
      event_type: 'hydration_blocked',
      severity: 'critical',
      message: `Hydration blocked: ${reason}`,
      metadata
    });
  },

  /**
   * Helper for detecting legacy recalculations or fallbacks.
   */
  reportLegacyDetection: (source: string, feature: string, metadata?: any) => {
    return SovereignTelemetry.log({
      runtime_source: source,
      event_type: 'legacy_detected',
      severity: 'warning',
      message: `Legacy pattern detected in sovereign runtime: ${feature}`,
      metadata
    });
  }
};
