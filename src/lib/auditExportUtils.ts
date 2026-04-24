import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface ExportOptions {
  format: 'CSV' | 'PDF' | 'XLSX';
  data: any[];
  filters: any;
  filename?: string;
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

export const exportData = async ({ format, data, filters, filename }: ExportOptions) => {
  const ts = new Date().getTime();
  const baseName = filename || `audit_export_${ts}`;
  
  await logExportActivity({ format, filters, count: data.length });

  if (format === 'CSV') {
    const csvContent = "data:text/csv;charset=utf-8," + 
      ["ID,Type,Message,PatientID,CorrelationID,CreatedAt"].join(",") + "\n" +
      data.map(a => `${a.id},${a.alert_type},"${a.message}",${a.metadata?.patient_id},${a.correlation_id},${a.created_at}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${baseName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } 
  else if (format === 'XLSX') {
    const worksheet = XLSX.utils.json_to_sheet(data.map(a => ({
      ID: a.id,
      Type: a.alert_type,
      Message: a.message,
      PatientID: a.metadata?.patient_id,
      CorrelationID: a.correlation_id,
      CreatedAt: a.created_at
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AuditData");
    XLSX.writeFile(workbook, `${baseName}.xlsx`);
  }
  else if (format === 'PDF') {
    const doc = new jsPDF();
    doc.text("Audit Report", 14, 15);
    (doc as any).autoTable({
      head: [['Type', 'Message', 'Correlation']],
      body: data.map(a => [a.alert_type, a.message, a.correlation_id]),
    });
    doc.save(`${baseName}.pdf`);
  }
};
