import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Utility para gerar e baixar PDFs usando a API nativa do navegador (print).
 * Cria uma janela de impressão formatada que pode ser salva como PDF.
 */

interface MealPlanPDFData {
  title: string;
  patientName: string;
  nutritionistName: string;
  startDate: string;
  endDate?: string;
  items: {
    mealType: string;
    title: string;
    description?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    dayOfWeek?: number;
  }[];
}

interface AssessmentPDFData {
  patientName: string;
  assessorName: string;
  date: string;
  weight?: number;
  height?: number;
  bmi?: number;
  bodyFat?: number;
  leanMass?: number;
  fatMass?: number;
  bmr?: number;
  tdee?: number;
  caloriesTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  measurements?: Record<string, number>;
  notes?: string;
}

const CSS = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #1a1a2e; padding: 40px; background: white; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #6d28d9; }
    .logo { font-size: 24px; font-weight: 700; color: #6d28d9; }
    .logo span { color: #a78bfa; }
    .meta { text-align: right; font-size: 12px; color: #6b7280; }
    .meta strong { color: #1a1a2e; }
    h1 { font-size: 22px; margin: 20px 0 8px; color: #1a1a2e; }
    h2 { font-size: 16px; color: #6d28d9; margin: 18px 0 10px; border-left: 4px solid #6d28d9; padding-left: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
    .info-item { background: #f5f3ff; padding: 8px 12px; border-radius: 6px; font-size: 13px; }
    .info-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 2px; }
    .info-item value { font-weight: 600; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
    th { background: #6d28d9; color: white; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #faf5ff; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    .badge { display: inline-block; background: #6d28d9; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .notes { background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; font-size: 13px; margin-top: 15px; }
    @media print { body { padding: 20px; } }
  </style>
`;

const PREMIUM_CSS = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #FFFFFF; background: #000000; padding: 40px; line-height: 1.5; }
    .page { min-height: 100vh; position: relative; }
    .header { border-bottom: 2px solid #10B981; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
    .logo { font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -1px; }
    .logo span { color: #10B981; }
    .title-area { margin-bottom: 30px; }
    h1 { font-size: 32px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; color: #10B981; }
    .subtitle { font-size: 14px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 2px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
    .info-card { background: #111827; border: 1px solid #1F2937; padding: 20px; border-radius: 12px; }
    .info-card label { display: block; font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .info-card value { font-size: 18px; font-weight: 700; color: #FFFFFF; }
    .timeline { position: relative; padding-left: 30px; border-left: 2px solid #1F2937; margin-left: 10px; }
    .event { position: relative; margin-bottom: 30px; }
    .event::before { content: ''; position: absolute; left: -36px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: #10B981; border: 4px solid #000000; box-shadow: 0 0 0 2px #10B981; }
    .event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .event-title { font-size: 16px; font-weight: 700; color: #F3F4F6; }
    .event-date { font-size: 12px; font-family: monospace; color: #9CA3AF; }
    .event-body { background: #111827; border: 1px solid #1F2937; padding: 15px; border-radius: 8px; font-size: 12px; }
    .badge { background: #064E3B; color: #10B981; padding: 2px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .footer { position: absolute; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #4B5563; padding: 20px 0; border-top: 1px solid #1F2937; }
    @media print { body { background: #000000 !important; color: #FFFFFF !important; -webkit-print-color-adjust: exact; } .info-card { background: #111827 !important; } }
  </style>
`;

const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function generateMealPlanPDF(data: MealPlanPDFData) {
  const groupedByDay = data.items.reduce((acc, item) => {
    const day = item.dayOfWeek !== undefined && item.dayOfWeek !== null
      ? dayNames[item.dayOfWeek] || `Dia ${item.dayOfWeek}`
      : "Todos os dias";
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<string, typeof data.items>);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${CSS}</head><body>
    <div class="header">
      <div>
        <div class="logo">Fit<span>Journey</span></div>
        <p style="font-size:11px;color:#6b7280;margin-top:4px">Plano Alimentar Personalizado</p>
      </div>
      <div class="meta">
        <p><strong>Paciente:</strong> ${data.patientName}</p>
        <p><strong>Profissional:</strong> ${data.nutritionistName}</p>
        <p><strong>Data:</strong> ${data.startDate}${data.endDate ? ` a ${data.endDate}` : ''}</p>
      </div>
    </div>
    <h1>${data.title}</h1>
    ${Object.entries(groupedByDay).map(([day, items]) => `
      <h2>${day}</h2>
      <table>
        <tr><th>Refeição</th><th>Descrição</th><th>Kcal</th><th>Prot</th><th>Carb</th><th>Gord</th></tr>
        ${items.map(item => `
          <tr>
            <td><span class="badge">${item.mealType}</span><br/>${item.title}</td>
            <td>${item.description || '-'}</td>
            <td>${item.calories || '-'}</td>
            <td>${item.protein ? item.protein + 'g' : '-'}</td>
            <td>${item.carbs ? item.carbs + 'g' : '-'}</td>
            <td>${item.fat ? item.fat + 'g' : '-'}</td>
          </tr>
        `).join('')}
      </table>
    `).join('')}
    <div class="footer">
      Gerado automaticamente pelo FitJourney · ${new Date().toLocaleDateString('pt-BR')} · Este documento é confidencial
    </div>
  </body></html>`;

  openPrintWindow(html, `plano-alimentar-${data.patientName.replace(/\s/g, '-')}`);
}

export function generateAssessmentPDF(data: AssessmentPDFData) {
  const metrics = [
    { label: "Peso", value: data.weight ? `${data.weight} kg` : null },
    { label: "Altura", value: data.height ? `${data.height} cm` : null },
    { label: "IMC", value: data.bmi?.toFixed(1) },
    { label: "% Gordura", value: data.bodyFat ? `${data.bodyFat}%` : null },
    { label: "Massa Magra", value: data.leanMass ? `${data.leanMass} kg` : null },
    { label: "Massa Gorda", value: data.fatMass ? `${data.fatMass} kg` : null },
    { label: "TMB", value: data.bmr ? `${Math.round(data.bmr)} kcal` : null },
    { label: "TDEE", value: data.tdee ? `${Math.round(data.tdee)} kcal` : null },
  ].filter(m => m.value);

  const targets = [
    { label: "Calorias Alvo", value: data.caloriesTarget ? `${data.caloriesTarget} kcal` : null },
    { label: "Proteínas", value: data.proteinTarget ? `${data.proteinTarget}g` : null },
    { label: "Carboidratos", value: data.carbsTarget ? `${data.carbsTarget}g` : null },
    { label: "Gorduras", value: data.fatTarget ? `${data.fatTarget}g` : null },
  ].filter(t => t.value);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${CSS}</head><body>
    <div class="header">
      <div>
        <div class="logo">Fit<span>Journey</span></div>
        <p style="font-size:11px;color:#6b7280;margin-top:4px">Avaliação Física</p>
      </div>
      <div class="meta">
        <p><strong>Paciente:</strong> ${data.patientName}</p>
        <p><strong>Avaliador:</strong> ${data.assessorName}</p>
        <p><strong>Data:</strong> ${data.date}</p>
      </div>
    </div>

    <h1>Composição Corporal</h1>
    <div class="info-grid">
      ${metrics.map(m => `
        <div class="info-item">
          <label>${m.label}</label>
          <value>${m.value}</value>
        </div>
      `).join('')}
    </div>

    ${targets.length > 0 ? `
      <h2>Metas Nutricionais</h2>
      <div class="info-grid">
        ${targets.map(t => `
          <div class="info-item">
            <label>${t.label}</label>
            <value>${t.value}</value>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${data.measurements && Object.keys(data.measurements).length > 0 ? `
      <h2>Medidas Corporais</h2>
      <table>
        <tr><th>Medida</th><th>Valor (cm)</th></tr>
        ${Object.entries(data.measurements)
          .filter(([_, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
          .join('')}
      </table>
    ` : ''}

    ${data.notes ? `
      <div class="notes">
        <strong>Observações:</strong> ${data.notes}
      </div>
    ` : ''}

    <div class="footer">
      Gerado automaticamente pelo FitJourney · ${new Date().toLocaleDateString('pt-BR')} · Este documento é confidencial
    </div>
  </body></html>`;

  openPrintWindow(html, `avaliacao-${data.patientName.replace(/\s/g, '-')}`);
}

function openPrintWindow(html: string, title: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback: download as HTML
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300);
  };
}

export function generateClinicalAuditPDF(data: {
  patientName: string;
  events: {
    action: string;
    date: Date;
    protocol: string;
    version: string;
    metadata: any;
  }[];
}) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${PREMIUM_CSS}</head><body>
    <div class="page">
      <div class="header">
        <div class="logo">FIT<span>JOURNEY</span></div>
        <div style="text-align:right">
          <p style="font-size:12px;font-weight:700">RELATÓRIO DE AUDITORIA CLÍNICA</p>
          <p style="font-size:10px;color:#9CA3AF">PACIENTE: ${data.patientName.toUpperCase()}</p>
        </div>
      </div>

      <div class="title-area">
        <div class="subtitle">Clinical Engine v3.1</div>
        <h1>Histórico Determinístico</h1>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <label>Total de Eventos</label>
          <value>${data.events.length}</value>
        </div>
        <div class="info-card">
          <label>Período de Auditoria</label>
          <value>${format(data.events[data.events.length - 1].date, "dd/MM/yy")} - ${format(data.events[0].date, "dd/MM/yy")}</value>
        </div>
      </div>

      <div class="timeline">
        ${data.events.map(event => `
          <div class="event">
            <div class="event-header">
              <div class="event-title">${event.action} <span class="badge" style="margin-left:10px">${event.protocol}</span></div>
              <div class="event-date">${format(event.date, "dd MMM yyyy • HH:mm", { locale: ptBR })}</div>
            </div>
            <div class="event-body">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <div><span style="color:#6B7280;text-transform:uppercase;font-size:9px">Engine Version:</span> v${event.version}</div>
                <div><span style="color:#6B7280;text-transform:uppercase;font-size:9px">Tipo:</span> ${event.protocol}</div>
              </div>
              ${event.metadata ? `
                <div style="margin-top:10px;padding-top:10px;border-top:1px solid #1F2937;color:#9CA3AF">
                  ${Object.entries(event.metadata).map(([k, v]) => {
                    if (typeof v === 'object') return '';
                    return `<span style="margin-right:15px"><strong>${k.replace(/_/g, ' ')}:</strong> ${v}</span>`;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="footer">
        Gerado via FitJourney Nutrition · ${new Date().toLocaleDateString('pt-BR')}
      </div>
    </div>
  </body></html>`;

  openPrintWindow(html, `auditoria-clinica-${data.patientName.replace(/\s/g, '-')}`);
}
