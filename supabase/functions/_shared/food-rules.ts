/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANONICAL FOOD RULES — Single Source of Truth
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file is the ONLY authoritative source for:
 *   - BLOCKED_FOODS
 *   - REPLACEMENTS
 *   - MEAL_KCAL_SPLIT
 *   - SUBSTITUTION_GROUPS
 *   - PREMIUM_KEYWORDS / COMPLEX_PREP_KEYWORDS
 *   - normalize() helper
 * 
 * All edge functions (generate-meal-plan, validate-meal-plan, generate-bb-meal-plan)
 * MUST import from here. The client-side mirror (src/lib/mealPlanFoodRules.ts)
 * must stay in sync with this file.
 * 
 * DO NOT duplicate these lists anywhere else.
 */

// ── Text normalization (accent-safe, lowercase) ──
export function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ══════════════════════════════════════════════════════════════════════════
// BLOCKED FOODS — foods that must NEVER appear in generated plans
// ══════════════════════════════════════════════════════════════════════════
export const BLOCKED_FOODS: string[] = [
  // Combinações / itens que geram composições clinicamente incoerentes
  "canjica", "canjica de milho", "óleo de abacate", "oleo de abacate", "óleo de coco", "oleo de coco",
  // Peixes caros / importados
  "salmão", "salmon", "atum fresco",
  // Laticínios importados / caros
  "kefir", "cottage", "queijo cottage", "ricota", "ricota importada",
  "queijo minas", "peito de peru", "peru defumado", "blanquet", "blanquet de peru",
  // Grãos importados
  "quinoa", "quinua", "amaranto",
  // Oleaginosas caras
  "castanha-do-pará", "castanha do pará", "macadâmia", "pistache",
  // Frutas importadas
  "framboesa", "mirtilo", "blueberry", "cranberry", "açaí premium",
  // Proteínas não-tradicionais
  "tofu", "tempeh", "edamame",
  // Preparações complexas / importadas
  "granola premium", "mix de nuts", "trail mix",
  "azeite trufado", "vinagre balsâmico",
  "pasta de amendoim importada", "manteiga de amêndoa",
  // Suplementos
  "whey protein", "whey", "caseína", "creatina",
  // Preparações fora do padrão brasileiro popular
  "wrap integral", "pão artesanal",
  "leite de amêndoa", "leite de coco", "leite de aveia",
  "abacate toast", "overnight oats",
  "cream cheese", "philadelphia",
  "iogurte grego importado",
  "coalhada", "kombucha",
  "semente de chia importada", "hemp seed",
  "tahini", "tahine", "hummus",
  // Queijos importados
  "burrata", "brie", "camembert", "gorgonzola",
];

// ══════════════════════════════════════════════════════════════════════════
// REPLACEMENTS — when a blocked food is found, replace with this
// ══════════════════════════════════════════════════════════════════════════
export const REPLACEMENTS: Record<string, string> = {
  "kefir": "iogurte natural",
  "cottage": "queijo coalho",
  "queijo cottage": "queijo coalho",
  "salmão": "tilápia grelhada",
  "salmon": "tilápia grelhada",
  "blueberry": "morango",
  "mirtilo": "morango",
  "framboesa": "morango",
  "cranberry": "acerola",
  "quinoa": "arroz integral",
  "quinua": "arroz integral",
  "tahine": "pasta de amendoim",
  "tahini": "pasta de amendoim",
  "cream cheese": "requeijão",
  "philadelphia": "requeijão",
  "iogurte grego": "iogurte natural",
  "iogurte grego importado": "iogurte natural",
  "wrap integral": "tapioca",
  "overnight oats": "aveia com banana",
  "hummus": "feijão",
  "tofu": "ovo cozido",
  "tempeh": "ovo cozido",
  "whey protein": "ovo cozido",
  "whey": "ovo cozido",
  "caseína": "iogurte natural",
  "burrata": "muçarela",
  "brie": "queijo coalho",
  "camembert": "queijo coalho",
  "gorgonzola": "muçarela",
  "kombucha": "chá natural",
  "coalhada": "iogurte natural",
  "abacate toast": "pão com ovo",
  "pão artesanal": "pão integral",
  "leite de amêndoa": "leite desnatado",
  "leite de aveia": "leite integral",
  "leite de coco": "leite integral",
  "granola premium": "granola simples",
  "mix de nuts": "amendoim torrado",
  "trail mix": "amendoim torrado",
  "pistache": "amendoim",
  "macadâmia": "amendoim",
  "castanha-do-pará": "castanha de caju",
  "castanha do pará": "castanha de caju",
  "queijo minas": "queijo coalho",
  "peito de peru": "ovo cozido",
  "peru defumado": "ovo cozido",
  "blanquet": "ovo cozido",
  "blanquet de peru": "ovo cozido",
  "ricota": "requeijão",
  "ricota importada": "requeijão",
  "açaí premium": "banana",
  "azeite trufado": "azeite de oliva",
  "vinagre balsâmico": "limão",
  "manteiga de amêndoa": "pasta de amendoim",
  "pasta de amendoim importada": "pasta de amendoim",
  "semente de chia importada": "linhaça",
  "hemp seed": "linhaça",
  "edamame": "feijão verde",
  "amaranto": "aveia",
  "creatina": "ovo cozido",
};

