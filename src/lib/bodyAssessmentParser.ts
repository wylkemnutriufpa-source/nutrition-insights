/**
 * Body Assessment Deterministic Parser v1.0
 * Extracts anthropometric data from text using regex patterns.
 * No AI/LLM dependency.
 */

export interface ParsedBodyAssessment {
  weight_kg?: number;
  height_m?: number;
  bmi?: number;
  body_fat_percent?: number;
  lean_mass_kg?: number;
  fat_mass_kg?: number;
  waist_cm?: number;
  hip_cm?: number;
  abdomen_cm?: number;
  chest_cm?: number;
  arm_cm?: number;
  thigh_cm?: number;
  calf_cm?: number;
  visceral_fat_level?: number;
  metabolic_age?: number;
  hydration_percent?: number;
  bone_mass_kg?: number;
  waist_hip_ratio?: number;
}

export interface ParsedSkinfolds {
  triceps_mm?: number;
  biceps_mm?: number;
  subscapular_mm?: number;
  suprailiac_mm?: number;
  abdominal_mm?: number;
  thigh_mm?: number;
  chest_mm?: number;
  axillary_mm?: number;
}

export interface ParserWarning {
  field: string;
  message: string;
  value?: number;
}

export interface ParseResult {
  assessment: ParsedBodyAssessment;
  skinfolds: ParsedSkinfolds;
  warnings: ParserWarning[];
  fieldsDetected: string[];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function extractNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    console.log(`[Parser DEBUG] Testing pattern ${pattern} against "${text}": match=${!!match}`);
    if (match) {
      const raw = match[1].replace(",", ".");
      const val = parseFloat(raw);
      if (!isNaN(val)) return val;
    }
  }
  return undefined;
}

const VALIDATION_RANGES: Record<string, [number, number]> = {
  weight_kg: [20, 350],
  height_m: [1.2, 2.3],
  bmi: [10, 60],
  body_fat_percent: [2, 70],
  lean_mass_kg: [15, 150],
  fat_mass_kg: [1, 200],
  waist_cm: [30, 250],
  hip_cm: [30, 250],
  abdomen_cm: [30, 250],
  chest_cm: [30, 200],
  arm_cm: [10, 80],
  thigh_cm: [20, 120],
  calf_cm: [15, 80],
  visceral_fat_level: [1, 60],
  metabolic_age: [10, 120],
  hydration_percent: [20, 80],
  bone_mass_kg: [0.5, 10],
};

function validateValue(field: string, value: number | undefined, warnings: ParserWarning[]): number | undefined {
  if (value === undefined) return undefined;
  const range = VALIDATION_RANGES[field];
  if (!range) return value;
  if (value < range[0] || value > range[1]) {
    warnings.push({ field, message: `Valor ${value} fora do range esperado (${range[0]}-${range[1]})`, value });
    return undefined;
  }
  return value;
}

