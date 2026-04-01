/**
 * Regras de Alimentos Realistas — FitJourney v3.0
 * 
 * Garante que planos alimentares sejam simples, acessíveis e baseados em
 * comida brasileira popular. Aplicado em TODOS os geradores.
 * 
 * Princípios:
 * 1. Priorizar comida brasileira comum e acessível
 * 2. Nunca usar alimentos caros/importados por padrão
 * 3. Limite rígido de frutas (1-2 por refeição)
 * 4. Estrutura fixa por objetivo (emagrecimento vs ganho de massa)
 * 5. Substituições apenas dentro da mesma categoria
 */

// ── Alimentos bloqueados (caros, importados, pouco acessíveis ou fora do banco validado) ──
export const BLOCKED_FOODS = [
  "salmão", "salmon", "atum fresco",
  "kefir", "cottage", "queijo cottage", "ricota", "ricota importada",
  "queijo minas", "peito de peru", "peru defumado", "blanquet", "blanquet de peru",
  "quinoa", "quinua", "amaranto",
  "castanha-do-pará", "castanha do pará", "macadâmia", "pistache",
  "framboesa", "mirtilo", "blueberry", "cranberry", "açaí premium",
  "tofu", "tempeh", "edamame",
  "granola premium", "mix de nuts", "trail mix",
  "azeite trufado", "vinagre balsâmico",
  "pasta de amendoim importada", "manteiga de amêndoa",
  "whey protein", "caseína", "creatina",
  "wrap integral", "pão artesanal",
  "leite de amêndoa", "leite de coco", "leite de aveia",
  "abacate toast", "overnight oats",
  "cream cheese", "philadelphia",
  "iogurte grego importado",
  "coalhada", "kombucha",
  "semente de chia importada", "hemp seed",
  "tahini", "hummus",
  "burrata", "brie", "camembert", "gorgonzola",
];

// ── Alimentos permitidos por categoria ──
export const ALLOWED_PROTEINS = [
  "frango", "peito de frango", "coxa de frango", "sobrecoxa",
  "carne moída", "patinho", "alcatra", "carne de panela", "acém",
  "peixe", "tilápia", "sardinha", "merluza",
  "porco", "lombo", "bisteca",
  "ovo", "ovos", "ovo cozido", "ovo mexido", "omelete",
  "linguiça de frango",
];

export const ALLOWED_CARBS = [
  "arroz", "arroz branco", "arroz integral",
  "macarrão", "espaguete", "macarrão integral",
  "batata", "batata doce", "batata inglesa", "purê de batata",
  "macaxeira", "aipim", "mandioca",
  "cuscuz", "cuscuz de milho",
  "pão", "pão francês", "pão integral", "pão de forma",
  "tapioca",
  "farofa", "farinha de mandioca",
  "inhame", "cará",
  "milho", "milho cozido",
  "aveia",
];

export const ALLOWED_VEGETABLES = [
  "alface", "tomate", "pepino", "cenoura",
  "brócolis", "couve", "repolho", "espinafre",
  "chuchu", "abobrinha", "abóbora", "quiabo",
  "vagem", "beterraba", "maxixe",
  "feijão", "feijão preto", "feijão carioca", "feijão verde",
  "lentilha",
];

export const ALLOWED_FRUITS = [
  "banana", "maçã", "laranja", "mamão", "manga",
  "melancia", "melão", "abacaxi", "uva",
  "morango", "goiaba", "acerola",
  "tangerina", "limão", "maracujá",
  "abacate",
];

export const ALLOWED_DAIRY = [
  "leite", "leite integral", "leite desnatado",
  "iogurte natural", "iogurte desnatado",
  "queijo coalho", "queijo muçarela",
  "requeijão", "requeijão light",
  "manteiga",
];

export const ALLOWED_EXTRAS = [
  "café", "chá", "suco natural",
  "azeite de oliva", "óleo de soja",
  "mel", "açúcar",
  "amendoim", "amendoim torrado",
  "castanha de caju",
  "granola simples",
  "chia", "linhaça",
  "pão de queijo",
];

