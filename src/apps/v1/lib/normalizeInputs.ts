/**
 * FitJourney — Smart Human Input Normalization
 * 
 * Interprets common human input formats for health measurements.
 * Handles commas, units, spaces, and ambiguous values.
 */

export interface NormalizationResult {
  /** The normalized numeric value, or null if unparseable */
  value: number | null;
  /** The original raw input */
  raw: string;
  /** Human-friendly message about what was interpreted */
  message: string;
  /** Whether the value is valid and can be saved */
  isValid: boolean;
  /** Whether auto-correction was applied */
  wasCorrected: boolean;
}

// ============ Core Normalizer ============

/** Strip units, whitespace, and normalize decimal separator */
function cleanNumericString(input: string): string {
  let s = input.trim().toLowerCase();
  // Remove common unit suffixes
  s = s.replace(/\s*(kg|kgs|quilos|kilos|cm|cms|centímetros|centimetros|m|metros|litros|l|hrs?|horas?|copos?|glasses?|cups?)\s*$/i, "");
  // Replace comma with dot
  s = s.replace(",", ".");
  // Remove any remaining non-numeric chars except dot and minus
  s = s.replace(/[^\d.\-]/g, "");
  return s;
}

/** Generic numeric input normalizer */
export function normalizeNumericInput(input: string): number | null {
  if (!input || !input.trim()) return null;
  const cleaned = cleanNumericString(input);
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ============ Height ============

export function normalizeHeightInput(input: string): NormalizationResult {
  const raw = input;
  if (!input || !input.trim()) {
    return { value: null, raw, message: "", isValid: false, wasCorrected: false };
  }

  const cleaned = cleanNumericString(input);
  const n = parseFloat(cleaned);

  if (!Number.isFinite(n) || n <= 0) {
    return { value: null, raw, message: "Digite a altura. Ex: 158 ou 1,58 m", isValid: false, wasCorrected: false };
  }

  // Meters range: 0.5 to 2.5 → convert to cm
  if (n >= 0.5 && n <= 2.5) {
    const cm = Math.round(n * 100);
    return {
      value: cm,
      raw,
      message: `Altura identificada como ${cm} cm`,
      isValid: true,
      wasCorrected: true,
    };
  }

  // Centimeters range: 50 to 250
  if (n >= 50 && n <= 250) {
    const cm = Math.round(n);
    return {
      value: cm,
      raw,
      message: `Altura: ${cm} cm ✓`,
      isValid: true,
      wasCorrected: n !== cm,
    };
  }

  return {
    value: null,
    raw,
    message: "Valor fora do esperado. Use cm (ex: 158) ou metros (ex: 1,58)",
    isValid: false,
    wasCorrected: false,
  };
}

// ============ Weight ============

export function normalizeWeightInput(input: string): NormalizationResult {
  const raw = input;
  if (!input || !input.trim()) {
    return { value: null, raw, message: "", isValid: false, wasCorrected: false };
  }

  const cleaned = cleanNumericString(input);
  const n = parseFloat(cleaned);

  if (!Number.isFinite(n) || n <= 0) {
    return { value: null, raw, message: "Digite o peso. Ex: 70 ou 70,5", isValid: false, wasCorrected: false };
  }

  // Reasonable weight range: 20-350 kg
  if (n >= 20 && n <= 350) {
    const rounded = Math.round(n * 10) / 10;
    return {
      value: rounded,
      raw,
      message: `Peso: ${rounded} kg ✓`,
      isValid: true,
      wasCorrected: false,
    };
  }

  // Maybe grams? (e.g., 70500 → 70.5 kg)
  if (n >= 20000 && n <= 350000) {
    const kg = Math.round((n / 1000) * 10) / 10;
    return {
      value: kg,
      raw,
      message: `Peso identificado como ${kg} kg`,
      isValid: true,
      wasCorrected: true,
    };
  }

  return {
    value: null,
    raw,
    message: "Peso fora do esperado (20-350 kg). Ex: 70,5",
    isValid: false,
    wasCorrected: false,
  };
}

// ============ Water (copos or liters) ============

export function normalizeWaterInput(input: string): NormalizationResult {
  const raw = input;
  if (!input || !input.trim()) {
    return { value: null, raw, message: "", isValid: false, wasCorrected: false };
  }

  const cleaned = cleanNumericString(input);
  const n = parseFloat(cleaned);

  if (!Number.isFinite(n) || n < 0) {
    return { value: null, raw, message: "Digite a quantidade. Ex: 8 copos ou 2 litros", isValid: false, wasCorrected: false };
  }

  const lowerInput = input.toLowerCase();
  const isLiters = /litro|litros|l\b/.test(lowerInput);

  if (isLiters && n >= 0.5 && n <= 10) {
    const cups = Math.round(n * 4); // 1 liter ≈ 4 cups (250ml)
    return {
      value: cups,
      raw,
      message: `${n}L ≈ ${cups} copos de 250ml ✓`,
      isValid: true,
      wasCorrected: true,
    };
  }

  // Cups range: 0-30
  if (n >= 0 && n <= 30) {
    return {
      value: Math.round(n),
      raw,
      message: `${Math.round(n)} copos ✓`,
      isValid: true,
      wasCorrected: false,
    };
  }

  // ml range: 200-8000
  if (n >= 200 && n <= 8000) {
    const cups = Math.round(n / 250);
    return {
      value: cups,
      raw,
      message: `${n}ml ≈ ${cups} copos de 250ml ✓`,
      isValid: true,
      wasCorrected: true,
    };
  }

  return {
    value: null,
    raw,
    message: "Valor fora do esperado. Ex: 8 (copos) ou 2 (litros)",
    isValid: false,
    wasCorrected: false,
  };
}

// ============ Sleep (hours) ============

export function normalizeSleepInput(input: string): NormalizationResult {
  const raw = input;
  if (!input || !input.trim()) {
    return { value: null, raw, message: "", isValid: false, wasCorrected: false };
  }

  const cleaned = cleanNumericString(input);
  const n = parseFloat(cleaned);

  if (!Number.isFinite(n) || n < 0) {
    return { value: null, raw, message: "Digite as horas de sono. Ex: 7 ou 7,5", isValid: false, wasCorrected: false };
  }

  if (n >= 1 && n <= 16) {
    const rounded = Math.round(n * 2) / 2; // round to 0.5
    return {
      value: rounded,
      raw,
      message: `${rounded}h de sono ✓`,
      isValid: true,
      wasCorrected: false,
    };
  }

  // Minutes? 300-960min → 5-16h
  if (n >= 60 && n <= 960) {
    const hours = Math.round((n / 60) * 2) / 2;
    return {
      value: hours,
      raw,
      message: `${n} min ≈ ${hours}h de sono ✓`,
      isValid: true,
      wasCorrected: true,
    };
  }

  return {
    value: null,
    raw,
    message: "Valor fora do esperado (1-16h). Ex: 7,5",
    isValid: false,
    wasCorrected: false,
  };
}

// ============ Body Measurements (cm) ============

export function normalizeMeasurementInput(input: string, label?: string): NormalizationResult {
  const raw = input;
  if (!input || !input.trim()) {
    return { value: null, raw, message: "", isValid: false, wasCorrected: false };
  }

  const cleaned = cleanNumericString(input);
  const n = parseFloat(cleaned);

  if (!Number.isFinite(n) || n <= 0) {
    return { value: null, raw, message: `Digite em cm. Ex: 85`, isValid: false, wasCorrected: false };
  }

  // Reasonable circumference range: 10-250 cm
  if (n >= 10 && n <= 250) {
    const rounded = Math.round(n * 10) / 10;
    return {
      value: rounded,
      raw,
      message: `${rounded} cm ✓`,
      isValid: true,
      wasCorrected: false,
    };
  }

  // Meters? 0.1-2.5 → convert to cm
  if (n >= 0.1 && n < 10) {
    const cm = Math.round(n * 100) / 10;
    // Only convert if it makes sense (result 10-250)
    if (cm >= 10 && cm <= 250) {
      return {
        value: cm,
        raw,
        message: `Medida identificada como ${cm} cm`,
        isValid: true,
        wasCorrected: true,
      };
    }
  }

  return {
    value: null,
    raw,
    message: `Medida fora do esperado (10-250 cm)`,
    isValid: false,
    wasCorrected: false,
  };
}

// ============ Body Fat Percentage ============

export function normalizeBodyFatInput(input: string): NormalizationResult {
  const raw = input;
  if (!input || !input.trim()) {
    return { value: null, raw, message: "", isValid: false, wasCorrected: false };
  }

  const cleaned = cleanNumericString(input.replace(/%/g, ""));
  const n = parseFloat(cleaned);

  if (!Number.isFinite(n) || n < 0) {
    return { value: null, raw, message: "Digite o %. Ex: 22 ou 22,5", isValid: false, wasCorrected: false };
  }

  if (n >= 3 && n <= 60) {
    const rounded = Math.round(n * 10) / 10;
    return {
      value: rounded,
      raw,
      message: `${rounded}% ✓`,
      isValid: true,
      wasCorrected: false,
    };
  }

  return {
    value: null,
    raw,
    message: "% gordura fora do esperado (3-60%)",
    isValid: false,
    wasCorrected: false,
  };
}

// ============ Validation Helpers ============

export type FieldNormalizer = (input: string) => NormalizationResult;

/** Get friendly validation message for a field */
export function getFriendlyValidationMessage(result: NormalizationResult): string {
  return result.message;
}

/** Check if a normalized value is ready to save */
export function isReadyToSave(result: NormalizationResult): boolean {
  return result.isValid && result.value !== null;
}
