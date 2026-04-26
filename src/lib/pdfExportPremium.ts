/**
 * Premium Meal Plan PDF Export — FitJourney v2.0
 * 
 * Generates a premium-branded PDF with:
 * - FitJourney gold/silver logo (CSS gradients)
 * - Dark premium header with brand identity
 * - Professional meal plan layout with macro cards
 * - Weekly summary with charts
 * - Confidentiality footer
 */

interface MealPlanPDFItem {
  mealType: string;
  title: string;
  description?: string;
  calories_target?: number;
  protein_target?: number;
  carbs_target?: number;
  fat_target?: number;
  day_of_week?: number;
  scheduled_time?: string;
  visual_image_url?: string;
  is_primary?: boolean;
  substitution_group_id?: string | null;
}

interface PremiumMealPlanPDFData {
  planTitle: string;
  patientName: string;
  nutritionistName: string;
  startDate: string;
  endDate?: string;
  items: MealPlanPDFItem[];
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  goal?: string;
  notes?: string;
}

const MEAL_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  breakfast: { label: "Café da Manhã", emoji: "☕", color: "#D4A84B" },
  morning_snack: { label: "Lanche da Manhã", emoji: "🍎", color: "#4CAF50" },
  lunch: { label: "Almoço", emoji: "🍽️", color: "#FF6B35" },
  afternoon_snack: { label: "Lanche da Tarde", emoji: "🍪", color: "#E91E8C" },
  dinner: { label: "Jantar", emoji: "🌙", color: "#5C6BC0" },
  evening_snack: { label: "Ceia", emoji: "🫖", color: "#7E57C2" },
};

const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Emagrecimento",
  maintain: "Manutenção",
  gain_muscle: "Ganho de Massa",
  gain_weight: "Ganho de Peso",
  improve_health: "Melhora da Saúde",
  athletic_performance: "Performance",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDescription(desc: string): string {
  return desc
    .split("\n")
    .filter(l => l.trim())
    .map(line => {
      const cleaned = line.replace(/^[•\-]\s*/, "").trim();
      if (!cleaned) return "";
      return `<div class="food-line">
        <span class="food-bullet">◆</span>
        <span>${escapeHtml(cleaned)}</span>
      </div>`;
    })
    .join("");
}

