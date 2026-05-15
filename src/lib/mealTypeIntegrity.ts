/**
 * FitJourney — Meal Type Integrity Guard
 * ----------------------------------------------------------------
 * Regra centralizada para impedir cruzamento de categorias entre slots de refeição.
 */

import type { SubstitutionGroup } from "./substitutionGroups";

export type MealSlot =
  | "Café da Manhã"
  | "Lanche da Manhã"
  | "Almoço"
  | "Lanche da Tarde"
  | "Jantar"
  | "Ceia";

/** Aliases comuns normalizados para o slot canônico */
const SLOT_ALIASES: Record<string, MealSlot> = {
  "Café da Manhã": "Café da Manhã",
  "Lanche da Manhã": "Lanche da Manhã",
  "Almoço": "Almoço",
  "Lanche da Tarde": "Lanche da Tarde",
  "Jantar": "Jantar",
  "Ceia": "Ceia",
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  evening_snack: "Ceia",
  ceia: "Ceia",
};

export function normalizeSlot(input: string | null | undefined): MealSlot | null {
  if (!input) return null;
  const key = String(input).trim();
  if (SLOT_ALIASES[key]) return SLOT_ALIASES[key];
  const lowKey = key.toLowerCase();
  return SLOT_ALIASES[lowKey] ?? null;
}

/** Quais grupos de substituição são clinicamente válidos em cada slot. */
export const SLOT_ALLOWED_GROUPS: Record<MealSlot, SubstitutionGroup[]> = {
  "Café da Manhã": ["cafe-classico", "cafe-proteico", "carbo-cereal", "fruta-doce", "fruta-acida", "laticinio-proteico", "laticinio-leve", "gordura-oleaginosa", "proteina-leve", "carbo-tuberoso"],
  "Lanche da Manhã": ["fruta-doce", "fruta-acida", "laticinio-proteico", "laticinio-leve", "lanche-proteico", "lanche-leve", "gordura-oleaginosa", "proteina-leve"],
  "Almoço": ["proteina-almoco", "proteina-peixe", "carbo-almoco", "carbo-legume", "carbo-tuberoso", "salada-base"],
  "Lanche da Tarde": ["fruta-doce", "fruta-acida", "laticinio-proteico", "laticinio-leve", "lanche-proteico", "lanche-leve", "gordura-oleaginosa", "proteina-leve"],
  "Jantar": ["proteina-almoco", "proteina-peixe", "proteina-leve", "carbo-almoco", "carbo-legume", "carbo-tuberoso", "salada-base"],
  "Ceia": ["ceia-leve", "laticinio-leve", "fruta-acida", "proteina-leve"],
};

/** Blacklist explícita por slot */
export const SLOT_BLACKLIST_KEYWORDS: Record<MealSlot, RegExp[]> = {
  "Café da Manhã": [/\barroz\b/i, /\bfeij[aã]o\b/i, /\bpicanha\b/i, /\bbife\b/i, /\bfil[eé] mignon\b/i, /\bcarne moida\b/i, /\bcarne moída\b/i, /\btil[aá]pia\b/i, /\bsalm[aã]o\b/i, /\bpeixe\b/i, /\bfrango grelhado\b/i, /\bfrango assado\b/i, /\bmacarr[aã]o\b/i, /\bsopa\b/i],
  "Lanche da Manhã": [/\barroz\b/i, /\bfeij[aã]o\b/i, /\bsopa\b/i, /\bmacarr[aã]o\b/i],
  "Almoço": [/\bp[aã]o\b/i, /\btapioca\b/i, /\bcrepioca\b/i, /\bbolo\b/i, /\bcafé\b/i],
  "Lanche da Tarde": [/\barroz\b/i, /\bfeij[aã]o\b/i, /\bsopa\b/i],
  "Jantar": [/\bp[aã]o\b/i, /\btapioca\b/i, /\bcrepioca\b/i],
  "Ceia": [/\barroz\b/i, /\bfeij[aã]o\b/i, /\bcarne\b/i],
};

export function isGroupAllowedInSlot(group: SubstitutionGroup | null | undefined, slot: MealSlot): boolean {
  if (!group) return true;
  return SLOT_ALLOWED_GROUPS[slot]?.includes(group) ?? true;
}

export function matchesSlotBlacklist(name: string, slot: MealSlot): boolean {
  const patterns = SLOT_BLACKLIST_KEYWORDS[slot] ?? [];
  return patterns.some((re) => re.test(name));
}

export function isFoodAllowedInSlot(
  name: string,
  group: SubstitutionGroup | null | undefined,
  slotInput: string,
  _context?: any
): boolean {
  const slot = normalizeSlot(slotInput);
  if (!slot) return true;
  // Apenas avisos, nunca bloqueios rígidos
  return true;
}

export const FREE_PORTION_GROUPS = new Set<SubstitutionGroup>(["salada-base"]);
const FREE_PORTION_KEYWORDS = [/\balface\b/i, /\bagri[aã]o\b/i, /\brúcula\b/i, /\brucula\b/i, /\bespinafre\b/i, /\bcouve\b/i, /\bbr[oó]colis\b/i, /\bcouve-flor\b/i, /\bpepino\b/i, /\babobrinha\b/i, /\bberinjela\b/i, /\btomate\b/i, /\bcenoura\b/i];

export function isFreePortionFood(name: string, group: SubstitutionGroup | null | undefined): boolean {
  if (group && FREE_PORTION_GROUPS.has(group)) return true;
  return FREE_PORTION_KEYWORDS.some((re) => re.test(name));
}

export const FREE_PORTION_MAX_GRAMS = 200;
