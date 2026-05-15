/**
 * Meal Description Engine — Client Mirror
 * 
 * SOBERANIA CLÍNICA: Este motor foi NEUTRALIZADO.
 * O sistema agora deriva toda a estrutura da massa clínica real (clinical_mass_g)
 * e não deve mais realizar mutações baseadas em REGEX ou HEURÍSTICAS textuais.
 */

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * 🛑 NEUTRALIZADO: Não escalamos mais quantidades via REGEX.
 */
export function scaleDescriptionQuantities(
  description: string | null | undefined,
  _factor: number
): string | null | undefined {
  return description;
}

/**
 * 🛑 NEUTRALIZADO: Não inferimos mais porções via nome.
 */
export function resolveDisplayPortion(foodName: string, basePortion: string, grams: number): string {
  if (basePortion) return basePortion;
  return grams > 0 ? `${grams}g` : '';
}

/**
 * 🛑 NEUTRALIZADO: Não clampamos mais proteína via texto.
 */
function clampProteinLineToStandardPortion(line: string): string {
  return line;
}

export function isMainMealType(mealType: string): boolean {
  if (!mealType) return false;
  const MAIN_MEAL_TYPES = new Set(["Almoço", "Jantar", "almoço", "jantar"]);
  return MAIN_MEAL_TYPES.has(mealType.toLowerCase());
}

export function isProteinLine(line: string): boolean {
  const MAIN_PROTEIN_KEYWORDS = ["frango", "carne", "peixe", "ovo", "tilápia", "bife", "patinho", "whey"];
  const normalized = normalize(line);
  return MAIN_PROTEIN_KEYWORDS.some(kw => normalized.includes(kw));
}

/**
 * 🛑 STUB: Mantido para compatibilidade de assinatura.
 */
export function hasBeverage(_description: string): boolean {
  return false;
}

/**
 * 🛑 STUB: Mantido para compatibilidade de assinatura.
 */
export function getDefaultBeverageLine(_mealType: string): string | null {
  return null;
}

/**
 * 🛑 STUB: Mantido para compatibilidade de assinatura.
 */
export function standardProteinPortion(_mealType: string, _isGainGoal: boolean): number {
  return 150;
}

/**
 * 🛑 STUB: Mantido para compatibilidade de assinatura.
 */
export function roundScaledQuantity(value: number, _unit: string): number {
  return value;
}

/**
 * Sync logic: Mantido apenas para compatibilidade de assinatura, mas sem mutação.
 */
export function syncProteinDescriptionPortions(
  description: string | null | undefined,
  _mealType?: string,
  _nextProtein?: number,
  _previousProtein?: number,
  _isGainGoal?: boolean,
): string | null | undefined {
  return description;
}

/**
 * Estrutura a descrição final de forma passiva.
 */
export function finalizeMealDescription(description: string, _mealType?: string, _isGainGoal?: boolean): string {
  if (!description) return "";
  
  return description
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Constrói a descrição a partir dos itens de forma determinística.
 */
export function buildFoodDescriptionFromItems(
  foods: Array<{ food_name: string; portion_grams?: number; portion_reference?: string; quantity?: number; portion_unit?: string }>,
  _scaleFactor: number = 1
): string {
  const result = foods.map(f => {
    const name = f.food_name;
    const unit = f.portion_unit || f.portion_reference || 'g';
    const qty = f.quantity || f.portion_grams || 0;
    
    return `• ${name} — ${qty}${unit.includes(' ') || /\d/.test(unit) ? '' : ' '}${unit}`;
  }).join("\n");

  return result;
}

export function isGenericDescription(desc: string): boolean {
  const trimmed = (desc || "").trim();
  if (/^\d+\s*(g|ml|kcal)$/i.test(trimmed)) return true;
  return false;
}
