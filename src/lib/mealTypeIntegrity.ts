/**
 * FitJourney — Meal Type Integrity Guard
 * ----------------------------------------------------------------
 * Regra única, soberana e centralizada para impedir cruzamento de
 * categorias entre slots de refeição.
 *
 * Aplica-se em 3 pontos:
 *  1. Geração (libraryV3Resolver / templateIntelligence)
 *  2. Substituição (MealSubstitutionModal / MealSubstitutionPanel)
 *  3. Renderização defensiva (UI esconde + telemetria)
 *
 * Falha SEMPRE de forma explícita. Nunca silenciosa.
 */

import type { SubstitutionGroup } from "./substitutionGroups";
import { SovereignTelemetry } from "./sovereignTelemetry";

export type MealSlot =
  | "breakfast"
  | "morning_snack"
  | "lunch"
  | "afternoon_snack"
  | "dinner"
  | "evening_snack"
  | "supper";

/** Aliases comuns vindos do banco / UI normalizados para o slot canônico */
const SLOT_ALIASES: Record<string, MealSlot> = {
  breakfast: "breakfast",
  cafe_da_manha: "breakfast",
  "café_da_manhã": "breakfast",
  "cafe da manha": "breakfast",
  "café da manhã": "breakfast",
  cafe: "breakfast",

  morning_snack: "morning_snack",
  lanche_da_manha: "morning_snack",
  "lanche_da_manhã": "morning_snack",
  "lanche da manha": "morning_snack",
  "lanche da manhã": "morning_snack",
  lanchemanha: "morning_snack",

  lunch: "lunch",
  almoco: "lunch",
  "almoço": "lunch",

  afternoon_snack: "afternoon_snack",
  snack: "afternoon_snack",
  lanche_da_tarde: "afternoon_snack",
  "lanche da tarde": "afternoon_snack",
  lanche: "afternoon_snack",

  dinner: "dinner",
  jantar: "dinner",

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
    "proteina-leve", // ovo, whey, peito de peru — OK no café
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
    /\bmacarr[aã]o\b/i,
    /\bp[aã]o de queijo grande\b/i, // permitido apenas em versão pequena, fora do guard
    /\bsopa\b/i,
    /\bmandioca\b/i,
    /\binhame\b/i,
    /\bbatata doce\b/i,
    /\bbatata inglesa\b/i,
  ],
  morning_snack: [
    /\barroz\b/i,
    /\bfeij[aã]o\b/i,
    /\bpicanha\b/i,
    /\bbife\b/i,
    /\bsopa\b/i,
    /\bmacarr[aã]o\b/i,
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
    /\btil[aá]pia\b/i,
    /\bbatata doce\b/i,
    /\bbatata inglesa\b/i,
    /\bmandioca\b/i,
    /\binhame\b/i,
  ],
  supper: [
    /\barroz\b/i,
    /\bfeij[aã]o\b/i,
    /\bpicanha\b/i,
    /\bbife\b/i,
    /\bmacarr[aã]o\b/i,
    /\btil[aá]pia\b/i,
    /\bbatata doce\b/i,
    /\bbatata inglesa\b/i,
    /\bmandioca\b/i,
    /\binhame\b/i,
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
    SovereignTelemetry.log({
      runtime_source: context.source,
      event_type: "schema_violation",
      severity: "warning",
      message: `MEAL_TYPE_GUARD: bloqueado "${name}" em slot "${slot}" (blacklist textual).`,
      correlation_id: context.correlationId,
      metadata: { name, group, slot, reason: "blacklist" },
    });
    return false;
  }
  if (group && !isGroupAllowedInSlot(group, slot)) {
    SovereignTelemetry.log({
      runtime_source: context.source,
      event_type: "schema_violation",
      severity: "warning",
      message: `MEAL_TYPE_GUARD: bloqueado grupo "${group}" em slot "${slot}".`,
      correlation_id: context.correlationId,
      metadata: { name, group, slot, reason: "group_mismatch" },
    });
    return false;
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
