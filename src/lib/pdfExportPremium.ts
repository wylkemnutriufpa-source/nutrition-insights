// PDF Export V3 Soberano - Passive Renderer
// ESTA VERSÃO É 100% BASEADA EM SNAPSHOTS V3
import { assertHierarchyIntegrity, DisplayMealPlanItem } from "./legacy/mealPlanDisplay";

/**
 * Premium Meal Plan PDF Export — FitJourney V3 Soberano
 */

interface MealPlanPDFItem {
  id?: string;
  mealType: string;
  title: string;
  description?: string;
  meta_calorias?: number;
  meta_proteinas?: number;
  meta_carboidratos?: number;
  meta_gorduras?: number;
  day_of_week?: number;
  scheduled_time?: string;
  visual_image_url?: string;
  is_primary?: boolean;
  substitution_group_id?: string | null;
  // --- SOBERANIA V3 ---
  display_quantity?: string | number | null;
  display_unit?: string | null;
  clinical_mass_g?: number | null;
  editor_version?: string | null;
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
  /**
   * ── Onda 2A — opcional, MODO PASSIVO ──
   * Se presente, o gerador dispara em background a leitura do snapshot
   * persistido em `meal_plans.snapshot` e loga divergências no console.
   * NUNCA bloqueia, NUNCA altera o render. Pode ser omitido sem efeito.
   */
  mealPlanId?: string;
}

const MEAL_LABELS: Record<string, { label: string; color: string }> = {
  breakfast: { label: "Café da Manhã", color: "#6366f1" },
  cafe_da_manha: { label: "Café da Manhã", color: "#6366f1" },
  morning_snack: { label: "Lanche da Manhã", color: "#10b981" },
  lanche_da_manha: { label: "Lanche da Manhã", color: "#10b981" },
  snack_1: { label: "Lanche da Manhã", color: "#10b981" },
  lunch: { label: "Almoço", color: "#f59e0b" },
  almoco: { label: "Almoço", color: "#f59e0b" },
  afternoon_snack: { label: "Lanche da Tarde", color: "#ec4899" },
  lanche_da_tarde: { label: "Lanche da Tarde", color: "#ec4899" },
  snack: { label: "Lanche", color: "#ec4899" },
  snack_2: { label: "Lanche da Tarde", color: "#ec4899" },
  pre_workout: { label: "Pré-Treino", color: "#ef4444" },
  post_workout: { label: "Pós-Treino", color: "#3b82f6" },
  dinner: { label: "Jantar", color: "#6366f1" },
  jantar: { label: "Jantar", color: "#6366f1" },
  evening_snack: { label: "Ceia", color: "#8b5cf6" },
  ceia: { label: "Ceia", color: "#8b5cf6" },
  supper: { label: "Ceia", color: "#8b5cf6" },
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
  "Café da Manhã",
  "Lanche da Manhã",
  "Almoço",
  "Lanche da Tarde",
  "Jantar",
  "Ceia",
] as const;

type CanonicalMealType = typeof FIXED_MEAL_TYPE_ORDER[number];