// ── Limites por refeição ──
export const MEAL_LIMITS = {
  maxFruitsPerMeal: 2,
  maxFruitsPerDay: 4,
  maxEggsBreakfast: 2,
  maxEggsPerMeal: 3,
  minProteinMainMeal: 100, // gramas mínimas de proteína fonte por refeição principal
  maxProteinMainMeal: 250, // gramas máximas
};

// ── Estruturas realistas de refeição por objetivo ──
export interface RealisticMealStructure {
  mealType: string;
  requiredCategories: string[]; // categorias obrigatórias
  optionalCategories: string[]; // categorias opcionais (0-1 item)
  maxItems: number;
  notes: string;
}

export const EMAGRECIMENTO_STRUCTURES: RealisticMealStructure[] = [
  {
    mealType: "breakfast",
    requiredCategories: ["carb_simple", "protein_simple"],
    optionalCategories: ["fruit"],
    maxItems: 3,
    notes: "Café simples: pão+ovo, tapioca+ovo, cuscuz+queijo",
  },
  {
    mealType: "morning_snack",
    requiredCategories: ["fruit"],
    optionalCategories: [],
    maxItems: 1,
    notes: "1 fruta padrão, nunca exagero",
  },
  {
    mealType: "lunch",
    requiredCategories: ["protein_main", "carb_main"],
    optionalCategories: ["vegetable", "legume"],
    maxItems: 5,
    notes: "Proteína + carboidrato + legume opcional",
  },
  {
    mealType: "afternoon_snack",
    requiredCategories: ["fruit"],
    optionalCategories: ["dairy"],
    maxItems: 2,
    notes: "1 fruta ou fruta + iogurte",
  },
  {
    mealType: "dinner",
    requiredCategories: ["protein_main", "carb_main"],
    optionalCategories: ["vegetable"],
    maxItems: 4,
    notes: "Similar ao almoço, porção menor",
  },
  {
    mealType: "evening_snack",
    requiredCategories: ["dairy"],
    optionalCategories: [],
    maxItems: 1,
    notes: "Iogurte ou leite",
  },
];

export const GANHO_MASSA_STRUCTURES: RealisticMealStructure[] = [
  {
    mealType: "breakfast",
    requiredCategories: ["carb_simple", "protein_reinforced"],
    optionalCategories: ["dairy"],
    maxItems: 4,
    notes: "Café reforçado: pão+2 ovos+queijo, omelete",
  },
  {
    mealType: "morning_snack",
    requiredCategories: ["carb_simple", "protein_simple"],
    optionalCategories: ["fruit"],
    maxItems: 3,
    notes: "Repetir café ou variação proteica",
  },
  {
    mealType: "lunch",
    requiredCategories: ["protein_main", "carb_main", "legume"],
    optionalCategories: ["vegetable"],
    maxItems: 6,
    notes: "Maior quantidade de proteína e carb",
  },
  {
    mealType: "afternoon_snack",
    requiredCategories: ["carb_simple", "protein_simple"],
    optionalCategories: ["fruit"],
    maxItems: 3,
    notes: "Lanche proteico: pão+ovo ou tapioca+queijo",
  },
  {
    mealType: "dinner",
    requiredCategories: ["protein_main", "carb_main"],
    optionalCategories: ["vegetable", "legume"],
    maxItems: 6,
    notes: "Mesma base do almoço",
  },
  {
    mealType: "evening_snack",
    requiredCategories: ["protein_simple"],
    optionalCategories: ["dairy"],
    maxItems: 2,
    notes: "Ovo cozido ou iogurte",
  },
];