// ══════════════════════════════════════════════════════════════════════════
// MEAL KCAL SPLIT — caloric distribution per meal type
// ══════════════════════════════════════════════════════════════════════════
export const MEAL_KCAL_SPLIT: Record<string, number> = {
  breakfast: 0.20,
  morning_snack: 0.10,
  lunch: 0.30,
  afternoon_snack: 0.10,
  dinner: 0.22,
  evening_snack: 0.08,
};

// ══════════════════════════════════════════════════════════════════════════
// PROTEIN DISTRIBUTION — shares and caps per meal type by goal
// ══════════════════════════════════════════════════════════════════════════
export function getProteinDistribution(isGainGoal: boolean) {
  const shares: Record<string, number> = isGainGoal
    ? { breakfast: 0.16, morning_snack: 0.10, lunch: 0.26, afternoon_snack: 0.10, dinner: 0.24, evening_snack: 0.14 }
    : { breakfast: 0.15, morning_snack: 0.08, lunch: 0.27, afternoon_snack: 0.08, dinner: 0.27, evening_snack: 0.15 };
  const caps: Record<string, number> = isGainGoal
    ? { breakfast: 45, morning_snack: 24, lunch: 65, afternoon_snack: 24, dinner: 60, evening_snack: 35 }
    : { breakfast: 30, morning_snack: 18, lunch: 55, afternoon_snack: 18, dinner: 55, evening_snack: 30 };
  return { shares, caps };
}

// ══════════════════════════════════════════════════════════════════════════
// MEAL ORDER & RESIDUAL PRIORITY — standard meal sequence
// ══════════════════════════════════════════════════════════════════════════
export const MEAL_ORDER = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
export const RESIDUAL_PRIORITY = ["lunch", "dinner", "evening_snack", "breakfast", "morning_snack", "afternoon_snack"];

// ══════════════════════════════════════════════════════════════════════════
// SUBSTITUTION GROUPS — equivalent foods within each category
// ══════════════════════════════════════════════════════════════════════════
export const SUBSTITUTION_GROUPS: Record<string, string[]> = {
  protein_main: ["frango", "carne moída", "bife", "tilápia", "porco", "sardinha", "alcatra", "patinho", "acém"],
  carb_main: ["arroz", "macarrão", "batata", "macaxeira", "batata doce", "inhame", "cará"],
  carb_breakfast: ["pão integral", "tapioca", "cuscuz", "pão francês", "pão de forma"],
  protein_breakfast: ["ovo mexido", "ovo cozido", "queijo coalho", "queijo muçarela"],
  fruit: ["banana", "maçã", "mamão", "laranja", "goiaba", "morango", "tangerina", "melancia", "abacaxi", "manga"],
  dairy: ["iogurte natural", "leite", "queijo coalho"],
  legume: ["feijão", "feijão carioca", "feijão preto", "lentilha", "feijão verde"],
  vegetable: ["alface", "tomate", "brócolis", "cenoura", "couve", "repolho", "chuchu", "abobrinha"],
};

// ══════════════════════════════════════════════════════════════════════════
// PREMIUM / COMPLEX KEYWORDS — used by validator to flag non-simple items
// ══════════════════════════════════════════════════════════════════════════
export const PREMIUM_KEYWORDS: string[] = [
  "premium", "importado", "importada", "gourmet", "artesanal",
  "overnight", "brunch", "toast", "wrap", "smoothie bowl",
  "açaí bowl", "poke", "buddha bowl",
];

export const COMPLEX_PREP_KEYWORDS: string[] = [
  "overnight oats", "smoothie", "bowl de", "wrap de",
  "panqueca de", "crepe de", "risoto",
];

// ══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════

export function isBlockedFood(name: string): boolean {
  const n = normalize(name);
  return BLOCKED_FOODS.some(blocked => n.includes(normalize(blocked)));
}

export function findBlockedFoods(text: string): string[] {
  const n = normalize(text);
  return BLOCKED_FOODS.filter(blocked => n.includes(normalize(blocked)));
}

export function getReplacementFor(foodName: string): string | null {
  const n = normalize(foodName);
  for (const [blocked, replacement] of Object.entries(REPLACEMENTS)) {
    if (n.includes(normalize(blocked))) return replacement;
  }
  return null;
}

export function getSubstitutionsFor(foodName: string): string[] {
  const n = normalize(foodName);
  for (const [, group] of Object.entries(SUBSTITUTION_GROUPS)) {
    const match = group.find(item => normalize(item) === n || n.includes(normalize(item)));
    if (match) {
      return group.filter(item => normalize(item) !== normalize(match));
    }
  }
  return [];
}