function buildPremiumCSS(): string {
  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');

      @page {
        margin: 12mm 14mm;
        size: A4;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: 'Inter', -apple-system, sans-serif;
        color: #1a1a2e;
        background: #ffffff;
        font-size: 11px;
        line-height: 1.5;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* ── Premium Header ── */
      .premium-header {
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 40%, #0d0d1a 100%);
        border-radius: 16px;
        padding: 28px 32px;
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
      }

      .premium-header::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(212,168,75,0.15) 0%, transparent 70%);
        border-radius: 50%;
      }

      .premium-header::after {
        content: '';
        position: absolute;
        bottom: -30%;
        left: -10%;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(138,138,138,0.1) 0%, transparent 70%);
        border-radius: 50%;
      }

      .header-content {
        position: relative;
        z-index: 1;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .brand-area {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .logo-text {
        font-family: 'Playfair Display', serif;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1;
      }

      .logo-fit {
        background: linear-gradient(180deg, #D4A84B 0%, #F5D55A 25%, #FFFBE6 50%, #F5D55A 75%, #8B6914 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .logo-journey {
        background: linear-gradient(180deg, #8A8A8A 0%, #C0C0C0 20%, #E8E8E8 45%, #F5F5F5 55%, #C0C0C0 75%, #3A3A3A 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .brand-subtitle {
        font-size: 10px;
        color: rgba(255,255,255,0.45);
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 500;
      }

      .patient-info {
        text-align: right;
        color: rgba(255,255,255,0.7);
        font-size: 11px;
      }

      .patient-info .name {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 2px;
      }

      .patient-info .detail {
        font-size: 10px;
        margin-top: 2px;
        color: rgba(255,255,255,0.5);
      }

      /* ── Plan Title ── */
      .plan-title-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 14px;
        border-bottom: 2px solid #f0f0f0;
      }

      .plan-title {
        font-family: 'Playfair Display', serif;
        font-size: 20px;
        font-weight: 700;
        color: #1a1a2e;
      }

      .goal-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #D4A84B 0%, #B8920A 100%);
        color: #fff;
        padding: 5px 14px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      /* ── Macro Summary Cards ── */
      .macro-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 24px;
      }

      .macro-card {
        background: #fafafa;
        border: 1px solid #eee;
        border-radius: 12px;
        padding: 14px 16px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }

      .macro-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
      }

      .macro-card.kcal::before { background: linear-gradient(90deg, #D4A84B, #F5D55A); }
      .macro-card.prot::before { background: linear-gradient(90deg, #EF4444, #F87171); }
      .macro-card.carb::before { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
      .macro-card.fat::before { background: linear-gradient(90deg, #3B82F6, #60A5FA); }

      .macro-label {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #999;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .macro-value {
        font-size: 22px;
        font-weight: 800;
        color: #1a1a2e;
        line-height: 1.1;
      }

      .macro-unit {
        font-size: 11px;
        font-weight: 400;
        color: #888;
      }

      /* ── Day Section ── */
      .day-section {
        margin-bottom: 20px;
        page-break-inside: avoid;
      }

      .day-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        padding: 8px 0;
        border-bottom: 2px solid #1a1a2e;
      }

      .day-number {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #1a1a2e, #2d2d4e);
        color: #D4A84B;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
      }

      .day-name {
        font-family: 'Playfair Display', serif;
        font-size: 16px;
        font-weight: 700;
        color: #1a1a2e;
      }

      .day-totals {
        margin-left: auto;
        font-size: 10px;
        color: #888;
        font-weight: 500;
      }

      .day-totals strong {
        color: #D4A84B;
        font-weight: 700;
      }

      /* ── Meal Row ── */
      .meal-row {
        display: flex;
        align-items: stretch;
        background: #fff;
        border: 1px solid #f0f0f0;
        border-radius: 10px;
        margin-bottom: 8px;
        overflow: hidden;
        page-break-inside: avoid;
      }

      .meal-type-bar {
        width: 5px;
        flex-shrink: 0;
      }

      .meal-content {
        flex: 1;
        padding: 10px 14px;
        display: flex;
        gap: 14px;
      }

      .meal-info {
        flex: 1;
      }

      .meal-type-label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        font-weight: 700;
        margin-bottom: 3px;
      }

      .meal-title {
        font-size: 13px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 4px;
      }

      .food-line {
        display: flex;
        align-items: baseline;
        gap: 6px;
        font-size: 10.5px;
        color: #555;
        line-height: 1.6;
      }

      .food-bullet {
        color: #D4A84B;
        font-size: 6px;
        flex-shrink: 0;
        margin-top: 3px;
      }

      .meal-macros {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 3px;
        min-width: 80px;
        text-align: right;
        font-size: 10px;
        color: #888;
      }

      .meal-macros .kcal-value {
        font-size: 15px;
        font-weight: 800;
        color: #D4A84B;
        line-height: 1;
      }

      .meal-macros .macro-detail {
        font-size: 9px;
        color: #999;
      }

      .meal-time {
        font-size: 9px;
        color: #aaa;
        margin-top: 3px;
      }

      /* ── Notes ── */
      .notes-section {
        background: linear-gradient(135deg, #fef9ee, #fffbf0);
        border: 1px solid #f0e4c8;
        border-radius: 12px;
        padding: 16px 20px;
        margin-top: 20px;
        page-break-inside: avoid;
      }

      .notes-title {
        font-size: 11px;
        font-weight: 700;
        color: #B8920A;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 6px;
      }

      .notes-text {
        font-size: 11px;
        color: #666;
        line-height: 1.6;
      }

      /* ── Footer ── */
      .premium-footer {
        margin-top: 30px;
        padding-top: 16px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .footer-brand {
        font-size: 10px;
        font-weight: 600;
        color: #ccc;
      }

      .footer-confidential {
        font-size: 9px;
        color: #ccc;
        font-style: italic;
      }

      .footer-date {
        font-size: 9px;
        color: #ccc;
      }

      @media print {
        body { padding: 0; }
        .premium-header { border-radius: 12px; }
        .day-section { page-break-inside: avoid; }
      }
    </style>
  `;
}

export function buildPremiumMealPlanHTML(data: PremiumMealPlanPDFData): string {
  // Group items by day
  const groupedByDay = data.items.reduce((acc, item) => {
    const dayKey = item.day_of_week ?? -1;
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(item);
    return acc;
  }, {} as Record<number, MealPlanPDFItem[]>);

  // Sort days
  const sortedDays = Object.keys(groupedByDay)
    .map(Number)
    .sort((a, b) => {
      if (a === -1) return 1;
      if (b === -1) return -1;
      // Monday first
      const order = [1, 2, 3, 4, 5, 6, 0];
      return order.indexOf(a) - order.indexOf(b);
    });

  // Compute global macros
  const totalKcal = data.items.filter(i => i.is_primary !== false).reduce((s, i) => s + (i.calories_target || 0), 0);
  const totalProt = data.items.filter(i => i.is_primary !== false).reduce((s, i) => s + (i.protein_target || 0), 0);
  const totalCarbs = data.items.filter(i => i.is_primary !== false).reduce((s, i) => s + (i.carbs_target || 0), 0);
  const totalFat = data.items.filter(i => i.is_primary !== false).reduce((s, i) => s + (i.fat_target || 0), 0);
  const daysCount = sortedDays.length || 1;
  const avgKcal = Math.round(totalKcal / daysCount);
  const avgProt = Math.round(totalProt / daysCount);
  const avgCarbs = Math.round(totalCarbs / daysCount);
  const avgFat = Math.round(totalFat / daysCount);

  const goalLabel = data.goal ? (GOAL_LABELS[data.goal] || data.goal) : "";

  // Meal type sort order
  const mealOrder = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.planTitle)} — ${escapeHtml(data.patientName)}</title>
  ${buildPremiumCSS()}
</head>
<body>

  <!-- Premium Header -->
  <div class="premium-header">
    <div class="header-content">
      <div class="brand-area">
        <div class="logo-text">
          <span class="logo-fit">Fit</span><span class="logo-journey">Journey</span>
        </div>
        <div class="brand-subtitle">Plano Alimentar Personalizado</div>
      </div>
      <div class="patient-info">
        <div class="name">${escapeHtml(data.patientName)}</div>
        <div>Profissional: ${escapeHtml(data.nutritionistName)}</div>
        <div class="detail">${escapeHtml(data.startDate)}${data.endDate ? ` a ${escapeHtml(data.endDate)}` : ""}</div>
      </div>
    </div>
  </div>

  <!-- Plan Title + Goal -->
  <div class="plan-title-section">
    <div class="plan-title">${escapeHtml(data.planTitle)}</div>
    ${goalLabel ? `<div class="goal-badge">🎯 ${escapeHtml(goalLabel)}</div>` : ""}
  </div>

  <!-- Macro Summary -->
  <div class="macro-summary">
    <div class="macro-card kcal">
      <div class="macro-label">Calorias/dia</div>
      <div class="macro-value">${data.targetCalories || avgKcal} <span class="macro-unit">kcal</span></div>
    </div>
    <div class="macro-card prot">
      <div class="macro-label">Proteínas/dia</div>
      <div class="macro-value">${data.targetProtein || avgProt}<span class="macro-unit">g</span></div>
    </div>
    <div class="macro-card carb">
      <div class="macro-label">Carboidratos/dia</div>
      <div class="macro-value">${data.targetCarbs || avgCarbs}<span class="macro-unit">g</span></div>
    </div>
    <div class="macro-card fat">
      <div class="macro-label">Gorduras/dia</div>
      <div class="macro-value">${data.targetFat || avgFat}<span class="macro-unit">g</span></div>
    </div>
  </div>

  <!-- Days -->
  ${sortedDays.map(dayKey => {
    const dayItems = groupedByDay[dayKey];
    const dayName = dayKey === -1 ? "Todos os Dias" : (DAY_NAMES[dayKey] || `Dia ${dayKey}`);
    const dayShort = dayKey === -1 ? "★" : String(dayKey === 0 ? 7 : dayKey);
    const dayKcal = dayItems.filter(i => i.is_primary !== false).reduce((s, i) => s + (i.calories_target || 0), 0);
    const dayProt = dayItems.filter(i => i.is_primary !== false).reduce((s, i) => s + (i.protein_target || 0), 0);

    // Group meals by type then by substitution group
    const mealTypeGroups = mealOrder.map(mType => {
      const typeItems = dayItems.filter(i => i.mealType === mType);
      if (typeItems.length === 0) return "";

      // Within this meal type, group by substitution_group_id
      const subGroups: Record<string, MealPlanPDFItem[]> = {};
      const orphans: MealPlanPDFItem[] = [];

      typeItems.forEach(item => {
        if (item.substitution_group_id) {
          if (!subGroups[item.substitution_group_id]) subGroups[item.substitution_group_id] = [];
          subGroups[item.substitution_group_id].push(item);
        } else {
          orphans.push(item);
        }
      });

      const mealInfo = MEAL_LABELS[mType] || { label: mType, emoji: "🍽️", color: "#888" };

      const renderGroup = (groupItems: MealPlanPDFItem[]) => {
        const primary = groupItems.find(i => i.is_primary) || groupItems[0];
        const substitutions = groupItems.filter(i => i !== primary);
        
        const subKcal = substitutions.reduce((s, i) => s + (i.calories_target || 0), 0);
        const subProt = substitutions.reduce((s, i) => s + (i.protein_target || 0), 0);
        const subCarb = substitutions.reduce((s, i) => s + (i.carbs_target || 0), 0);
        const subFat = substitutions.reduce((s, i) => s + (i.fat_target || 0), 0);

        return `
          <div class="meal-row">
            <div class="meal-type-bar" style="background: ${mealInfo.color}"></div>
            <div class="meal-content">
              <div class="meal-info">
                <div class="meal-type-label" style="color: ${mealInfo.color}">
                  ${mealInfo.emoji} ${escapeHtml(mealInfo.label)}
                </div>
                <div class="meal-title">${escapeHtml(primary.title)}</div>
                ${primary.description ? formatDescription(primary.description) : ""}
                
                ${substitutions.length > 0 ? `
                  <div style="margin-top: 10px; padding: 8px; background: #fafafa; border-radius: 6px; border-left: 3px solid #eee;">
                    <div style="font-size: 9px; font-weight: 800; color: #999; margin-bottom: 5px; text-transform: uppercase;">Opções de Substituição</div>
                    ${substitutions.map(sub => `
                      <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #eee;">
                        <div style="font-size: 11px; font-weight: 700; color: #444;">${escapeHtml(sub.title)}</div>
                        ${sub.description ? `<div style="font-size: 9px; color: #777;">${escapeHtml(sub.description)}</div>` : ""}
                        <div style="font-size: 9px; color: #999; margin-top: 2px;">
                          ${sub.calories_target} kcal · P ${sub.protein_target}g · C ${sub.carbs_target}g · G ${sub.fat_target}g
                        </div>
                      </div>
                    `).join("")}
                    
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; font-size: 9px; color: #777;">
                      <span style="font-weight: 800; color: #c44; text-transform: uppercase;">Macros não considerados:</span>
                      <span style="margin-left: 4px;">${subKcal} kcal · P ${subProt}g · C ${subCarb}g · G ${subFat}g</span>
                    </div>
                  </div>
                ` : ""}

                ${primary.scheduled_time ? `<div class="meal-time">🕐 ${escapeHtml(primary.scheduled_time)}</div>` : ""}
              </div>
              <div class="meal-macros">
                <div class="kcal-value">${primary.calories_target || 0}</div>
                <div class="macro-detail">kcal</div>
                <div class="macro-detail" style="margin-top:4px">
                  P ${primary.protein_target || 0}g · C ${primary.carbs_target || 0}g · G ${primary.fat_target || 0}g
                </div>
                <div style="font-size: 8px; color: #D4A84B; font-weight: 700; margin-top: 2px;">(Total Considerado)</div>
              </div>
            </div>
          </div>
        `;
      };

      return Object.values(subGroups).map(renderGroup).join("") + orphans.map(i => renderGroup([i])).join("");
    }).join("");

    return `
      <div class="day-section">
        <div class="day-header">
          <div class="day-number">${dayShort}</div>
          <div class="day-name">${escapeHtml(dayName)}</div>
          <div class="day-totals"><strong>${dayKcal}</strong> kcal · <strong>${dayProt}g</strong> prot</div>
        </div>
        ${mealTypeGroups}
      </div>
    `;
  }).join("")}

  ${data.notes ? `
    <div class="notes-section">
      <div class="notes-title">📝 Observações do Profissional</div>
      <div class="notes-text">${escapeHtml(data.notes)}</div>
    </div>
  ` : ""}

  <!-- Footer -->
  <div class="premium-footer">
    <div class="footer-brand">
      <span style="color: #D4A84B; font-weight: 700;">Fit</span><span style="color: #999;">Journey</span>
      <span style="margin-left: 6px; color: #ddd;">— Nutrição Inteligente</span>
    </div>
    <div class="footer-confidential">Documento confidencial · Uso exclusivo do paciente</div>
    <div class="footer-date">${new Date().toLocaleDateString('pt-BR')}</div>
  </div>

</body>
</html>`;

  openPremiumPrintWindow(html, `plano-alimentar-${data.patientName.replace(/\s+/g, '-').toLowerCase()}`);
}

function openPremiumPrintWindow(html: string, title: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