// ── Opções realistas de café da manhã (exemplos concretos) ──
export const BREAKFAST_OPTIONS_EMAG = [
  { name: "Pão integral com ovo mexido", foods: ["1 fatia de pão integral", "1 ovo mexido"], kcal: 230, protein: 12, carbs: 22, fat: 10 },
  { name: "Tapioca com ovo e queijo", foods: ["1 tapioca média", "1 ovo", "1 fatia queijo minas"], kcal: 280, protein: 15, carbs: 30, fat: 11 },
  { name: "Cuscuz com ovo cozido", foods: ["1 fatia de cuscuz", "1 ovo cozido"], kcal: 240, protein: 11, carbs: 32, fat: 8 },
  { name: "Pão com queijo e café", foods: ["1 pão francês", "1 fatia queijo muçarela", "café s/ açúcar"], kcal: 250, protein: 10, carbs: 28, fat: 10 },
  { name: "Aveia com banana", foods: ["3 col. sopa de aveia", "1 banana"], kcal: 220, protein: 6, carbs: 40, fat: 4 },
];

export const BREAKFAST_OPTIONS_MASSA = [
  { name: "Pão com 2 ovos e queijo", foods: ["2 fatias pão integral", "2 ovos mexidos", "1 fatia queijo minas"], kcal: 420, protein: 24, carbs: 35, fat: 18 },
  { name: "Omelete com pão", foods: ["Omelete 3 ovos", "1 pão francês"], kcal: 450, protein: 26, carbs: 28, fat: 22 },
  { name: "Tapioca reforçada", foods: ["1 tapioca grande", "2 ovos", "queijo coalho"], kcal: 430, protein: 22, carbs: 38, fat: 16 },
  { name: "Cuscuz com ovo e queijo", foods: ["2 fatias cuscuz", "2 ovos", "requeijão"], kcal: 440, protein: 20, carbs: 45, fat: 15 },
];

// ── Opções realistas de almoço/jantar ──
export const MAIN_MEAL_OPTIONS_EMAG = [
  { name: "Frango grelhado com arroz e salada", foods: ["150g peito de frango grelhado", "3 col. sopa arroz", "salada verde"], kcal: 380, protein: 38, carbs: 35, fat: 8 },
  { name: "Carne moída com purê", foods: ["120g carne moída refogada", "2 col. sopa purê de batata", "salada"], kcal: 370, protein: 28, carbs: 30, fat: 12 },
  { name: "Tilápia com macaxeira", foods: ["150g tilápia grelhada", "100g macaxeira cozida", "legumes"], kcal: 350, protein: 35, carbs: 32, fat: 6 },
  { name: "Bife com arroz e feijão", foods: ["120g bife de alcatra", "3 col. sopa arroz", "2 col. sopa feijão"], kcal: 420, protein: 32, carbs: 40, fat: 12 },
  { name: "Frango com macarrão", foods: ["120g frango desfiado", "100g macarrão", "molho de tomate"], kcal: 400, protein: 30, carbs: 42, fat: 10 },
  { name: "Carne de panela com batata", foods: ["120g carne de panela", "100g batata cozida", "cenoura"], kcal: 380, protein: 30, carbs: 28, fat: 14 },
];

export const MAIN_MEAL_OPTIONS_MASSA = [
  { name: "Frango grelhado com arroz e feijão", foods: ["200g peito de frango", "5 col. sopa arroz", "3 col. sopa feijão", "salada"], kcal: 580, protein: 48, carbs: 55, fat: 12 },
  { name: "Bife com batata doce", foods: ["180g alcatra grelhada", "150g batata doce", "brócolis"], kcal: 550, protein: 42, carbs: 45, fat: 16 },
  { name: "Carne moída com macarrão", foods: ["150g carne moída", "120g macarrão", "molho de tomate", "salada"], kcal: 560, protein: 38, carbs: 52, fat: 16 },
  { name: "Tilápia com arroz e legumes", foods: ["200g tilápia", "5 col. sopa arroz", "legumes refogados"], kcal: 520, protein: 44, carbs: 50, fat: 10 },
];

