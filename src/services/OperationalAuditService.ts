import { supabase } from "@/integrations/supabase/client";

export type LogSeverity = "INFO" | "WARNING" | "CRITICAL";

interface LogContext {
  flow: string;
  rpc?: string;
  payload?: any;
  userId?: string;
  metadata?: Record<string, any>;
  error?: Error | string;
}

/**
 * SERVIÇO DE AUDITORIA OPERACIONAL (SOVEREIGN)
 * Centraliza a instrumentação de falhas e sucessos críticos.
 */
export const OperationalAuditService = {
  /**
   * Registra um evento de runtime no fluxo soberano.
   */
  async logEvent(context: LogContext, severity: LogSeverity = "INFO") {
    try {
      const { flow, rpc, payload, userId, metadata, error } = context;
      
      const logData = {
        event_type: flow,
        runtime_source: "frontend",
        severity,
        message: typeof error === "string" ? error : error?.message || `Evento em ${flow}`,
        metadata: {
          ...metadata,
          rpc_call: rpc,
          url: window.location.href,
          timestamp: new Date().toISOString()
        },
        payload: payload || {},
        user_id: userId,
        editor_version: "3.0.0", // Versão do contrato soberano
        snapshot_version: "2.1.0"
      };

      if (severity === "CRITICAL" || error) {
        // Log de erro dedicado
        await supabase.from("system_error_logs").insert({
          user_id: userId,
          role: "professional", // Assumindo professional por padrão no admin/editor
          module: flow,
          page_route: window.location.pathname,
          action_attempted: rpc || flow,
          error_message: logData.message,
          stack_trace: error instanceof Error ? error.stack : undefined,
          severity: severity === "CRITICAL" ? "high" : "medium",
          auto_recovered: false
        });
      }

      // Log soberano de runtime (sempre)
      await supabase.from("sovereign_runtime_logs").insert(logData as any);

    } catch (e) {
      console.error("Falha ao registrar log de auditoria:", e);
    }
  },

  /**
   * Helper específico para erros críticos.
   */
  async logCriticalError(flow: string, error: Error | string, payload?: any) {
    return this.logEvent({ flow, error, payload }, "CRITICAL");
  },

  /**
   * Helper para sucesso em operações críticas (ex: publicação).
   */
  async logSuccess(flow: string, rpc: string, payload?: any) {
    return this.logEvent({ flow, rpc, payload }, "INFO");
  }
};
