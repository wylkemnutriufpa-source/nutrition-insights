/**
 * Premium Meal Plan PDF Export — FitJourney v2.0
 */

interface MealPlanPDFItem {
  id?: string;
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
  planMode?: string;
}

const MEAL_LABELS: Record<string, { label: string; color: string }> = {
  breakfast: { label: "Café da Manhã", color: "#6366f1" },
  cafe_da_manha: { label: "Café da Manhã", color: "#6366f1" },
  morning_snack: { label: "Lanche da Manhã", color: "#10b981" },
  lanche_da_manha: { label: "Lanche da Manhã", color: "#10b981" },
  lunch: { label: "Almoço", color: "#f59e0b" },
  almoco: { label: "Almoço", color: "#f59e0b" },
  afternoon_snack: { label: "Lanche da Tarde", color: "#ec4899" },
  lanche_da_tarde: { label: "Lanche da Tarde", color: "#ec4899" },
  snack: { label: "Lanche", color: "#ec4899" },
  pre_workout: { label: "Pré-Treino", color: "#ef4444" },
  post_workout: { label: "Pós-Treino", color: "#3b82f6" },
  dinner: { label: "Jantar", color: "#6366f1" },
  jantar: { label: "Jantar", color: "#6366f1" },
  evening_snack: { label: "Ceia", color: "#8b5cf6" },
  ceia: { label: "Ceia", color: "#8b5cf6" },
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

const FIXED_MEAL_TYPE_ORDER = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "evening_snack",
] as const;

type CanonicalMealType = typeof FIXED_MEAL_TYPE_ORDER[number];

const MEAL_TYPE_ALIASES: Record<string, CanonicalMealType> = {
  breakfast: "breakfast",
  cafe: "breakfast",
  cafe_da_manha: "breakfast",
  cafe_manha: "breakfast",
  desjejum: "breakfast",
  morning_snack: "morning_snack",
  lanche_da_manha: "morning_snack",
  lanche_manha: "morning_snack",
  colacao: "morning_snack",
  lunch: "lunch",
  almoco: "lunch",
  afternoon_snack: "afternoon_snack",
  lanche_da_tarde: "afternoon_snack",
  lanche_tarde: "afternoon_snack",
  snack: "afternoon_snack",
  dinner: "dinner",
  jantar: "dinner",
  evening_snack: "evening_snack",
  ceia: "evening_snack",
  lanche_da_noite: "evening_snack",
  lanche_noite: "evening_snack",
};

function normalizeMealTypeKey(type: unknown): string {
  return String(type || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveCanonicalMealType(type: unknown): CanonicalMealType | string {
  const normalized = normalizeMealTypeKey(type);
  return MEAL_TYPE_ALIASES[normalized] || normalized;
}

function getMealGroupKey(item: MealPlanPDFItem): string {
  const canonicalType = resolveCanonicalMealType(item.mealType);
  if (item.substitution_group_id) return `${canonicalType}:${item.substitution_group_id}`;
  return `item:${canonicalType}:${item.id || `${item.title}:${item.description || ""}`}`;
}

function isGenericSubstitutionDescription(description?: string): boolean {
  const normalized = normalizeMealTypeKey(description);
  return !normalized || normalized === "substituicao" || normalized === "opcao_de_substituicao";
}

function formatSubstitutionDetail(sub: MealPlanPDFItem, primary: MealPlanPDFItem): string {
  if (sub.description && !isGenericSubstitutionDescription(sub.description)) return sub.description;
  const primaryPortion = primary.description || "";
  if (/\d/.test(primaryPortion)) return `Porção equivalente: ${primaryPortion}`;
  return "";
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Clean up text from technical audit information and weird symbols
 */
function cleanClinicalText(text: string): string {
  if (!text) return "";
  
  // Remove technical audit blocks often added by clinical engine for transparency but not meant for patients
  const auditMarkers = [
    "AUDITORIA CLÍNICA",
    "TRILHA DE REGRAS",
    "Motor de Cálculo",
    "Clinical Engine",
    "Timestamp:",
    "Protocolo:",
    "MEAL_KCAL_SPLIT",
    "Status: Validado"
  ];

  let cleaned = text;
  
  // Remove símbolos técnicos e emojis que não renderizam corretamente nos PDFs
  cleaned = cleaned.replace(/[Ø=Ý]+/g, "");
  // Remove emojis (planos suplementares Unicode) e símbolos pictográficos
  cleaned = cleaned.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "");
  // Remove caracteres de controle
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F]/g, " ");

  // If we find any audit marker, we try to remove the line
  const lines = cleaned.split("\n");
  const filteredLines = lines.filter(line => {
    const upperLine = line.toUpperCase();
    return !auditMarkers.some(marker => upperLine.includes(marker.toUpperCase()));
  });

  return filteredLines.join("\n").trim();
}

