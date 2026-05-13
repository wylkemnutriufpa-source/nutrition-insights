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
 * A descrição deve ser gerada passivamente a partir dos dados do item.
 */
export function scaleDescriptionQuantities(
  description: string | null | undefined,
  factor: number
): string | null | undefined {
  // Retorna a descrição original sem mutação
  return description;
}

/**
 * 🛑 NEUTRALIZADO: Não inferimos mais porções via nome.
 */
export function resolveDisplayPortion(foodName: string, basePortion: string, grams: number): string {
  // Se temos gramas, usamos gramas. Se temos porção base, usamos ela.
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
  const MAIN_MEAL_TYPES = new Set(["lunch", "dinner", "almoço", "jantar"]);
  return MAIN_MEAL_TYPES.has(mealType.toLowerCase());
}

export function isProteinLine(line: string): boolean {
  const MAIN_PROTEIN_KEYWORDS = ["frango", "carne", "peixe", "ovo", "tilápia", "bife", "patinho", "whey"];
  const normalized = normalize(line);
  return MAIN_PROTEIN_KEYWORDS.some(kw => normalized.includes(kw));
}

/**
 * Sync logic: Mantido apenas para compatibilidade de assinatura, mas sem mutação.
 */
export function syncProteinDescriptionPortions(
  description: string | null | undefined,
): string | null | undefined {
  return description;
}

/**
 * Estrutura a descrição final de forma passiva.
 */
export function finalizeMealDescription(description: string): string {
  if (!description) return "";
  
  // Apenas limpeza estrutural básica
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
): string {
  return foods.map(f => {
    const name = f.food_name;
    const unit = f.portion_unit || f.portion_reference || 'g';
    const qty = f.quantity || f.portion_grams || 0;
    
    // Formatação passiva: "Alimento — Quantidade Unidade"
    return `• ${name} — ${qty}${unit.includes(' ') || /\d/.test(unit) ? '' : ' '}${unit}`;
  }).join("\n");
}

export function isGenericDescription(desc: string): boolean {
  const trimmed = desc.trim();
  if (/^\d+\s*(g|ml|kcal)$/i.test(trimmed)) return true;
  return false;
}