// ── Opções de lanches ──
export const SNACK_OPTIONS = [
  { name: "Banana", foods: ["1 banana média"], kcal: 90, protein: 1, carbs: 22, fat: 0 },
  { name: "Maçã", foods: ["1 maçã média"], kcal: 80, protein: 0, carbs: 20, fat: 0 },
  { name: "Mamão", foods: ["1 fatia de mamão"], kcal: 70, protein: 1, carbs: 17, fat: 0 },
  { name: "Laranja", foods: ["1 laranja média"], kcal: 60, protein: 1, carbs: 14, fat: 0 },
  { name: "Goiaba", foods: ["1 goiaba média"], kcal: 65, protein: 1, carbs: 14, fat: 1 },
  { name: "Iogurte natural", foods: ["1 pote iogurte natural"], kcal: 100, protein: 6, carbs: 8, fat: 4 },
  { name: "Banana com aveia", foods: ["1 banana", "1 col. sopa aveia"], kcal: 130, protein: 3, carbs: 28, fat: 2 },
];

// ── Substituições por categoria ──
export const SUBSTITUTION_GROUPS = {
  protein_main: ["frango", "carne moída", "bife", "tilápia", "porco", "sardinha"],
  carb_main: ["arroz", "macarrão", "batata", "macaxeira", "batata doce", "inhame"],
  carb_breakfast: ["pão integral", "tapioca", "cuscuz", "pão francês"],
  protein_breakfast: ["ovo mexido", "ovo cozido", "queijo coalho", "queijo muçarela"],
  fruit: ["banana", "maçã", "mamão", "laranja", "goiaba", "morango", "tangerina"],
  dairy: ["iogurte natural", "leite", "queijo minas"],
  legume: ["feijão", "lentilha", "feijão verde"],
  vegetable: ["alface", "tomate", "brócolis", "cenoura", "couve"],
};

// ── Validação de alimentos ──
function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function isBlockedFood(foodName: string): boolean {
  const n = normalize(foodName);
  return BLOCKED_FOODS.some(blocked => n.includes(normalize(blocked)));
}

export function countFruitsInMeal(foods: string[]): number {
  const fruitNames = ALLOWED_FRUITS.map(f => normalize(f));
  return foods.filter(food => {
    const n = normalize(food);
    return fruitNames.some(fn => n.includes(fn));
  }).length;
}

export function validateMealItems(foods: string[], mealType: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check blocked foods
  const blocked = foods.filter(f => isBlockedFood(f));
  if (blocked.length > 0) {
    warnings.push(`Alimentos bloqueados: ${blocked.join(", ")}`);
  }

  // Check fruit limits
  const fruitCount = countFruitsInMeal(foods);
  if (fruitCount > MEAL_LIMITS.maxFruitsPerMeal) {
    warnings.push(`Excesso de frutas (${fruitCount}/${MEAL_LIMITS.maxFruitsPerMeal} máx)`);
  }

  return { valid: warnings.length === 0, warnings };
}

/**
 * Returns the appropriate meal structure templates based on goal
 */
export function getStructuresForGoal(goal: string): RealisticMealStructure[] {
  const lossGoals = ["lose_weight", "weight_loss", "emagrecimento", "deficit", "low_carb"];
  if (lossGoals.includes(goal)) return EMAGRECIMENTO_STRUCTURES;
  return GANHO_MASSA_STRUCTURES;
}

/**
 * Returns realistic meal options for a given meal type and goal
 */
export function getRealisticOptions(mealType: string, goal: string) {
  const isLoss = ["lose_weight", "weight_loss", "emagrecimento", "deficit", "low_carb"].includes(goal);

  switch (mealType) {
    case "breakfast":
      return isLoss ? BREAKFAST_OPTIONS_EMAG : BREAKFAST_OPTIONS_MASSA;
    case "morning_snack":
    case "afternoon_snack":
    case "evening_snack":
      return SNACK_OPTIONS;
    case "lunch":
    case "dinner":
      return isLoss ? MAIN_MEAL_OPTIONS_EMAG : MAIN_MEAL_OPTIONS_MASSA;
    default:
      return SNACK_OPTIONS;
  }
}

/**
 * Get valid substitutions for a food within its category
 */
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