function formatDescription(desc: string): string {
  if (!desc) return "";
  const cleanedDesc = cleanClinicalText(desc);

  return cleanedDesc
    .split("\n")
    .map(line => line.trim())
    .filter(l => {
      const t = l.toLowerCase();
      if (!t) return false;
      
      // Don't filter out lines that might be food items even if they contain arrows
      // Only filter out lines that look like a "Substitutions:" header
      if (/^substitui[çc][õo]es?\s*:?$/.test(t.replace(/[^\w\s]/g, "").trim())) return false;
      
      return true;
    })
    .map(line => {
      // Remove leading bullets/symbols but preserve the text
      const cleaned = line.replace(/^[•\-●*🔄]\s*/, "").trim();
      if (!cleaned) return "";
      
      return `<div class="food-line">
        <span class="food-bullet"></span>
        <span>${escapeHtml(cleaned)}</span>
      </div>`;
    })
    .join("");
}

function roundMacro(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function getPrimaryDailyItems(items: MealPlanPDFItem[]): MealPlanPDFItem[] {
  const groupedByDay = items.reduce((acc, item) => {
    const dayKey = item.day_of_week ?? -1;
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(item);
    return acc;
  }, {} as Record<number, MealPlanPDFItem[]>);

  const dayOrder = [1, 2, 3, 4, 5, 6, 0, -1];
  const selectedDay = dayOrder.find(day => groupedByDay[day]?.some(item => item.is_primary !== false)) ?? Number(Object.keys(groupedByDay)[0] ?? -1);
  const dayItems = groupedByDay[selectedDay] || items;
  const groups = new Map<string, MealPlanPDFItem[]>();

  dayItems.forEach((item) => {
    const key = getMealGroupKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  });

  return Array.from(groups.values()).map(group => group.find(item => item.is_primary !== false) || group[0]);
}

function calculateDisplayTotals(data: PremiumMealPlanPDFData) {
  const primaryDailyItems = getPrimaryDailyItems(data.items || []);
  const calculated = primaryDailyItems.reduce((acc, item) => ({
    calories: acc.calories + roundMacro(item.calories_target),
    protein: acc.protein + roundMacro(item.protein_target),
    carbs: acc.carbs + roundMacro(item.carbs_target),
    fat: acc.fat + roundMacro(item.fat_target),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const safeTarget = (target: number | undefined, calculatedValue: number, max: number) => {
    const rounded = roundMacro(target);
    if (calculatedValue > 0 && (rounded <= 0 || rounded > max)) return calculatedValue;
    return rounded || calculatedValue;
  };

  return {
    calories: safeTarget(data.targetCalories, calculated.calories, 5000),
    protein: safeTarget(data.targetProtein, calculated.protein, 350),
    carbs: safeTarget(data.targetCarbs, calculated.carbs, 700),
    fat: safeTarget(data.targetFat, calculated.fat, 250),
  };
}


function buildPremiumCSS(): string {
  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap');

      @page {
        margin: 0;
        size: A4;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: 'Inter', -apple-system, sans-serif;
        color: #0f172a;
        background: #ffffff;
        font-size: 10.5px;
        line-height: 1.45;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .page-content {
        padding: 0 28px 24px 28px;
        position: relative;
      }

      /* Estilo Premium para o Header */
      .premium-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        padding: 22px 28px;
        margin-bottom: 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 40px 40px;
        color: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        position: relative;
        overflow: hidden;
      }

      .premium-header::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(212, 168, 75, 0.1) 0%, transparent 70%);
        transform: translate(100px, -100px);
      }

      .logo-text {
        font-family: 'Playfair Display', serif;
        font-size: 42px;
        font-weight: 900;
        letter-spacing: -0.04em;
        line-height: 0.9;
        display: flex;
        flex-direction: column;
      }

      .logo-fit {
        color: #D4A84B;
        font-style: italic;
      }
      .logo-journey { 
        color: #ffffff;
        font-size: 0.8em;
        margin-top: -5px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-family: 'Montserrat', sans-serif;
        font-weight: 300;
      }

      .patient-info {
        text-align: right;
        border-right: 4px solid #D4A84B;
        padding-right: 20px;
      }

      .patient-info .name {
        font-family: 'Montserrat', sans-serif;
        font-size: 24px;
        font-weight: 800;
        color: #D4A84B;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .patient-info .label {
        font-size: 10px;
        color: #94a3b8;
        text-transform: uppercase;
        font-weight: 700;
        margin-bottom: 2px;
        letter-spacing: 2px;
      }

      .professional-label {
        font-size: 12px;
        font-weight: 500;
        color: #ffffff;
        opacity: 0.8;
      }

      /* Cards de Macronutrientes */
      .macro-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 18px;
      }

      .macro-card {
        background: #ffffff;
        border: 1px solid #f1f5f9;
        border-radius: 10px;
        padding: 10px 8px;
        text-align: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      }

      .macro-label {
        font-size: 9px;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 800;
        margin-bottom: 3px;
        letter-spacing: 0.6px;
      }

      .macro-value {
        font-family: 'Montserrat', sans-serif;
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
      }

      .macro-value span {
        font-size: 9px;
        font-weight: 500;
        color: #94a3b8;
      }

      /* Seções de Dias */
      .day-section { margin-bottom: 16px; page-break-inside: avoid; }

      .day-header {
        background: #0f172a;
        color: #ffffff;
        padding: 7px 18px;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 10px;
      }

      .day-header .day-name {
        font-family: 'Montserrat', sans-serif;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      /* Linhas de Refeição */
      .meal-row {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        margin-bottom: 8px;
        overflow: hidden;
        background: #ffffff;
        page-break-inside: avoid;
      }

      .meal-header-row {
        background: #f8fafc;
        padding: 8px 14px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .meal-title-group {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }

      .meal-label-tag {
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        padding: 3px 9px;
        border-radius: 5px;
        color: #fff;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }

      .meal-kcal-badge {
        font-family: 'Montserrat', sans-serif;
        font-weight: 800;
        color: #D4A84B;
        font-size: 12px;
        background: #fff;
        padding: 3px 10px;
        border-radius: 99px;
        box-shadow: inset 0 0 0 1px #f1f5f9;
        white-space: nowrap;
      }

      .meal-body {
        padding: 10px 16px 12px;
      }

      .food-list {
        margin-bottom: 0;
      }

      .food-line {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 4px;
        color: #334155;
        font-size: 10.5px;
      }

      .food-bullet {
        width: 4px;
        height: 4px;
        background-color: #D4A84B;
        border-radius: 50%;
        flex-shrink: 0;
        margin-top: 6px;
      }

      /* Substituições */
      .substitution-box {
        background: #fdfaf3;
        border: 1px solid #f9f1df;
        border-radius: 8px;
        padding: 8px 12px;
        margin-top: 8px;
      }

      .sub-header {
        font-size: 9px;
        font-weight: 800;
        color: #856404;
        text-transform: uppercase;
        margin-bottom: 4px;
        letter-spacing: 1px;
      }

      .sub-item {
        font-size: 10px;
        padding: 3px 0;
        border-bottom: 1px solid #f3e9d2;
        display: flex;
        justify-content: space-between;
        color: #4b3d17;
      }
      .sub-item:last-child { border-bottom: none; }

      /* Footer */
      .premium-footer {
        margin-top: 24px;
        padding: 14px 20px;
        border-top: 1px solid #f1f5f9;
        text-align: center;
        font-size: 9px;
        color: #94a3b8;
      }

      .footer-brand {
        font-family: 'Playfair Display', serif;
        font-size: 14px;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 3px;
      }

      .watermark {
        position: fixed;
        bottom: 100px;
        right: -100px;
        font-size: 120px;
        font-weight: 900;
        color: rgba(15, 23, 42, 0.02);
        transform: rotate(-45deg);
        z-index: -1;
        pointer-events: none;
        text-transform: uppercase;
      }
    </style>
  `;
}

export function buildPremiumMealPlanHTML(data: PremiumMealPlanPDFData): string {
  const displayTotals = calculateDisplayTotals(data);
  const isWeeklyMode = data.planMode === 'weekly';
  
  // Agrupar itens por dia para detectar se temos apenas um template de 1 dia
  const originalGroupedByDay = (data.items || []).reduce((acc, item) => {
    const dayKey = item.day_of_week ?? -1;
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(item);
    return acc;
  }, {} as Record<number, MealPlanPDFItem[]>);

  const distinctDays = Object.keys(originalGroupedByDay).filter(d => d !== '-1');
  const isSingleDayTemplate = distinctDays.length <= 1;

  let printItems: MealPlanPDFItem[] = [];

  if (isWeeklyMode && isSingleDayTemplate) {
    // 🚀 LÓGICA DE ROTAÇÃO SEMANAL: Expandir 1 dia para 7 dias rotacionando substituições
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const templateDay = Number(distinctDays[0] || 0);
    const templateItems = originalGroupedByDay[templateDay] || originalGroupedByDay[-1] || [];
    
    // Identificar grupos de substituição no template sem misturar refeições de tipos diferentes
    const groups: Record<string, { primary: MealPlanPDFItem, subs: MealPlanPDFItem[] }> = {};
    templateItems.forEach(item => {
      const gId = getMealGroupKey(item);
      if (!groups[gId]) groups[gId] = { primary: item, subs: [] };
      if (item.is_primary !== false) groups[gId].primary = item;
      else groups[gId].subs.push(item);
    });

    // Gerar 7 dias rotacionando
    dayOrder.forEach((day, dayIdx) => {
      Object.values(groups).forEach(group => {
        const options = [group.primary, ...group.subs];
        // Rotacionar: cada dia pega o próximo item da lista de opções
        const selected = options[dayIdx % options.length];
        
        // Adicionar o selecionado como primário para este dia específico
        printItems.push({
          ...selected,
          day_of_week: day,
          is_primary: true
        });
        
        // Adicionar as outras opções como substitutos (opcional, mas bom para o paciente ver)
        options.filter(o => o !== selected).forEach(o => {
          printItems.push({
            ...o,
            day_of_week: day,
            is_primary: false
          });
        });
      });
    });
  } else {
    // Modo Diário ou já possui múltiplos dias: Flattening normal dos grupos para o dia atual
    printItems = getPrimaryDailyItems(data.items || []).flatMap((primary) => {
      const primaryGroupKey = getMealGroupKey(primary);
      const relatedSubs = (data.items || [])
        .filter(item => item !== primary && item.is_primary === false && getMealGroupKey(item) === primaryGroupKey)
        .slice(0, 5);
      return [primary, ...relatedSubs];
    });
  }
  const renderMealTypeItems = (typeItems: MealPlanPDFItem[], mType: string) => {
    const subGroups: Record<string, MealPlanPDFItem[]> = {};
    const orphans: MealPlanPDFItem[] = [];
    
    typeItems.forEach(item => {
      if (item.substitution_group_id) {
        const groupKey = getMealGroupKey(item);
        if (!subGroups[groupKey]) subGroups[groupKey] = [];
        subGroups[groupKey].push(item);
      } else {
        orphans.push(item);
      }
    });

    const canonicalType = resolveCanonicalMealType(mType);
    const mealInfo = MEAL_LABELS[String(canonicalType)] || MEAL_LABELS[mType] || { label: mType, color: "#94a3b8" };

    const renderGroup = (groupItems: MealPlanPDFItem[]) => {
      const primary = groupItems.find(i => i.is_primary) || groupItems[0];
      const substitutions = groupItems.filter(i => i !== primary);
      const substitutionTotals = substitutions.reduce((acc, sub) => ({
        calories: acc.calories + roundMacro(sub.calories_target),
        protein: acc.protein + roundMacro(sub.protein_target),
        carbs: acc.carbs + roundMacro(sub.carbs_target),
        fat: acc.fat + roundMacro(sub.fat_target),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      const sameAsLabel = (primary.title || "").trim().toLowerCase() === mealInfo.label.toLowerCase();
      const showTitle = primary.title && !sameAsLabel;
      return `
        <div class="meal-row">
          <div class="meal-header-row">
            <div class="meal-title-group">
              <span class="meal-label-tag" style="background: ${mealInfo.color}">${mealInfo.label}</span>
              ${showTitle ? `<span class="meal-primary-title">${escapeHtml(primary.title)}</span>` : ""}
            </div>
            <div class="meal-kcal-badge">${primary.calories_target || 0} kcal</div>
          </div>
          <div class="meal-body">
            <div class="food-list">
              ${primary.description && !primary.description.includes('(') ? formatDescription(primary.description) : (primary.description ? `<div class="food-line"><span class="food-bullet"></span><span>${escapeHtml(primary.description)}</span></div>` : "")}
            </div>

            ${substitutions.length > 0 ? `
              <div class="substitution-box">
                <div class="sub-header">Opções de Substituição</div>
                ${substitutions.map(sub => `
                  <div class="sub-item">
                    <div>
                      <span style="font-weight: 600;">${escapeHtml(sub.title)}</span>
                      ${sub.description ? `<span style="font-size: 9px; color: #64748b;"> — ${escapeHtml(sub.description)}</span>` : ""}
                    </div>
                    <span style="color: #999; font-size: 9px;">${sub.calories_target || 0} kcal</span>
                  </div>
                `).join("")}
                <div class="sub-item" style="font-weight: 700; color: #856404; border-bottom: none; margin-top: 3px; padding-top: 5px; border-top: 1px solid #f3e9d2;">
                  <span>Macros não considerados:</span>
                  <span style="margin-left: 4px;">${substitutionTotals.calories} kcal · P ${substitutionTotals.protein}g · C ${substitutionTotals.carbs}g · G ${substitutionTotals.fat}g</span>
                </div>
              </div>
            ` : ""}
          </div>
        </div>
      `;
    };

    const sortedSubGroups = Object.keys(subGroups).sort().map(key => renderGroup(subGroups[key]));
    const renderedOrphans = orphans.map(i => renderGroup([i]));
    
    return [...sortedSubGroups, ...renderedOrphans].join("");
  };


  const groupedByDay = printItems.reduce((acc, item) => {
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

  const mealOrder = ["cafe_da_manha", "breakfast", "lanche_da_manha", "morning_snack", "almoco", "lunch", "lanche_da_tarde", "afternoon_snack", "snack", "pre_workout", "post_workout", "jantar", "dinner", "ceia", "evening_snack"];

  const normalizeType = (t: string) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(data.planTitle)}</title>
  ${buildPremiumCSS()}
</head>
<body>
  <div class="premium-header">
    <div class="logo-text">
      <span class="logo-fit">Fit</span><span class="logo-journey">Journey</span>
    </div>
    <div class="patient-info">
      <div class="label">Plano Alimentar de:</div>
      <div class="name">${escapeHtml(data.patientName)}</div>
      <div class="professional-label">Profissional: ${escapeHtml(data.nutritionistName)}</div>
    </div>
  </div>

  <div class="page-content">
  <div class="macro-summary">
    <div class="macro-card" style="border-top: 3px solid #D4A84B;">
      <div class="macro-label">Energia Total</div>
       <div class="macro-value">${displayTotals.calories} <span style="font-size: 10px; font-weight: 500;">kcal</span></div>
    </div>
    <div class="macro-card" style="border-top: 3px solid #EF4444;">
      <div class="macro-label">Proteínas</div>
       <div class="macro-value">${displayTotals.protein}g</div>
    </div>
    <div class="macro-card" style="border-top: 3px solid #F59E0B;">
      <div class="macro-label">Carboidratos</div>
       <div class="macro-value">${displayTotals.carbs}g</div>
    </div>
    <div class="macro-card" style="border-top: 3px solid #3B82F6;">
      <div class="macro-label">Gorduras</div>
       <div class="macro-value">${displayTotals.fat}g</div>
    </div>
  </div>
  <div style="margin: -10px 0 14px; font-size: 9px; color: #64748b; text-align: right; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;">
    <span>(Total Considerado) refeições principais</span><div style="display:none">${displayTotals.calories}</div>
  </div>

  ${data.goal ? `
    <div style="margin-bottom: 20px; padding: 15px; background: #fdf6e3; border-radius: 12px; border-left: 4px solid #D4A84B;">
      <div style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #856404; margin-bottom: 4px;">Objetivo Principal</div>
      <div style="font-size: 13px; font-weight: 700; color: #1a1a2e;">${GOAL_LABELS[data.goal] || data.goal}</div>
    </div>
  ` : ""}

  ${data.notes ? `
    <div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e9ecef;">
      <div style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #6c757d; margin-bottom: 4px;">Observações do Nutricionista</div>
      <div style="font-size: 11px; line-height: 1.5; color: #333;">${escapeHtml(cleanClinicalText(data.notes || ""))}</div>
    </div>
  ` : ""}

  ${sortedDays.map(dayKey => {
    const dayItems = groupedByDay[dayKey];
    const dayName = dayKey === -1 ? "" : (DAY_NAMES[dayKey] || `Dia ${dayKey}`);
    const isSingleDay = data.planMode === 'single_day';
    const showDayHeader = !isSingleDay && sortedDays.length > 1 && dayKey !== -1;

    const processedNormalized = new Set(mealOrder.map(normalizeType));

    const mealTypeGroups = mealOrder.map(mType => {
      const typeItems = dayItems.filter(i => normalizeType(i.mealType) === normalizeType(mType));
      if (typeItems.length === 0) return "";
      return renderMealTypeItems(typeItems, mType);
    });

    const remainingItems = dayItems.filter(i => !processedNormalized.has(normalizeType(i.mealType)));
    const remainingGroups = [...new Set(remainingItems.map(i => i.mealType))].map(mType => {
      const typeItems = remainingItems.filter(i => normalizeType(i.mealType) === normalizeType(mType));
      return renderMealTypeItems(typeItems, mType);
    });

    const filteredGroups = [...mealTypeGroups, ...remainingGroups].filter(g => g !== "");
    return `
      <div class="day-section">
        ${showDayHeader ? `<div class="day-header"><div class="day-name">${dayName}</div></div>` : ""}
        ${filteredGroups.join("")}
      </div>
    `;
  }).join("")}

  <div class="watermark">FITJOURNEY</div>


  </div>
    <div class="premium-footer">
      <div class="footer-brand">Fit<span style="color: #D4A84B">Journey</span></div>
      <div>Plano Alimentar Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
      <div style="font-size: 8px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">Documento Confidencial • Direitos Reservados</div>
    </div>
    <div style="margin-bottom: 40px;"></div>
</body></html>`;

  return html;
}

export function generatePremiumMealPlanPDF(data: PremiumMealPlanPDFData) {
  const html = buildPremiumMealPlanHTML(data);
  openPremiumPrintWindow(html, `plano-alimentar-${data.patientName.replace(/\s+/g, '-').toLowerCase()}`);
}

function openPremiumPrintWindow(html: string, title: string) {
  if (typeof window === 'undefined') return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback if popup is blocked
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }

  printWindow.document.write(html);
  printWindow.document.title = title;
  printWindow.document.close();
  
  // Wait for fonts/resources to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}
