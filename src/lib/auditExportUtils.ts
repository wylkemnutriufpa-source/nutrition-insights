import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const exportAuditToPDF = (alerts: any[], timeline: any[]) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text("Relatório de Auditoria Clínica", 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);

  // Alerts Table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Alertas Recentes", 14, 45);
  
  (doc as any).autoTable({
    startY: 50,
    head: [['Tipo', 'Mensagem', 'Patient ID', 'Correlation ID']],
    body: alerts.map(a => [
      a.alert_type, 
      a.message, 
      a.metadata?.patient_id || 'N/A', 
      a.correlation_id || 'N/A'
    ]),
  });

  // Timeline Table (if selected)
  if (timeline && timeline.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Linha do Tempo de Eventos", 14, finalY);
    
    (doc as any).autoTable({
      startY: finalY + 5,
      head: [['Timestamp', 'Tipo', 'Detalhes']],
      body: timeline.map(t => [
        new Date(t.timestamp).toLocaleString(),
        t.type,
        t.message || `Status: ${t.status}`
      ]),
    });
  }

  doc.save(`audit_report_${new Date().getTime()}.pdf`);
};