const MEAL_TYPE_ALIASES: Record<string, CanonicalMealType> = {
  breakfast: "Café da Manhã",
  cafe: "Café da Manhã",
  cafe_da_manha: "Café da Manhã",
  cafe_manha: "Café da Manhã",
  desjejum: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lanche_da_manha: "Lanche da Manhã",
  lanche_manha: "Lanche da Manhã",
  colacao: "Lanche da Manhã",
  snack_1: "Lanche da Manhã",
  lunch: "Almoço",
  almoco: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  lanche_da_tarde: "Lanche da Tarde",
  lanche_tarde: "Lanche da Tarde",
  snack: "Lanche da Tarde",
  snack_2: "Lanche da Tarde",
  dinner: "Jantar",
  jantar: "Jantar",
  evening_snack: "Ceia",
  ceia: "Ceia",
  supper: "Ceia",
  lanche_da_noite: "Ceia",
  lanche_noite: "Ceia",
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


function formatPortionText(item: { display_quantity?: any; display_unit?: any; clinical_mass_g?: any; description?: string | null }): string {
  // SOBERANIA V3: prioriza clinical_mass_g (verdade clínica) sobre placeholders
  // tipo "1 g" / "1" / "" que vinham de display_quantity = quantity (multiplicador).
  const rawQty = item.display_quantity;
  const dUnit = (item.display_unit ?? "").toString().trim();
  const cMass = Number(item.clinical_mass_g);
  const hasMass = Number.isFinite(cMass) && cMass > 1;

  const dqStr = rawQty == null ? "" : String(rawQty).trim();
  // Placeholders inúteis: vazio, "1", "1g", "1 g"
  const isPlaceholder = dqStr === "" || /^1\s*g?$/i.test(dqStr);

  if (isPlaceholder && hasMass) return `${Math.round(cMass)} g`;

  if (dqStr) {
    // Se já contém unidade (ex.: "3 colheres", "100 g"), devolve direto
    if (/[a-zà-ú]/i.test(dqStr)) return dqStr;
    return dUnit ? `${dqStr} ${dUnit}`.trim() : dqStr;
  }

  if (hasMass) return `${Math.round(cMass)} g`;
  return (item.description || "").toString();
}

function formatSubstitutionDetail(sub: MealPlanPDFItem, _primary: MealPlanPDFItem): string {
  return formatPortionText(sub);
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
  
  const auditMarkers = [
    "AUDITORIA CLÍNICA",
    "TRILHA DE REGRAS",
    "Motor de Cálculo",
    "Clinical Engine",
    "Timestamp:",
    "Protocolo:",
    "MEAL_KCAL_SPLIT",
    "Status: Validado",
    "Divergência Detectada",
    "Hash:",
    "Engine:"
  ];

  let cleaned = text;
  
  // Remove technical symbols
  cleaned = cleaned.replace(/[Ø=Ý]+/g, "");
  // Remove emojis and pictographs for PDF compatibility
  cleaned = cleaned.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "");
  // Remove control characters
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F]/g, " ");

  const lines = cleaned.split("\n");
  const filteredLines = lines.filter(line => {
    const upperLine = line.toUpperCase().trim();
    if (!upperLine) return false;
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
  // 🛡️ ASSERT: Auditoria de hierarquia antes de processar PDF
  items.forEach(item => assertHierarchyIntegrity(item as unknown as DisplayMealPlanItem, "pdfExportPremium_items"));

  // 🛡️ SOBERANIA V3: Filtra apenas itens que são primários
  return items.filter(item => item.is_primary === true);
}

function calculateDisplayTotals(data: PremiumMealPlanPDFData) {
  // SOBERANIA V3: O PDF não recalcula nem corrige metas. Ele usa o que foi definido no editor.
  return {
    calories: Math.round(data.targetCalories || 0),
    protein: Math.round(data.targetProtein || 0),
    carbs: Math.round(data.targetCarbs || 0),
    fat: Math.round(data.targetFat || 0),
  };
}


function buildPremiumCSS(): string {
  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

      @page {
        margin: 0;
        size: A4;
      }

      .print-container {
        padding: 15mm 12mm;
        min-height: 100vh;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: 'Inter', -apple-system, sans-serif;
        color: #0f172a;
        background: #ffffff;
        font-size: 11px;
        line-height: 1.5;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .page-content {
        padding: 0 28px 24px 28px;
        position: relative;
      }

      /* Estilo Premium para o Header */
      .premium-header {
        background: #0f172a;
        padding: 35px 40px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 0 0 60px 60px;
        color: white;
        box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        position: relative;
        overflow: hidden;
        border-bottom: 2px solid rgba(212, 168, 75, 0.3);
        page-break-inside: avoid;
      }

      .premium-header::after {
        content: '';
        position: absolute;
        top: -100px;
        right: -100px;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(212, 168, 75, 0.15) 0%, transparent 70%);
        border-radius: full;
      }

      .logo-text {
        font-family: 'Playfair Display', serif;
        font-size: 48px;
        font-weight: 900;
        letter-spacing: -0.05em;
        line-height: 0.85;
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
        background: #fdfcf9;
        border: 1px solid #f1e6d0;
        border-radius: 15px;
        padding: 15px 10px;
        text-align: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.02);
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
      .day-section { margin-bottom: 24px; page-break-inside: auto; }
      .day-section:first-of-type { page-break-before: auto; }

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
        border: 2px solid #f1f5f9;
        border-radius: 20px;
        margin-bottom: 20px;
        overflow: hidden;
        background: #ffffff;
        page-break-inside: avoid;
        box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      }

      .meal-header-row {
        background: linear-gradient(to right, #f8fafc, #ffffff);
        padding: 15px 24px;
        border-bottom: 2px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .meal-group-container {
        page-break-inside: avoid;
        margin-bottom: 12px;
      }
      .meal-group-container:last-child {
        margin-bottom: 0;
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
  
  // SOBERANIA V3: O PDF é um renderizador PASSIVO. Ele não rotaciona, não expande e não infere.
  // Ele apenas organiza os itens recebidos por dia e refeição.
  const printItems = data.items || [];

  const renderMealTypeItems = (typeItems: MealPlanPDFItem[], mType: string) => {
    const canonicalType = resolveCanonicalMealType(mType);
    const mealInfo = MEAL_LABELS[String(canonicalType)] || MEAL_LABELS[mType] || { label: mType, color: "#94a3b8" };

    const primaries = typeItems.filter(i => i.is_primary);
    const substitutions = typeItems.filter(i => !i.is_primary);
    
    const totalKcal = primaries.reduce((sum, i) => sum + (i.meta_calorias || 0), 0);

    const renderItemLine = (item: MealPlanPDFItem) => {
      const portionText = formatPortionText(item);
      const kcal = Math.round(item.meta_calorias || 0);
      const prot = Math.round(item.meta_proteinas || 0);
      const carb = Math.round(item.meta_carboidratos || 0);
      const fat = Math.round(item.meta_gorduras || 0);

      return `
        <div class="food-line" style="margin-bottom: 8px; border-bottom: 1px solid #f8fafc; padding-bottom: 4px;">
          <span class="food-bullet" style="background: ${mealInfo.color}; margin-top: 5px;"></span>
          <div style="display: flex; flex-direction: column; flex: 1;">
            <span style="font-weight: 700; color: #1e293b; font-size: 11px;">${escapeHtml(item.title)}</span>
            <span style="font-size: 10px; font-weight: 600; color: #6366f1;">${escapeHtml(portionText)}</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; margin-left: 10px;">
            <div style="text-align: right; min-width: 45px;">
              <div style="font-size: 9px; font-weight: 700; color: #1e293b;">${kcal} <span style="font-size: 7px; color: #94a3b8;">kcal</span></div>
            </div>
            <div style="display: flex; gap: 4px; font-size: 8px; font-weight: 600;">
              <span style="color: #ef4444;">P: ${prot}g</span>
              <span style="color: #f59e0b;">C: ${carb}g</span>
              <span style="color: #3b82f6;">G: ${fat}g</span>
            </div>
          </div>
        </div>
      `;
    };

    const renderSubstitutions = () => {
      if (substitutions.length === 0) return "";
      
      // Agrupar substituições por grupo para saber "o que substitui o que"
      const subGroups: Record<string, MealPlanPDFItem[]> = {};
      substitutions.forEach(s => {
        const gId = s.substitution_group_id || 'orphan';
        if (!subGroups[gId]) subGroups[gId] = [];
        subGroups[gId].push(s);
      });

      return `
        <div class="substitution-box" style="margin-top: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px;">
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px;">Opções de Troca</div>
          ${Object.entries(subGroups).map(([gId, items]) => {
            const targetPrimary = primaries.find(p => p.substitution_group_id === gId);
            const targetName = targetPrimary ? targetPrimary.title : "Itens acima";
            
            return `
              <div style="margin-bottom: 8px; last-child: margin-bottom: 0;">
                <div style="font-size: 9px; font-weight: 700; color: #94a3b8; margin-bottom: 4px;">Substituindo ${escapeHtml(targetName)}:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${items.map(sub => {
                    const subPortion = formatSubstitutionDetail(sub, sub); // Use sub's own detail
                    return `
                      <div style="background: #fff; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 10px;">
                        <span style="font-weight: 600; color: #334155;">${escapeHtml(sub.title)}</span>
                        ${subPortion ? `<span style="color: #94a3b8; font-size: 9px;"> (${escapeHtml(subPortion)})</span>` : ""}
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    };

    return `
      <div class="meal-row">
        <div class="meal-header-row">
          <div class="meal-title-group">
            <span class="meal-label-tag" style="background: ${mealInfo.color}">${mealInfo.label}</span>
          </div>
          <div class="meal-kcal-badge">${Math.round(totalKcal)} kcal</div>
        </div>
        <div class="meal-body">
          <div class="primary-items-list">
            ${primaries.map(renderItemLine).join("")}
          </div>
          ${renderSubstitutions()}
        </div>
      </div>
    `;
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

  const mealOrder = [...FIXED_MEAL_TYPE_ORDER];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(data.planTitle)}</title>
  ${buildPremiumCSS()}
</head>
<body>
  <div class="print-container">
  <div class="premium-header">
    <div class="logo-text">
      <span class="logo-fit">Fit</span><span class="logo-journey">Journey</span>
      <div style="font-size: 8px; font-family: 'Montserrat', sans-serif; font-weight: 900; letter-spacing: 2px; color: #D4A84B; margin-top: 5px; opacity: 0.8;">✨ PROTOCOLO SOBERANO</div>
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

    const processedCanonical = new Set(mealOrder);

    const mealTypeGroups = mealOrder.map(mType => {
      const typeItems = dayItems.filter(i => resolveCanonicalMealType(i.mealType) === mType);
      if (typeItems.length === 0) return "";
      return renderMealTypeItems(typeItems, mType);
    });

    const remainingItems = dayItems.filter(i => !processedCanonical.has(resolveCanonicalMealType(i.mealType) as CanonicalMealType));
    const remainingTypes = [...new Set(remainingItems.map(i => resolveCanonicalMealType(i.mealType)))].sort();
    const remainingGroups = remainingTypes.map(mType => {
      const typeItems = remainingItems.filter(i => resolveCanonicalMealType(i.mealType) === mType);
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
  </div>
</body></html>`;

  return html;
}

export function generatePremiumMealPlanPDF(data: PremiumMealPlanPDFData) {
  // 🛡️ Monitoramento Soberano no PDF
  console.log('[Sovereignty] Iniciando Exportação PDF Soberana...');
  const isV3 = data.items.every(i => i.editor_version === 'v3' || (i as any).clinical_mass_g);
  
  if (!isV3) {
    console.warn('[V3-TRAIÇÃO] PDF sendo gerado com dados que podem conter lógica legada.');
  }

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
    }, 1000); // Increased delay for stability
  };

  // Fallback: If onload doesn't fire (some browsers/conditions)
  setTimeout(() => {
    if (printWindow.document.readyState === 'complete') {
      // already printing or handled
    } else {
      printWindow.print();
    }
  }, 3000);
}
