/**
 * Premium Meal Plan PDF Export — FitJourney v2.0
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

export interface PremiumMealPlanPDFData {
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
  return (str || "")
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
        margin: 10mm;
        size: A4;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: 'Inter', -apple-system, sans-serif;
        color: #1a1a2e;
        background: #ffffff;
        font-size: 11px;
        line-height: 1.4;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .premium-header {
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
        border-radius: 16px;
        padding: 25px 32px;
        margin-bottom: 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 4px solid #D4A84B;
        position: relative;
        overflow: hidden;
      }

      .premium-header::after {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(212,168,75,0.1) 0%, transparent 70%);
      }

      .logo-text {
        font-family: 'Playfair Display', serif;
        font-size: 36px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1;
        position: relative;
        z-index: 2;
      }

      .logo-fit {
        background: linear-gradient(180deg, #D4A84B 0%, #F5D55A 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .logo-journey { color: #ffffff; }

      .patient-info {
        text-align: right;
        color: #ffffff;
        position: relative;
        z-index: 2;
      }

      .patient-info .name {
        font-size: 18px;
        font-weight: 800;
        color: #D4A84B;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .patient-info .label {
        font-size: 10px;
        color: rgba(255,255,255,0.6);
        text-transform: uppercase;
        font-weight: 600;
      }

      .macro-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 24px;
      }

      .macro-card {
        background: #ffffff;
        border: 1px solid #f0f0f0;
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.02);
      }

      .macro-label {
        font-size: 9px;
        text-transform: uppercase;
        color: #666;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .macro-value {
        font-size: 18px;
        font-weight: 800;
        color: #1a1a2e;
      }

      .day-section { margin-bottom: 25px; page-break-inside: avoid; }

      .day-header {
        background: #1a1a2e;
        color: #ffffff;
        padding: 8px 15px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .day-header .day-name {
        font-size: 14px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .meal-row {
        border: 1px solid #eeeeee;
        border-radius: 8px;
        margin-bottom: 10px;
        overflow: hidden;
        background: #ffffff;
      }

      .meal-header-row {
        background: #fdfdfd;
        padding: 10px 15px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .meal-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .meal-label-tag {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 4px;
        color: #fff;
      }

      .meal-primary-title {
        font-size: 13px;
        font-weight: 700;
        color: #1a1a2e;
      }

      .meal-kcal-badge {
        font-weight: 800;
        color: #D4A84B;
        font-size: 12px;
      }

      .meal-body {
        padding: 12px 15px;
      }

      .food-list {
        margin-bottom: 10px;
      }

      .food-line {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 4px;
        color: #333;
        font-size: 11px;
      }

      .food-bullet { color: #D4A84B; font-weight: bold; }

      .substitution-box {
        background: #fafafa;
        border: 1px dashed #ddd;
        border-radius: 6px;
        padding: 10px;
        margin-top: 10px;
      }

      .sub-header {
        font-size: 9px;
        font-weight: 800;
        color: #999;
        text-transform: uppercase;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .sub-item {
        font-size: 10px;
        padding: 4px 0;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
      }
      .sub-item:last-child { border-bottom: none; }

      .premium-footer {
        margin-top: 40px;
        padding-top: 15px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #999;
        font-weight: 500;
      }
    </style>
  `;
}

export function buildPremiumMealPlanHTML(data: PremiumMealPlanPDFData): string {
  const groupedByDay = data.items.reduce((acc, item) => {
    const dayKey = item.day_of_week ?? -1;
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(item);
    return acc;
  }, {} as Record<number, MealPlanPDFItem[]>);

  const sortedDays = Object.keys(groupedByDay).map(Number).sort((a, b) => {
    if (a === -1) return 1;
    if (b === -1) return -1;
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a) - order.indexOf(b);
  });

  const mealOrder = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(data.planTitle)}</title>
  ${buildPremiumCSS()}
</head>
<body>
  <div class="premium-header">
    <div class="header-content">
      <div class="brand-area">
        <div class="logo-text"><span class="logo-fit">Fit</span><span class="logo-journey">Journey</span></div>
      </div>
      <div class="patient-info">
        <div class="name">${escapeHtml(data.patientName)}</div>
        <div>Profissional: ${escapeHtml(data.nutritionistName)}</div>
      </div>
    </div>
  </div>

  <div class="macro-summary">
    <div class="macro-card">
      <div class="macro-label">Energia Total</div>
      <div class="macro-value">${data.targetCalories || 0} kcal</div>
    </div>
    <div class="macro-card">
      <div class="macro-label">Proteínas</div>
      <div class="macro-value">${data.targetProtein || 0}g</div>
    </div>
    <div class="macro-card">
      <div class="macro-label">Carboidratos</div>
      <div class="macro-value">${data.targetCarbs || 0}g</div>
    </div>
    <div class="macro-card">
      <div class="macro-label">Gorduras</div>
      <div class="macro-value">${data.targetFat || 0}g</div>
    </div>
  </div>

  ${sortedDays.map(dayKey => {
    const dayItems = groupedByDay[dayKey];
    const dayName = dayKey === -1 ? "Diário (Todos os Dias)" : (DAY_NAMES[dayKey] || `Dia ${dayKey}`);

    const mealTypeGroups = mealOrder.map(mType => {
      const typeItems = dayItems.filter(i => i.mealType === mType);
      if (typeItems.length === 0) return "";

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

        return `
          <div class="meal-row">
            <div class="meal-header-row">
              <div class="meal-title-group">
                <span class="meal-label-tag" style="background: ${mealInfo.color}">${mealInfo.emoji} ${mealInfo.label}</span>
                <span class="meal-primary-title">${escapeHtml(primary.title)}</span>
              </div>
              <div class="meal-kcal-badge">${primary.calories_target || 0} kcal</div>
            </div>
            <div class="meal-body">
              <div class="food-list">
                ${primary.description ? formatDescription(primary.description) : ""}
              </div>
              
              ${substitutions.length > 0 ? `
                <div class="substitution-box">
                  <div class="sub-header">🔄 Opções de Substituição</div>
                  ${substitutions.map(sub => `
                    <div class="sub-item">
                      <span style="font-weight: 600;">${escapeHtml(sub.title)}</span>
                      <span style="color: #999; font-size: 9px;">${sub.calories_target} kcal</span>
                    </div>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          </div>
        `;
      };

      const sortedSubGroups = Object.keys(subGroups).sort().map(key => renderGroup(subGroups[key]));
      const renderedOrphans = orphans.map(i => renderGroup([i]));
      
      return [...sortedSubGroups, ...renderedOrphans].join("");
    });

    const filteredGroups = mealTypeGroups.filter(g => g !== "");
    return `<div class="day-section"><div class="day-header"><div class="day-name">${dayName}</div></div>${filteredGroups.join("")}</div>`;
  }).join("")}

  <div class="premium-footer">
    <div>Gerado por FitJourney Premium</div>
    <div>${new Date().toLocaleDateString('pt-BR')}</div>
  </div>
</body></html>`;

  return html;
}

export function generatePremiumMealPlanPDF(data: PremiumMealPlanPDFData) {
  const html = buildPremiumMealPlanHTML(data);
  openPremiumPrintWindow(html, `plano-alimentar-${data.patientName.replace(/\s+/g, '-').toLowerCase()}`);
}

function openPremiumPrintWindow(html: string, title: string) {
  if (typeof window === 'undefined') return;
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
