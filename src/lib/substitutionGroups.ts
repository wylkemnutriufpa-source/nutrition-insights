/**
 * Substitution Groups & Clinical Validation for FitJourney
 * 
 * Foods are grouped into fine-grained substitution groups (not just broad categories).
 * Each group represents nutritionally equivalent options for a specific meal context.
 */

import { FOOD_DATABASE, type FoodItem } from "@/components/meals/FoodAutocomplete";

// ── Substitution Group Definitions ──
export type SubstitutionGroup =
  | "proteina-almoco"
  | "proteina-leve"
  | "proteina-peixe"
  | "carbo-almoco"
  | "carbo-tuberoso"
  | "carbo-cereal"
  | "cafe-classico"
  | "cafe-proteico"
  | "lanche-proteico"
  | "lanche-leve"
  | "ceia-leve"
  | "salada-base"
  | "fruta-doce"
  | "fruta-acida"
  | "gordura-oleaginosa"
  | "laticinio-proteico"
  | "laticinio-leve";

// Map food names → substitution group
const FOOD_GROUP_MAP: Record<string, SubstitutionGroup> = {
  // Proteínas almoço/jantar (carnes fortes)
  "Frango grelhado": "proteina-almoco",
  "Peito de frango cozido": "proteina-almoco",
  "Patinho grelhado": "proteina-almoco",
  "Filé mignon grelhado": "proteina-almoco",
  "Alcatra grelhada": "proteina-almoco",
  "Carne moída magra": "proteina-almoco",
  "Lombo suíno assado": "proteina-almoco",
  "Carne seca desfiada": "proteina-almoco",

  // Proteínas peixe
  "Tilápia grelhada": "proteina-peixe",
  "Salmão grelhado": "proteina-peixe",
  "Sardinha assada": "proteina-peixe",
  "Camarão cozido": "proteina-peixe",

  // Proteínas leves (ovos, conserva)
  "Ovo cozido": "proteina-leve",
  "Ovo mexido": "proteina-leve",
  "Omelete de claras": "proteina-leve",
  "Atum em conserva": "proteina-leve",
  "Peito de peru": "proteina-leve",
  "Whey Protein": "proteina-leve",

  // Carbo almoço (arroz, massa)
  "Arroz branco": "carbo-almoco",
  "Arroz integral": "carbo-almoco",
  "Macarrão integral": "carbo-almoco",
  "Macarrão branco": "carbo-almoco",
  "Quinoa cozida": "carbo-almoco",

  // Carbo tuberoso
  "Batata doce cozida": "carbo-tuberoso",
  "Batata inglesa cozida": "carbo-tuberoso",
  "Mandioca cozida": "carbo-tuberoso",
  "Inhame cozido": "carbo-tuberoso",

  // Carbo cereal/pão (café/lanche)
  "Pão integral": "carbo-cereal",
  "Pão francês": "carbo-cereal",
  "Tapioca": "carbo-cereal",
  "Cuscuz de milho": "carbo-cereal",

  // Café clássico (preparações café da manhã)
  "Panqueca de banana": "cafe-classico",
  "Crepioca": "cafe-classico",
  "Tapioca c/ queijo e tomate": "cafe-classico",
  "Pão de queijo": "cafe-classico",

  // Café proteico
  "Vitamina de banana c/ aveia": "cafe-proteico",
  "Iogurte grego": "cafe-proteico",

  // Lanche proteico
  "Wrap integral c/ frango": "lanche-proteico",
  "Barrinha de cereal": "lanche-leve",
  "Mix de oleaginosas": "lanche-leve",

  // Ceia leve / Sopas
  "Sopa de legumes": "ceia-leve",
  "Caldo de legumes": "ceia-leve",
  "Canja de galinha": "ceia-leve",
  "Sopa de abóbora": "ceia-leve",
  "Smoothie verde": "ceia-leve",

  // Salada base
  "Salada verde mista": "salada-base",
  "Brócolis cozido": "salada-base",
  "Couve refogada": "salada-base",
  "Espinafre cozido": "salada-base",
  "Abobrinha refogada": "salada-base",

  // Frutas doces
  "Banana prata": "fruta-doce",
  "Manga": "fruta-doce",
  "Melancia": "fruta-doce",
  "Uva": "fruta-doce",
  "Mamão papaia": "fruta-doce",

  // Frutas ácidas
  "Maçã": "fruta-acida",
  "Laranja": "fruta-acida",
  "Morango": "fruta-acida",
  "Abacaxi": "fruta-acida",
  "Kiwi": "fruta-acida",
  "Pera": "fruta-acida",

  // Gorduras oleaginosas
  "Castanha do Pará": "gordura-oleaginosa",
  "Castanha de caju": "gordura-oleaginosa",
  "Amêndoas": "gordura-oleaginosa",
  "Nozes": "gordura-oleaginosa",
  "Pasta de amendoim": "gordura-oleaginosa",

  // Laticínio proteico
  "Queijo cottage": "laticinio-proteico",
  "Queijo minas frescal": "laticinio-proteico",
  "Ricota": "laticinio-proteico",

  // Laticínio leve
  "Iogurte natural": "laticinio-leve",
  "Leite desnatado": "laticinio-leve",
  "Cream cheese light": "laticinio-leve",
  "Requeijão light": "laticinio-leve",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const STOPWORDS = new Set([
  "com", "de", "da", "do", "e", "a", "o", "ao", "na", "no", "para", "em",
  "uma", "um", "sem", "ou", "g", "ml", "porcao", "porção", "fatia", "fatias",
  "col", "sopa", "cha", "chá", "un", "und", "unidade", "unidades",
]);

function tokenize(s: string): string[] {
  return norm(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t && t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * Fuzzy find food entries in a title.
 * Returns all DB foods whose name shares meaningful tokens with the title.
 */
export function findFoodsInTitle(title: string): FoodItem[] {
  const tokens = tokenize(title);
  if (tokens.length === 0) return [];

  const matches = new Map<string, { food: FoodItem; score: number; group: SubstitutionGroup | null }>();

  for (const food of FOOD_DATABASE) {
    const foodTokens = tokenize(food.name);
    if (foodTokens.length === 0) continue;

    // Count how many of the food's tokens appear (or are substrings of) title tokens
    let hits = 0;
    for (const ft of foodTokens) {
      if (tokens.some(t => t === ft || t.includes(ft) || ft.includes(t))) hits++;
    }
    if (hits === 0) continue;

    // score: prefer foods where most of their tokens matched
    const score = hits / foodTokens.length + hits * 0.1;
    const group = getFoodGroup(food.name);
    const key = group || food.name;
    const existing = matches.get(key);
    if (!existing || score > existing.score) {
      matches.set(key, { food, score, group });
    }
  }

  return Array.from(matches.values())
    .sort((a, b) => b.score - a.score)
    .map(m => m.food);
}

export function getFoodGroup(foodName: string): SubstitutionGroup | null {
  // Try exact match first
  if (FOOD_GROUP_MAP[foodName]) return FOOD_GROUP_MAP[foodName];

  // Try normalized match
  const query = norm(foodName);

  for (const [name, group] of Object.entries(FOOD_GROUP_MAP)) {
    const n = norm(name);
    if (n === query || query.includes(n) || n.includes(query)) return group;
  }

  // Fuzzy token match as last resort
  const tokens = tokenize(foodName);
  if (tokens.length === 0) return null;
  for (const [name, group] of Object.entries(FOOD_GROUP_MAP)) {
    const nameTokens = tokenize(name);
    const allMatch = nameTokens.length > 0 && nameTokens.every(nt =>
      tokens.some(t => t === nt || t.includes(nt) || nt.includes(t))
    );
    if (allMatch) return group;
  }

  return null;
}

// ── Smart Labels ──
export type SmartLabel = "equivalente" | "menos-calorias" | "mais-proteina" | "mais-pratico";

const PRACTICAL_FOODS = new Set([
  "Ovo cozido", "Atum em conserva", "Iogurte grego", "Whey Protein",
  "Banana prata", "Maçã", "Barrinha de cereal", "Peito de peru",
  "Pão integral", "Tapioca", "Queijo cottage",
]);

export function getSmartLabels(current: FoodItem, candidate: FoodItem): SmartLabel[] {
  const labels: SmartLabel[] = [];
  const calDiff = candidate.calories - current.calories;
  const protDiff = candidate.protein - current.protein;

  // Within 15% calories = equivalente
  if (Math.abs(calDiff) <= current.calories * 0.15) {
    labels.push("equivalente");
  }
  if (calDiff < -20) labels.push("menos-calorias");
  if (protDiff > 3) labels.push("mais-proteina");
  if (PRACTICAL_FOODS.has(candidate.name)) labels.push("mais-pratico");

  return labels;
}

export const SMART_LABEL_CONFIG: Record<SmartLabel, { text: string; color: string; emoji: string }> = {
  "equivalente": { text: "Equivalente", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", emoji: "⚖️" },
  "menos-calorias": { text: "Menos cal", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", emoji: "🔽" },
  "mais-proteina": { text: "+ Proteína", color: "bg-red-500/10 text-red-600 border-red-500/20", emoji: "💪" },
  "mais-pratico": { text: "Prático", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", emoji: "⚡" },
};

// ── Clinical Validation ──
interface ClinicalContext {
  restrictions?: string[]; // e.g. ["lactose", "gluten"]
  calorieRange?: { min: number; max: number };
  minProtein?: number;
  /** 🛡️ MEAL_TYPE_GUARD: slot da refeição (breakfast, lunch, etc). Quando informado,
   *  bloqueia candidatos que não pertencem a este slot, eliminando "tilápia no café". */
  slot?: string;
}

export function getValidSubstitutions(
  currentFood: string,
  context?: ClinicalContext,
  maxResults = 3,
): { food: FoodItem; labels: SmartLabel[] }[] {
  const query = norm(currentFood);

  // Find current food (exact/substring → fallback to fuzzy token match)
  let currentMatch = FOOD_DATABASE.find(f => {
    const n = norm(f.name);
    return n === query || query.includes(n) || n.includes(query);
  });
  if (!currentMatch) {
    const fuzzy = findFoodsInTitle(currentFood);
    currentMatch = fuzzy[0];
  }
  if (!currentMatch) return [];

  const group = getFoodGroup(currentMatch.name);

  // Get same-group foods first; fallback to same-category foods if group is missing or empty
  let candidates: FoodItem[] = [];
  if (group) {
    candidates = FOOD_DATABASE.filter(f => {
      if (f.name === currentMatch!.name) return false;
      return getFoodGroup(f.name) === group;
    });
  }
  // Fallback: same broad category (proteina, carboidrato, fruta, etc.)
  if (candidates.length === 0 && currentMatch.category) {
    candidates = FOOD_DATABASE.filter(f =>
      f.name !== currentMatch!.name && f.category === currentMatch!.category
    );
  }

  // Clinical filters
  if (context?.restrictions?.length) {
    const restricted = context.restrictions.map(r => r.toLowerCase());
    candidates = candidates.filter(f => {
      const n = f.name.toLowerCase();
      // Basic restriction check
      if (restricted.includes("lactose") && ["leite", "queijo", "iogurte", "requeijão", "cream cheese"].some(w => n.includes(w))) return false;
      if (restricted.includes("gluten") && ["pão", "macarrão", "aveia", "barrinha"].some(w => n.includes(w))) return false;
      return true;
    });
  }

  if (context?.calorieRange) {
    candidates = candidates.filter(f =>
      f.calories >= context.calorieRange!.min && f.calories <= context.calorieRange!.max
    );
  }

  if (context?.minProtein) {
    candidates = candidates.filter(f => f.protein >= context.minProtein!);
  }

  // Sort by caloric proximity
  candidates.sort((a, b) =>
    Math.abs(a.calories - currentMatch.calories) - Math.abs(b.calories - currentMatch.calories)
  );

  // Take top results and compute labels
  return candidates.slice(0, maxResults).map(food => ({
    food,
    labels: getSmartLabels(currentMatch, food),
  }));
}

// ── Group Labels ──
export const SUBSTITUTION_GROUP_LABELS: Record<SubstitutionGroup, string> = {
  "proteina-almoco": "🥩 Proteína Principal",
  "proteina-leve": "🍳 Proteína Leve",
  "proteina-peixe": "🐟 Peixes & Frutos do Mar",
  "carbo-almoco": "🍚 Carboidrato Almoço",
  "carbo-tuberoso": "🥔 Tubérculos",
  "carbo-cereal": "🌾 Pães & Cereais",
  "cafe-classico": "☕ Café da Manhã",
  "cafe-proteico": "💪 Café Proteico",
  "lanche-proteico": "🥪 Lanche Proteico",
  "lanche-leve": "🍫 Lanche Leve",
  "ceia-leve": "🌙 Ceia Leve",
  "salada-base": "🥗 Saladas & Vegetais",
  "fruta-doce": "🍌 Frutas Doces",
  "fruta-acida": "🍊 Frutas Ácidas",
  "gordura-oleaginosa": "🥜 Oleaginosas",
  "laticinio-proteico": "🧀 Laticínios Proteicos",
  "laticinio-leve": "🥛 Laticínios Leves",
};
