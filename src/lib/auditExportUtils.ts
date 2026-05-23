import { supabase } from "@/integrations/supabase/client";
import { isTrulyUnknownPlanStatus, KNOWN_PLAN_STATUS_KEYS } from "@/lib/planStatusLabels";

export function buildAuditCsv(data: any[]): string {
  const header = ["ID", "Type", "Message", "PatientID", "CreatedAt"].join(",");
  const lines = data.map((a) => [
    csvEscape(a.id),
    csvEscape(a.alert_type),
    csvEscape(a.message),
    csvEscape(a.metadata?.patient_id ?? ""),
    csvEscape(a.created_at)
  ].join(","));
  return [header, ...lines].join("\n");
}


interface ExportOptions {
  format: 'CSV' | 'PDF' | 'XLSX';
  data: any[];
  filters: any;
  filename?: string;
  isAsync?: boolean;
}

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

export const exportData = async ({ format, data, filters, filename, isAsync }: ExportOptions) => {
  if (isAsync) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: task, error } = await supabase.from('export_tasks').insert({
      user_id: user?.id,
      format,
      filter_params: filters,
      status: 'pending'
    }).select().single();
    if (error) throw error;
    return task;
  }

  const ts = new Date().getTime();
  const baseName = filename || `audit_export_${ts}`;

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
    // 🛡️ SOBERANIA: Lazy load heavy XLSX library
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(data.map(a => ({
      ID: a.id,
      Type: a.alert_type,
      Message: a.message,
      CreatedAt: a.created_at,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AuditData");
    XLSX.writeFile(workbook, `${baseName}.xlsx`);
  }
  else if (format === 'PDF') {
    // 🛡️ SOBERANIA: Lazy load heavy PDF libraries
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.text("Audit Report", 14, 15);
    (doc as any).autoTable({
      head: [['Type', 'Message', 'Status']],
      body: data.map(a => [a.alert_type, a.message, a.status]),
    });
    doc.save(`${baseName}.pdf`);
  }
};