export function parseBodyAssessment(rawText: string): ParseResult {
  const text = normalizeText(rawText);
  const warnings: ParserWarning[] = [];
  const fieldsDetected: string[] = [];

  // Extract body measurements
  const rawAssessment: Record<string, number | undefined> = {};

  const fieldPatterns: Record<string, RegExp[]> = {
    weight_kg: [
      /(?:peso|massa corporal|weight).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
      /(\d{2,3}(?:[.,]\d+)?)\s*kg/,
    ],
    height_m: [
      /(?:altura|estatura|height).{0,10}(\d(?:[.,]\d{2}))/,
      /(?:altura|estatura).{0,10}(\d{3})\s*(?:cm)?/,
    ],
    bmi: [
      /(?:imc|bmi).{0,10}(\d{1,2}(?:[.,]\d+)?)/,
    ],
    body_fat_percent: [
      /(?:%\s*gordura|gordura corporal|body fat|bf|percentual de gordura).{0,10}(\d{1,2}(?:[.,]\d+)?)/,
      /gordura.{0,10}(\d{1,2}(?:[.,]\d+)?)\s*%/,
    ],
    lean_mass_kg: [
      /(?:massa magra|lean mass|massa muscular).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
    ],
    fat_mass_kg: [
      /(?:massa gorda|fat mass|massa de gordura).{0,10}(\d{1,3}(?:[.,]\d+)?)/,
    ],
    waist_cm: [
      /(?:cintura|waist).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
    ],
    hip_cm: [
      /(?:quadril|hip).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
    ],
    abdomen_cm: [
      /(?:abdomen|abdominal).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
    ],
    chest_cm: [
      /(?:peitoral|torax|peito|chest).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
    ],
    arm_cm: [
      /(?:braco|arm).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
    ],
    thigh_cm: [
      /(?:coxa|thigh).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
    ],
    calf_cm: [
      /(?:panturrilha|calf).{0,10}(\d{2,3}(?:[.,]\d+)?)/,
    ],
    visceral_fat_level: [
      /(?:gordura visceral|visceral fat|visceral).{0,10}(\d{1,2}(?:[.,]\d+)?)/,
    ],
    metabolic_age: [
      /(?:idade metabolica|metabolic age).{0,10}(\d{1,3}(?:[.,]\d+)?)/,
    ],
    hydration_percent: [
      /(?:hidratacao|water|tbw|agua corporal).{0,10}(\d{1,2}(?:[.,]\d+)?)/,
    ],
    bone_mass_kg: [
      /(?:massa ossea|bone mass).{0,10}(\d{1,2}(?:[.,]\d+)?)/,
    ],
  };

  for (const [field, patterns] of Object.entries(fieldPatterns)) {
    let value = extractNumber(text, patterns);
    
    // Special handling: convert height 170 -> 1.70
    if (field === 'height_m' && value && value > 100) {
      value = value / 100;
    }

    value = validateValue(field, value, warnings);
    if (value !== undefined) {
      rawAssessment[field] = value;
      fieldsDetected.push(field);
    }
  }

  // Calculate waist-hip ratio
  if (rawAssessment.waist_cm && rawAssessment.hip_cm) {
    rawAssessment.waist_hip_ratio = Math.round((rawAssessment.waist_cm / rawAssessment.hip_cm) * 100) / 100;
    fieldsDetected.push('waist_hip_ratio');
  }

  // Calculate BMI if not found
  if (!rawAssessment.bmi && rawAssessment.weight_kg && rawAssessment.height_m) {
    rawAssessment.bmi = Math.round((rawAssessment.weight_kg / (rawAssessment.height_m ** 2)) * 10) / 10;
    fieldsDetected.push('bmi');
  }

  // Extract skinfolds
  const skinfoldPatterns: Record<string, RegExp[]> = {
    triceps_mm: [/(?:tricipital|triceps)[:\s]*(\d{1,2}(?:[.,]\d+)?)/],
    biceps_mm: [/(?:bicipital|biceps)[:\s]*(\d{1,2}(?:[.,]\d+)?)/],
    subscapular_mm: [/(?:subescapular|subscapular)[:\s]*(\d{1,2}(?:[.,]\d+)?)/],
    suprailiac_mm: [/(?:suprailiaca|suprailiac)[:\s]*(\d{1,2}(?:[.,]\d+)?)/],
    abdominal_mm: [/(?:abdominal)[:\s]*(\d{1,2}(?:[.,]\d+)?)(?:\s*mm)?/],
    thigh_mm: [/(?:coxa|thigh)[:\s]*(\d{1,2}(?:[.,]\d+)?)(?:\s*mm)?/],
    chest_mm: [/(?:peitoral|chest)[:\s]*(\d{1,2}(?:[.,]\d+)?)(?:\s*mm)?/],
    axillary_mm: [/(?:axilar media|axilar|axillary)[:\s]*(\d{1,2}(?:[.,]\d+)?)/],
  };

  const skinfolds: ParsedSkinfolds = {};
  for (const [field, patterns] of Object.entries(skinfoldPatterns)) {
    const value = extractNumber(text, patterns);
    if (value !== undefined && value > 0 && value < 100) {
      (skinfolds as any)[field] = value;
      fieldsDetected.push(field);
    }
  }

  return {
    assessment: rawAssessment as ParsedBodyAssessment,
    skinfolds,
    warnings,
    fieldsDetected,
  };
}

// Body composition flags generation
export interface BodyCompositionFlag {
  flag_key: string;
  category: string;
  severity: string;
  clinical_note: string;
}

export function generateBodyCompositionFlags(
  assessment: ParsedBodyAssessment,
  gender?: 'male' | 'female'
): BodyCompositionFlag[] {
  const flags: BodyCompositionFlag[] = [];

  if (assessment.body_fat_percent) {
    if (gender === 'male' && assessment.body_fat_percent > 25) {
      flags.push({ flag_key: 'high_body_fat_male', category: 'metabolico', severity: 'moderada', clinical_note: 'Percentual de gordura elevado' });
    }
    if (gender === 'female' && assessment.body_fat_percent > 32) {
      flags.push({ flag_key: 'high_body_fat_female', category: 'metabolico', severity: 'moderada', clinical_note: 'Percentual de gordura elevado' });
    }
    if (gender === 'male' && assessment.body_fat_percent < 8) {
      flags.push({ flag_key: 'very_low_body_fat_male', category: 'metabolico', severity: 'alta', clinical_note: 'Percentual de gordura muito baixo' });
    }
    if (gender === 'female' && assessment.body_fat_percent < 16) {
      flags.push({ flag_key: 'very_low_body_fat_female', category: 'metabolico', severity: 'alta', clinical_note: 'Percentual de gordura muito baixo' });
    }
  }

  if (assessment.waist_cm) {
    if (gender === 'male' && assessment.waist_cm > 102) {
      flags.push({ flag_key: 'abdominal_cardiometabolic_risk_male', category: 'metabolico', severity: 'alta', clinical_note: 'Risco cardiometabólico abdominal' });
    }
    if (gender === 'female' && assessment.waist_cm > 88) {
      flags.push({ flag_key: 'abdominal_cardiometabolic_risk_female', category: 'metabolico', severity: 'alta', clinical_note: 'Risco cardiometabólico abdominal' });
    }
  }

  if (assessment.waist_hip_ratio && assessment.waist_hip_ratio > 0.9) {
    flags.push({ flag_key: 'central_obesity_risk', category: 'metabolico', severity: 'moderada', clinical_note: 'Risco de obesidade central' });
  }

  if (assessment.bmi) {
    if (assessment.bmi > 30) {
      flags.push({ flag_key: 'obesity_risk', category: 'metabolico', severity: 'alta', clinical_note: 'IMC compatível com obesidade' });
    }
    if (assessment.bmi < 18.5) {
      flags.push({ flag_key: 'underweight_risk', category: 'metabolico', severity: 'moderada', clinical_note: 'IMC abaixo do peso' });
    }
  }

  return flags;
}
