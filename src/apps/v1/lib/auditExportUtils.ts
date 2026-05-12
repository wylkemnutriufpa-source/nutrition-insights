import { supabase } from "@v1/integrations/supabase/client";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { isTrulyUnknownPlanStatus, KNOWN_PLAN_STATUS_KEYS } from "@v1/lib/planStatusLabels";

interface ExportOptions {
  format: 'CSV' | 'PDF' | 'XLSX';
  data: any[];
  filters: any;
  filename?: string;
  isAsync?: boolean;
}

/**
 * Extrai o `plan_status` do alerta e classifica como:
 *  - "conhecido" (existe no catálogo central)
 *  - "desconhecido" (string não vazia fora do catálogo) → ajuda a auditar a origem
 *  - "ausente" (alerta sem plan_status no metadata) → não infla "desconhecido"
 */
function classifyAlertPlanStatus(alert: any): { value: string; classification: "conhecido" | "desconhecido" | "ausente" } {
  const raw = alert?.metadata?.plan_status ?? alert?.plan_status ?? null;
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { value: "", classification: "ausente" };
  }
  const value = String(raw);
  if (isTrulyUnknownPlanStatus(value)) return { value, classification: "desconhecido" };
  if (KNOWN_PLAN_STATUS_KEYS.includes(value)) return { value, classification: "conhecido" };
  return { value, classification: "desconhecido" };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const logExportActivity = async (options: { format: string; filters: any; count: number }) => {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_exports_log').insert({
    user_id: user?.id,
    export_format: options.format,
    filter_params: options.filters,
    record_count: options.count
  });
};

/**
 * Creates an async export task
 */
export const requestAsyncExport = async (options: { format: string; filters: any }) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('export_tasks').insert({
    user_id: user?.id,
    format: options.format,
    filter_params: options.filters,
    status: 'pending'
  }).select().single();
  
  if (error) throw error;
  return data;
};

/**
 * Constrói o conteúdo CSV (string crua, sem prefixo data:URI) das linhas
 * de auditoria. Exposto para teste.
 *
 * Inclui colunas de classificação do plan_status para auditoria rápida
 * da origem dos alertas:
 *   • PlanStatus           → valor cru (vazio quando ausente)
 *   • PlanStatusKnown      → "conhecido" | "desconhecido" | "ausente"
 */
export function buildAuditCsv(data: any[]): string {
  const header = [
    "ID",
    "Type",
    "Message",
    "PatientID",
    "CorrelationID",
    "PlanStatus",
    "PlanStatusKnown",
    "CreatedAt",
  ].join(",");
  const lines = data.map((a) => {
    const cls = classifyAlertPlanStatus(a);
    return [
      csvEscape(a.id),
      csvEscape(a.alert_type),
      csvEscape(a.message),
      csvEscape(a.metadata?.patient_id ?? ""),
      csvEscape(a.correlation_id ?? ""),
      csvEscape(cls.value),
      csvEscape(cls.classification),
      csvEscape(a.created_at),
    ].join(",");
  });
  return [header, ...lines].join("\n");
}

export const exportData = async ({ format, data, filters, filename, isAsync }: ExportOptions) => {
  if (isAsync) {
    return requestAsyncExport({ format, filters });
  }

  const ts = new Date().getTime();
  const baseName = filename || `audit_export_${ts}`;

  await logExportActivity({ format, filters, count: data.length });

  if (format === 'CSV') {
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(buildAuditCsv(data));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${baseName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  else if (format === 'XLSX') {
    const worksheet = XLSX.utils.json_to_sheet(data.map(a => {
      const cls = classifyAlertPlanStatus(a);
      return {
        ID: a.id,
        Type: a.alert_type,
        Message: a.message,
        PatientID: a.metadata?.patient_id,
        CorrelationID: a.correlation_id,
        PlanStatus: cls.value,
        PlanStatusKnown: cls.classification,
        CreatedAt: a.created_at,
      };
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AuditData");
    XLSX.writeFile(workbook, `${baseName}.xlsx`);
  }
  else if (format === 'PDF') {
    const doc = new jsPDF();
    doc.text("Audit Report", 14, 15);
    (doc as any).autoTable({
      head: [['Type', 'Message', 'Correlation', 'PlanStatus', 'Status?']],
      body: data.map(a => {
        const cls = classifyAlertPlanStatus(a);
        return [a.alert_type, a.message, a.correlation_id, cls.value, cls.classification];
      }),
    });
    doc.save(`${baseName}.pdf`);
  }
};
