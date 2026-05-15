/**
 * FitJourney — Meal Type Integrity Guard
 * ----------------------------------------------------------------
 * Regra centralizada para impedir cruzamento de categorias entre slots de refeição.
 * Garante que arroz não apareça no café e pão não apareça no almoço.
 */

import type { SubstitutionGroup } from "./substitutionGroups";
import { SovereignTelemetry } from "./sovereignTelemetry";

export type MealSlot =
  | "Café da Manhã"
  | "Lanche da Manhã"
  | "Almoço"
  | "Lanche da Tarde"
  | "Jantar"
  | "Ceia"
  | "supper";

/** Aliases comuns vindos do banco / UI normalizados para o slot canônico */
const SLOT_ALIASES: Record<string, MealSlot> = {
  breakfast: "Café da Manhã",
  cafe_da_manha: "Café da Manhã",
  "café_da_manhã": "Café da Manhã",
  "cafe da manha": "Café da Manhã",
  "café da manhã": "Café da Manhã",
  cafe: "Café da Manhã",

  morning_snack: "Lanche da Manhã",
  lanche_da_manha: "Lanche da Manhã",
  "lanche_da_manhã": "Lanche da Manhã",
  "lanche da manha": "Lanche da Manhã",
  "lanche da manhã": "Lanche da Manhã",
  lanchemanha: "Lanche da Manhã",

  lunch: "Almoço",
  almoco: "Almoço",
  "almoço": "Almoço",

  afternoon_snack: "Lanche da Tarde",
  snack: "Lanche da Tarde",
  lanche_da_tarde: "Lanche da Tarde",
  "lanche da tarde": "Lanche da Tarde",
  lanche: "Lanche da Tarde",

  dinner: "Jantar",
  jantar: "Jantar",

  supper: "supper",
  ceia: "supper",
};

export function normalizeSlot(input: string | null | undefined): MealSlot | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  return SLOT_ALIASES[key] ?? null;
}

/** Quais grupos de substituição são clinicamente válidos em cada slot. */
export const SLOT_ALLOWED_GROUPS: Record<MealSlot, SubstitutionGroup[]> = {
  breakfast: [
    "cafe-classico",
    "cafe-proteico",
    "carbo-cereal",
    "fruta-doce",
    "fruta-acida",
    "laticinio-proteico",
    "laticinio-leve",
    "gordura-oleaginosa",
    "proteina-leve",
    "carbo-tuberoso", // Permitir macaxeira/inhame no café
  ],
  morning_snack: [
    "fruta-doce",
    "fruta-acida",
    "laticinio-proteico",
    "laticinio-leve",
    "lanche-proteico",
    "lanche-leve",
    "gordura-oleaginosa",
    "proteina-leve",
  ],
  lunch: [
    "proteina-almoco",
    "proteina-peixe",
    "carbo-almoco",
    "carbo-legume",
    "carbo-tuberoso",
    "salada-base",
  ],
  afternoon_snack: [
    "fruta-doce",
    "fruta-acida",
    "laticinio-proteico",
    "laticinio-leve",
    "lanche-proteico",
    "lanche-leve",
    "gordura-oleaginosa",
    "proteina-leve",
  ],
  dinner: [
    "proteina-almoco",
    "proteina-peixe",
    "proteina-leve",
    "carbo-almoco",
    "carbo-legume",
    "carbo-tuberoso",
    "salada-base",
  ],
  evening_snack: [
    "ceia-leve",
    "laticinio-leve",
    "fruta-acida",
    "proteina-leve",
  ],
  supper: [
    "ceia-leve",
    "laticinio-leve",
    "fruta-acida",
    "proteina-leve",
  ],
};

