/**
 * Módulo único de validação e autocomplete de porções alimentares.
 * Reutilizado pelos modais de adicionar e editar alimentos para garantir
 * consistência total nas regras e mensagens de erro.
 */

export const PORTION_UNITS = [
  "g", "kg", "ml", "l", "unidade", "unidades", "fatia", "fatias",
  "ovo", "ovos", "colher", "colheres", "xicara", "xicaras",
  "pote", "potes", "scoop", "scoops", "copo", "copos", "un", "unid",
] as const;

/** Mensagem de erro padrão exibida inline e em toasts. */
export const PORTION_ERROR_MESSAGE = "Use ex: 150g, 2 ovos, 1 fatia";

/** Placeholder padrão dos inputs de porção. */
export const PORTION_PLACEHOLDER = "Ex: 150g";

/** ID compartilhado do <datalist> de autocomplete. */
export const PORTION_DATALIST_ID = "portion-units";

/**
 * Regex única que aceita variações como:
 *  - "150g", "150 g"
 *  - "1.5kg", "0,5kg"
 *  - "200 ml", "1L"
 *  - "2 ovos", "1 fatia", "3 colheres"
 */
const PORTION_REGEX = new RegExp(
  `^\\d+(?:[.,]\\d+)?\\s*(?:${PORTION_UNITS.join("|")})$`,
  "i",
);

/**
 * Valida uma porção. Strings vazias são consideradas válidas
 * (o componente decide se o campo é obrigatório).
 */
export function validatePortion(portion: string): boolean {
  const value = portion.trim();
  if (!value) return true;
  return PORTION_REGEX.test(value);
}

/**
 * Gera as opções de autocomplete para o <datalist>.
 * Se o usuário já digitou um número, sugere "número + unidade";
 * caso contrário, sugere apenas as unidades cruas.
 */
export function getPortionAutocompleteOptions(currentValue: string): string[] {
  const value = (currentValue ?? "").trim();
  const numMatch = value.match(/^(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    const num = numMatch[1];
    return PORTION_UNITS.map((unit) => `${num}${unit}`);
  }
  return [...PORTION_UNITS];
}
