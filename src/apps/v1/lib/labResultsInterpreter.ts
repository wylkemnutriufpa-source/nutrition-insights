/**
 * Lab Results Interpreter Engine
 * Applies deterministic rules from lab_marker_rules to structured lab data.
 */
import { supabase } from "@v1/integrations/supabase/client";

export interface LabMarkerRule {
  id: string;
  marker_key: string;
  marker_name: string;
  operator: string;
  threshold_value: number;
  threshold_max: number | null;
  gender_filter: string | null;
  generated_flag: string;
  category: string;
  severity: string;
  suggested_strategy: string;
  clinical_note: string;
}

export interface LabFlag {
  flag_key: string;
  marker_key: string;
  marker_name: string;
  marker_value: number;
  category: string;
  severity: string;
  suggested_strategy: string;
  clinical_note: string;
}

export interface LabInterpretationResult {
  flags: LabFlag[];
  summary: string;
  risk_level: "normal" | "moderado" | "alto" | "critico";
}

function evaluateRule(value: number, rule: LabMarkerRule): boolean {
  switch (rule.operator) {
    case 'gt': return value > rule.threshold_value;
    case 'gte': return value >= rule.threshold_value;
    case 'lt': return value < rule.threshold_value;
    case 'lte': return value <= rule.threshold_value;
    case 'eq': return value === rule.threshold_value;
    case 'between': return rule.threshold_max !== null && value >= rule.threshold_value && value <= rule.threshold_max;
    default: return false;
  }
}

export async function interpretLabResults(
  structuredJson: Record<string, number>,
  gender?: 'male' | 'female'
): Promise<LabInterpretationResult> {
  // Fetch rules
  const { data: rules } = await supabase
    .from("lab_marker_rules" as any)
    .select("*")
    .eq("is_active", true);

  if (!rules || rules.length === 0) {
    return { flags: [], summary: "Sem regras de interpretação configuradas.", risk_level: "normal" };
  }

  const flags: LabFlag[] = [];

  for (const [marker, value] of Object.entries(structuredJson)) {
    if (typeof value !== 'number' || isNaN(value)) continue;

    const applicableRules = (rules as unknown as LabMarkerRule[]).filter(r => {
      if (r.marker_key !== marker) return false;
      if (r.gender_filter && gender && r.gender_filter !== gender) return false;
      if (r.gender_filter && !gender) return true; // apply if gender unknown
      return true;
    });

    for (const rule of applicableRules) {
      if (evaluateRule(value, rule)) {
        // Avoid duplicate flags
        if (!flags.some(f => f.flag_key === rule.generated_flag)) {
          flags.push({
            flag_key: rule.generated_flag,
            marker_key: rule.marker_key,
            marker_name: rule.marker_name,
            marker_value: value,
            category: rule.category,
            severity: rule.severity,
            suggested_strategy: rule.suggested_strategy,
            clinical_note: rule.clinical_note,
          });
        }
      }
    }
  }

  // Determine risk level
  let risk_level: LabInterpretationResult["risk_level"] = "normal";
  if (flags.some(f => f.severity === "critica")) risk_level = "critico";
  else if (flags.some(f => f.severity === "alta")) risk_level = "alto";
  else if (flags.some(f => f.severity === "moderada")) risk_level = "moderado";

  const summary = flags.length === 0
    ? "Todos os marcadores dentro dos parâmetros normais."
    : `${flags.length} alteração(ões) encontrada(s). ${flags.filter(f => f.severity === 'alta' || f.severity === 'critica').length} de alta prioridade.`;

  return { flags, summary, risk_level };
}

// Common lab markers for structured extraction from text
export const LAB_MARKER_PATTERNS: Record<string, RegExp[]> = {
  vitamin_d: [/(?:vitamina d|25-oh|25oh|vit\.?\s*d)[:\s]*(\d{1,3}[.,]?\d*)/i],
  ferritin: [/(?:ferritina|ferritin)[:\s]*(\d{1,4}[.,]?\d*)/i],
  hemoglobin: [/(?:hemoglobina|hb|hgb)[:\s]*(\d{1,2}[.,]?\d*)/i],
  glucose_fasting: [/(?:glicose|glucose|glicemia)[:\s]*(\d{2,3}[.,]?\d*)/i],
  hba1c: [/(?:hemoglobina glicada|hba1c|a1c)[:\s]*(\d{1,2}[.,]?\d*)/i],
  triglycerides: [/(?:triglicerideos|triglycerides|triglicerides)[:\s]*(\d{2,4}[.,]?\d*)/i],
  hdl: [/(?:hdl)[:\s]*(\d{2,3}[.,]?\d*)/i],
  ldl: [/(?:ldl)[:\s]*(\d{2,3}[.,]?\d*)/i],
  total_cholesterol: [/(?:colesterol total|total cholesterol)[:\s]*(\d{2,4}[.,]?\d*)/i],
  tsh: [/(?:tsh)[:\s]*(\d{1,2}[.,]?\d*)/i],
  t4_free: [/(?:t4 livre|t4 free|ft4)[:\s]*(\d{1,2}[.,]?\d*)/i],
  creatinine: [/(?:creatinina|creatinine)[:\s]*(\d{1,2}[.,]?\d*)/i],
  uric_acid: [/(?:acido urico|uric acid)[:\s]*(\d{1,2}[.,]?\d*)/i],
  vitamin_b12: [/(?:vitamina b12|b12|cobalamina)[:\s]*(\d{2,5}[.,]?\d*)/i],
  folate: [/(?:acido folico|folato|folate)[:\s]*(\d{1,3}[.,]?\d*)/i],
  iron_serum: [/(?:ferro serico|ferro|iron)[:\s]*(\d{2,4}[.,]?\d*)/i],
  calcium: [/(?:calcio|calcium)[:\s]*(\d{1,2}[.,]?\d*)/i],
  magnesium: [/(?:magnesio|magnesium)[:\s]*(\d{1,2}[.,]?\d*)/i],
  alt: [/(?:tgp|alt)[:\s]*(\d{1,4}[.,]?\d*)/i],
  ast: [/(?:tgo|ast)[:\s]*(\d{1,4}[.,]?\d*)/i],
  ggt: [/(?:ggt|gama gt)[:\s]*(\d{1,4}[.,]?\d*)/i],
  pcr: [/(?:pcr|proteina c reativa|c-reactive)[:\s]*(\d{1,3}[.,]?\d*)/i],
  insulin_fasting: [/(?:insulina|insulin)[:\s]*(\d{1,3}[.,]?\d*)/i],
  cortisol: [/(?:cortisol)[:\s]*(\d{1,3}[.,]?\d*)/i],
  albumin: [/(?:albumina|albumin)[:\s]*(\d{1,2}[.,]?\d*)/i],
};

export function extractLabMarkersFromText(text: string): Record<string, number> {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const results: Record<string, number> = {};

  for (const [key, patterns] of Object.entries(LAB_MARKER_PATTERNS)) {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const val = parseFloat(match[1].replace(",", "."));
        if (!isNaN(val)) {
          results[key] = val;
          break;
        }
      }
    }
  }

  return results;
}