/** Blacklist explícita por slot — bloqueio duro mesmo se o grupo for ambíguo */
export const SLOT_BLACKLIST_KEYWORDS: Record<MealSlot, RegExp[]> = {
  breakfast: [
    /\barroz\b/i,
    /\bfeij[aã]o\b/i,
    /\bpicanha\b/i,
    /\bbife\b/i,
    /\bfil[eé] mignon\b/i,
    /\bcarne moida\b/i,
    /\bcarne moída\b/i,
    /\btil[aá]pia\b/i,
    /\bsalm[aã]o\b/i,
    /\bpeixe\b/i,
    /\bfrango grelhado\b/i,
    /\bfrango assado\b/i,
    /\bmacarr[aã]o\b/i,
    /\bsopa\b/i,
    /\bstrogonoff\b/i,
    /\bparmegiana\b/i,
    /\bomellete de carne\b/i,
    /\bomellete de frango\b/i,
  ],
  morning_snack: [
    /\barroz\b/i,
    /\bfeij[aã]o\b/i,
    /\bpicanha\b/i,
    /\bbife\b/i,
    /\bsopa\b/i,
    /\bmacarr[aã]o\b/i,
    /\bcarne\b/i,
    /\bfrango\b/i,
    /\bpeixe\b/i,
  ],
  lunch: [
    /\bp[aã]o\b/i,
    /\btapioca\b/i,
    /\bcrepioca\b/i,
    /\bbolo\b/i,
    /\baveia\b/i,
    /\bcafé\b/i,
    /\bvitamina\b/i,
    /\bgranola\b/i,
    /\biogurte\b/i,
    /\bpanqueca\b/i,
  ],
  afternoon_snack: [
    /\barroz\b/i,
    /\bfeij[aã]o\b/i,
    /\bpicanha\b/i,
    /\bbife\b/i,
    /\bsopa\b/i,
    /\bmacarr[aã]o\b/i,
    /\bcarne\b/i,
    /\bfrango\b/i,
    /\bpeixe\b/i,
  ],
  dinner: [
    /\bp[aã]o\b/i,
    /\btapioca\b/i,
    /\bcrepioca\b/i,
    /\bbolo\b/i,
    /\baveia\b/i,
    /\bcafé\b/i,
    /\bvitamina\b/i,
    /\bgranola\b/i,
    /\bpanqueca\b/i,
  ],
  evening_snack: [
    /\barroz\b/i,
    /\bfeij[aã]o\b/i,
    /\bpicanha\b/i,
    /\bbife\b/i,
    /\bmacarr[aã]o\b/i,
    /\bcarne\b/i,
    /\bfrango\b/i,
    /\bpeixe\b/i,
  ],
  supper: [
    /\barroz\b/i,
    /\bfeij[aã]o\b/i,
    /\bpicanha\b/i,
    /\bbife\b/i,
    /\bmacarr[aã]o\b/i,
    /\bcarne\b/i,
    /\bfrango\b/i,
    /\bpeixe\b/i,
  ],
};

/**
 * O grupo é válido nesse slot?
 */
export function isGroupAllowedInSlot(
  group: SubstitutionGroup | null | undefined,
  slot: MealSlot,
): boolean {
  if (!group) return true; // grupo desconhecido: deixa a blacklist textual decidir
  return SLOT_ALLOWED_GROUPS[slot].includes(group);
}

/**
 * O nome do alimento bate com a blacklist textual desse slot?
 */
export function matchesSlotBlacklist(name: string, slot: MealSlot): boolean {
  const patterns = SLOT_BLACKLIST_KEYWORDS[slot] ?? [];
  return patterns.some((re) => re.test(name));
}

/**
 * Decisão final: este alimento (com nome + grupo opcional) pode aparecer
 * neste slot? Loga telemetria quando reprovado.
 */
export function isFoodAllowedInSlot(
  name: string,
  group: SubstitutionGroup | null | undefined,
  slotInput: string,
  context: { source: string; correlationId?: string } = { source: "unknown" },
): boolean {
  const slot = normalizeSlot(slotInput);
  if (!slot) return true; // slot desconhecido: não bloqueia, só loga
  if (matchesSlotBlacklist(name, slot)) {
    // 🛡️ SOBERANIA MANUAL: Mantemos apenas logs de aviso, permitindo soberania do nutricionista.
    console.warn(`[Clinical-Guard] Sugestão: Alimento "${name}" pode ser inadequado para o slot "${slot}".`);
    return true; 
  }
  if (group && !isGroupAllowedInSlot(group, slot)) {
    console.warn(`[Clinical-Guard] Sugestão: Grupo "${group}" pode ser inadequado para o slot "${slot}".`);
    return true; 
  }
  return true;
}

/** Marca categorias que devem ser tratadas como volume livre (vegetais não-amiláceos) */
export const FREE_PORTION_GROUPS = new Set<SubstitutionGroup>([
  "salada-base",
]);

const FREE_PORTION_KEYWORDS = [
  /\balface\b/i,
  /\bagri[aã]o\b/i,
  /\brúcula\b/i,
  /\brucula\b/i,
  /\bespinafre\b/i,
  /\bcouve\b/i,
  /\bbr[oó]colis\b/i,
  /\bcouve-flor\b/i,
  /\bpepino\b/i,
  /\babobrinha\b/i,
  /\bberinjela\b/i,
  /\btomate\b/i,
  /\bcenoura\b/i,
];

export function isFreePortionFood(
  name: string,
  group: SubstitutionGroup | null | undefined,
): boolean {
  if (group && FREE_PORTION_GROUPS.has(group)) return true;
  return FREE_PORTION_KEYWORDS.some((re) => re.test(name));
}

/** Limite máximo absoluto para itens em modo free (vegetais não escalam acima disso) */
export const FREE_PORTION_MAX_GRAMS = 120;
