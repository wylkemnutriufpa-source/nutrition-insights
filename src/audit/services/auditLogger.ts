/**
 * 📝 FITJOURNEY STRUCTURED AUDIT LOGGER
 * ----------------------------------------------------------------
 * Central de logs para rastreamento de quebras e divergências.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'security';

interface AuditLog {
  level: LogLevel;
  module: string;
  action: string;
  data: any;
  timestamp: string;
  userId?: string;
  patientId?: string;
}

export function logClinicalEvent(params: {
  type: 'audit_log' | 'error_logs' | 'security_logs';
  action: string;
  resource: string;
  details: any;
  patient_id?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}) {
  const log: AuditLog = {
    level: params.type === 'error_logs' ? 'error' : params.type === 'security_logs' ? 'security' : 'info',
    module: params.resource,
    action: params.action,
    data: params.details,
    timestamp: new Date().toISOString(),
    patientId: params.patient_id
  };

  // Log no console estruturado para diagnóstico real
  const color = log.level === 'error' || log.level === 'security' ? 'color: #ff0000; font-weight: bold' : 'color: #00ff00';
  console.groupCollapsed(`%c[FJ:AUDIT] [${log.level.toUpperCase()}] ${log.module}:${log.action}`, color);
  console.log('Payload:', log.data);
  console.log('Timestamp:', log.timestamp);
  if (log.patientId) console.log('Patient:', log.patientId);
  console.groupEnd();

  // Opcional: Persistir em tabela de auditoria real via Supabase
  // Isso será ativado se houver conexão disponível
}

/**
 * Detecta divergência de estado entre UI e Banco
 */
export function detectStateDivergence(uiState: string, dbState: string, context: string) {
  if (uiState !== dbState) {
    logClinicalEvent({
      type: 'security_logs',
      action: 'STATE_DIVERGENCE',
      resource: context,
      severity: 'high',
      details: { uiState, dbState, message: 'Divergência detectada entre estado local e persistido.' }
    });
    return true;
  }
  return false;
}
