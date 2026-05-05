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

      .premium-header {
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 40%, #0d0d1a 100%);
        border-radius: 16px;
        padding: 28px 32px;
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
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

      .macro-value {
        font-size: 22px;
        font-weight: 800;
        color: #1a1a2e;
        line-height: 1.1;
      }

      .day-section { margin-bottom: 20px; page-break-inside: avoid; }

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
        background: #1a1a2e;
        color: #D4A84B;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
      }

      .meal-row {
        display: flex;
        background: #fff;
        border: 1px solid #f0f0f0;
        border-radius: 10px;
        margin-bottom: 8px;
        overflow: hidden;
        page-break-inside: avoid;
      }

      .meal-type-bar { width: 5px; flex-shrink: 0; }
      .meal-content { flex: 1; padding: 10px 14px; display: flex; gap: 14px; }
      .meal-info { flex: 1; }
      .meal-title { font-size: 13px; font-weight: 700; color: #1a1a2e; }
      .food-line { display: flex; align-items: baseline; gap: 6px; font-size: 10.5px; color: #555; }
      .food-bullet { color: #D4A84B; font-size: 6px; margin-top: 3px; }
      .meal-macros { min-width: 80px; text-align: right; font-size: 10px; color: #888; }
      .kcal-value { font-size: 15px; font-weight: 800; color: #D4A84B; }
      .premium-footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 9px; color: #ccc; }
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
    <div class="macro-card kcal">
      <div class="macro-value">${data.targetCalories || 0} <span style="font-size:11px">kcal</span></div>
    </div>
  </div>

  ${sortedDays.map(dayKey => {
    const dayItems = groupedByDay[dayKey];
    const dayName = dayKey === -1 ? "Todos os Dias" : (DAY_NAMES[dayKey] || `Dia ${dayKey}`);

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
        
        const subKcal = substitutions.reduce((s, i) => s + (i.calories_target || 0), 0);
        const subProt = substitutions.reduce((s, i) => s + (i.protein_target || 0), 0);
        const subCarb = substitutions.reduce((s, i) => s + (i.carbs_target || 0), 0);
        const subFat = substitutions.reduce((s, i) => s + (i.fat_target || 0), 0);

        return `
          <div class="meal-row">
            <div class="meal-type-bar" style="background: ${mealInfo.color}"></div>
            <div class="meal-content">
              <div class="meal-info">
                <div class="meal-title">
                  <span style="color: ${mealInfo.color}; margin-right: 5px;">${mealInfo.emoji}</span>
                  ${escapeHtml(mealInfo.label)}: ${escapeHtml(primary.title)}
                </div>
                ${primary.description ? formatDescription(primary.description) : ""}
                
                ${substitutions.length > 0 ? `
                  <div style="margin-top: 10px; padding: 8px; background: #fafafa; border-radius: 6px; border-left: 3px solid #eee;">
                    <div style="font-size: 9px; font-weight: 800; color: #999; margin-bottom: 5px; text-transform: uppercase;">Opções de Substituição</div>
                    ${substitutions.map(sub => `
                      <div style="margin-bottom: 4px;">
                        <div style="font-size: 11px; font-weight: 700;">${escapeHtml(sub.title)}</div>
                        <div style="font-size: 9px; color: #999;">${sub.calories_target} kcal · P ${sub.protein_target}g</div>
                      </div>
                    `).join("")}
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; font-size: 9px; color: #777;">
                      <span style="font-weight: 800; color: #c44; text-transform: uppercase;">Macros não considerados:</span>
                      <span style="margin-left: 4px;">${subKcal} kcal · P ${subProt}g · C ${subCarb}g · G ${subFat}g</span>
                    </div>
                  </div>
                ` : ""}
              </div>
              <div class="meal-macros">
                <div class="kcal-value">${primary.calories_target || 0}</div>
                <div style="font-size: 8px; color: #D4A84B; font-weight: 700; margin-top: 2px;">(Total Considerado)</div>
              </div>
            </div>
          </div>
        `;
      };

      const sortedSubGroups = Object.keys(subGroups).sort().map(key => renderGroup(subGroups[key]));
      const renderedOrphans = orphans.map(i => renderGroup([i]));
      
      return [...sortedSubGroups, ...renderedOrphans].join("");
    });

    const filteredGroups = mealTypeGroups.filter(g => g !== "");
    return `<div class="day-section"><div class="day-header"><div class="day-number">${dayKey === 0 ? 7 : dayKey}</div><div class="day-name">${dayName}</div></div>${filteredGroups.join("")}</div>`;
  }).join("")}

  <div class="premium-footer"><div>FitJourney</div><div>${new Date().toLocaleDateString('pt-BR')}</div></div>
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
