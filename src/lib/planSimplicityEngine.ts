/**
 * Motor de Simplicidade Inteligente de Planos Alimentares — FitJourney v3.0
 * 
 * Avalia complexidade, detecta problemas e gera substituições realistas
 * para planos alimentares baseados em comida brasileira popular.
 */

import {
  BLOCKED_FOODS,
  ALLOWED_FRUITS,
  MEAL_LIMITS,
  SUBSTITUTION_GROUPS,
} from "./mealPlanFoodRules";

// ── Types ────────────────────────────────────────────────────

export interface SimplicityIssue {
  itemId?: string;
  mealType: string;
  dayOfWeek?: number;
  issueType: SimplificityIssueType;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  suggestedFix: string;
  penaltyPoints: number;
}

export type SimplificityIssueType =
  | "blocked_food"
  | "excess_items"
  | "excess_fruits"
  | "complex_breakfast"
  | "complex_snack"
  | "excess_protein_breakfast"
  | "premium_ingredient"
  | "impractical_meal"
  | "gourmet_combination";

export interface SimplicityScore {
  total: number;
  label: string;
  color: string;
  issues: SimplicityIssue[];
  blockedFoodsFound: string[];
  problematicMeals: number;
  totalMeals: number;
}

export interface MealItemForAudit {
  id: string;
  title: string;
  description: string | null;
  meal_type: string;
  day_of_week: number | null;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
}

export interface SimplifiedReplacement {
  originalFood: string;
  replacement: string;
  reason: string;
  caloriesDiff?: number;
}

// ── Normalization ────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ── Extended blocked + premium list ──────────────────────────

const PREMIUM_KEYWORDS = [
  "premium", "importado", "importada", "gourmet", "artesanal",
  "overnight", "brunch", "toast", "wrap", "smoothie bowl",
  "açaí bowl", "poke", "buddha bowl",
];

const COMPLEX_PREP_KEYWORDS = [
  "overnight oats", "smoothie", "bowl de", "wrap de",
  "panqueca de", "crepe de", "risoto",
];

// ── Brazilian Replacement Map ────────────────────────────────

export const BRAZILIAN_REPLACEMENTS: Record<string, { replacement: string; reason: string }> = {
  "kefir": { replacement: "iogurte natural", reason: "Mais acessível e popular" },
  "cottage": { replacement: "queijo coalho", reason: "Queijo brasileiro equivalente" },
  "queijo cottage": { replacement: "queijo coalho", reason: "Queijo brasileiro equivalente" },
  "salmão": { replacement: "tilápia grelhada", reason: "Peixe popular e acessível" },
  "salmon": { replacement: "tilápia grelhada", reason: "Peixe popular e acessível" },
  "atum fresco": { replacement: "sardinha assada", reason: "Peixe mais acessível" },
  "blueberry": { replacement: "morango", reason: "Fruta nacional e barata" },
  "mirtilo": { replacement: "morango", reason: "Fruta nacional e barata" },
  "framboesa": { replacement: "morango", reason: "Fruta nacional e barata" },
  "cranberry": { replacement: "acerola", reason: "Fruta rica em vitamina C" },
  "quinoa": { replacement: "arroz integral", reason: "Cereal acessível e nutritivo" },
  "quinua": { replacement: "arroz integral", reason: "Cereal acessível e nutritivo" },
  "amaranto": { replacement: "aveia", reason: "Cereal popular e barato" },
  "tahine": { replacement: "pasta de amendoim", reason: "Pasta mais acessível" },
  "tahini": { replacement: "pasta de amendoim", reason: "Pasta mais acessível" },
  "cream cheese": { replacement: "requeijão", reason: "Cremoso brasileiro equivalente" },
  "philadelphia": { replacement: "requeijão", reason: "Cremoso brasileiro equivalente" },
  "iogurte grego": { replacement: "iogurte natural", reason: "Mais acessível" },
  "iogurte grego importado": { replacement: "iogurte natural", reason: "Mais acessível" },
  "wrap integral": { replacement: "tapioca", reason: "Opção brasileira prática" },
  "wrap": { replacement: "tapioca", reason: "Opção brasileira prática" },
  "overnight oats": { replacement: "aveia com banana", reason: "Mais simples e prático" },
  "hummus": { replacement: "feijão", reason: "Leguminosa brasileira" },
  "tofu": { replacement: "ovo cozido", reason: "Proteína mais acessível" },
  "tempeh": { replacement: "ovo cozido", reason: "Proteína mais acessível" },
  "edamame": { replacement: "amendoim torrado", reason: "Leguminosa brasileira" },
  "granola premium": { replacement: "granola simples", reason: "Versão mais acessível" },
  "mix de nuts": { replacement: "amendoim torrado", reason: "Mais acessível" },
  "trail mix": { replacement: "amendoim torrado", reason: "Mais acessível" },
  "castanha-do-pará": { replacement: "castanha de caju", reason: "Mais acessível" },
  "castanha do pará": { replacement: "castanha de caju", reason: "Mais acessível" },
  "macadâmia": { replacement: "amendoim", reason: "Mais acessível" },
  "pistache": { replacement: "amendoim", reason: "Mais acessível" },
  "leite de amêndoa": { replacement: "leite desnatado", reason: "Mais acessível e nutritivo" },
  "leite de coco": { replacement: "leite integral", reason: "Mais acessível" },
  "leite de aveia": { replacement: "leite integral", reason: "Mais acessível" },
  "whey protein": { replacement: "ovo cozido", reason: "Proteína natural e acessível" },
  "caseína": { replacement: "iogurte natural", reason: "Proteína natural" },
  "burrata": { replacement: "queijo muçarela", reason: "Queijo popular" },
  "brie": { replacement: "queijo minas", reason: "Queijo popular brasileiro" },
  "camembert": { replacement: "queijo minas", reason: "Queijo popular brasileiro" },
  "gorgonzola": { replacement: "queijo muçarela", reason: "Queijo popular" },
  "kombucha": { replacement: "chá natural", reason: "Bebida simples" },
  "abacate toast": { replacement: "pão com ovo", reason: "Café prático brasileiro" },
  "pão artesanal": { replacement: "pão integral", reason: "Mais acessível" },
  "manteiga de amêndoa": { replacement: "pasta de amendoim", reason: "Mais acessível" },
  "pasta de amendoim importada": { replacement: "amendoim torrado", reason: "Mais acessível" },
  "ricota importada": { replacement: "queijo minas", reason: "Queijo brasileiro" },
  "chia importada": { replacement: "linhaça", reason: "Semente acessível" },
  "hemp seed": { replacement: "linhaça", reason: "Semente acessível" },
  "açaí premium": { replacement: "banana", reason: "Fruta barata e nutritiva" },
  "semente de chia importada": { replacement: "linhaça", reason: "Semente nacional" },
  "coalhada": { replacement: "iogurte natural", reason: "Laticínio mais acessível" },
};

// ── Core: Calculate Plan Simplicity Score ────────────────────

export function calculatePlanSimplicityScore(items: MealItemForAudit[]): SimplicityScore {
  let score = 100;
  const issues: SimplicityIssue[] = [];
  const blockedFoodsFound: string[] = [];
  let problematicMeals = 0;

  // Group items by meal
  const mealGroups = new Map<string, MealItemForAudit[]>();
  for (const item of items) {
    const key = `${item.day_of_week ?? 0}_${item.meal_type}`;
    if (!mealGroups.has(key)) mealGroups.set(key, []);
    mealGroups.get(key)!.push(item);
  }

  for (const [key, mealItems] of mealGroups.entries()) {
    const [dayStr, ...mealParts] = key.split("_");
    const mealType = mealParts.join("_");
    const day = parseInt(dayStr);
    let mealHasIssue = false;

    // 1. Check blocked foods in each item
    for (const item of mealItems) {
      const allText = normalize(`${item.title} ${item.description || ""}`);
      
      for (const blocked of BLOCKED_FOODS) {
        if (allText.includes(normalize(blocked))) {
          const penalty = 10;
          score -= penalty;
          blockedFoodsFound.push(blocked);
          mealHasIssue = true;
          
          const replacement = BRAZILIAN_REPLACEMENTS[normalize(blocked)];
          issues.push({
            itemId: item.id,
            mealType,
            dayOfWeek: day,
            issueType: "blocked_food",
            severity: "critical",
            message: `Alimento bloqueado: "${blocked}"`,
            suggestedFix: replacement
              ? `Substituir por ${replacement.replacement} (${replacement.reason})`
              : `Remover "${blocked}" e usar alternativa brasileira`,
            penaltyPoints: penalty,
          });
        }
      }

      // Check premium keywords
      for (const kw of PREMIUM_KEYWORDS) {
        if (allText.includes(normalize(kw))) {
          score -= 8;
          mealHasIssue = true;
          issues.push({
            itemId: item.id,
            mealType,
            dayOfWeek: day,
            issueType: "premium_ingredient",
            severity: "high",
            message: `Ingrediente premium/gourmet detectado: "${kw}"`,
            suggestedFix: "Substituir por versão popular brasileira",
            penaltyPoints: 8,
          });
        }
      }

      // Check complex preparations
      for (const prep of COMPLEX_PREP_KEYWORDS) {
        if (allText.includes(normalize(prep))) {
          score -= 6;
          mealHasIssue = true;
          issues.push({
            itemId: item.id,
            mealType,
            dayOfWeek: day,
            issueType: "gourmet_combination",
            severity: "medium",
            message: `Preparo complexo: "${prep}"`,
            suggestedFix: "Simplificar para versão prática do dia a dia",
            penaltyPoints: 6,
          });
        }
      }
    }

    // 2. Check item count per meal
    if (mealItems.length > 5) {
      score -= 8;
      mealHasIssue = true;
      issues.push({
        mealType,
        dayOfWeek: day,
        issueType: "excess_items",
        severity: "high",
        message: `Refeição com ${mealItems.length} itens (máx 5)`,
        suggestedFix: "Reduzir para no máximo 5 itens por refeição",
        penaltyPoints: 8,
      });
    }

    // 3. Check fruit count
    const fruitCount = mealItems.filter(item => {
      const text = normalize(`${item.title} ${item.description || ""}`);
      return ALLOWED_FRUITS.some(f => text.includes(normalize(f)));
    }).length;

    if (fruitCount > MEAL_LIMITS.maxFruitsPerMeal) {
      score -= 8;
      mealHasIssue = true;
      issues.push({
        mealType,
        dayOfWeek: day,
        issueType: "excess_fruits",
        severity: "high",
        message: `${fruitCount} frutas na mesma refeição (máx ${MEAL_LIMITS.maxFruitsPerMeal})`,
        suggestedFix: "Reduzir para 1-2 frutas por refeição",
        penaltyPoints: 8,
      });
    }

    // 4. Check breakfast complexity
    if (mealType === "breakfast" || mealType === "cafe_da_manha") {
      if (mealItems.length > 3) {
        score -= 6;
        mealHasIssue = true;
        issues.push({
          mealType,
          dayOfWeek: day,
          issueType: "complex_breakfast",
          severity: "medium",
          message: `Café da manhã com ${mealItems.length} itens (recomendado: até 3)`,
          suggestedFix: "Simplificar: pão+ovo, tapioca+queijo, cuscuz+ovo",
          penaltyPoints: 6,
        });
      }

      // Check excess protein at breakfast for weight loss
      const totalProtein = mealItems.reduce((sum, i) => sum + (i.protein_target || 0), 0);
      if (totalProtein > 30) {
        score -= 8;
        mealHasIssue = true;
        issues.push({
          mealType,
          dayOfWeek: day,
          issueType: "excess_protein_breakfast",
          severity: "medium",
          message: `Proteína excessiva no café (${totalProtein}g)`,
          suggestedFix: "Reduzir para máx 2 ovos ou 1 porção de queijo",
          penaltyPoints: 8,
        });
      }
    }

    // 5. Check snack complexity
    if (mealType.includes("snack") || mealType.includes("lanche")) {
      if (mealItems.length > 2) {
        score -= 6;
        mealHasIssue = true;
        issues.push({
          mealType,
          dayOfWeek: day,
          issueType: "complex_snack",
          severity: "medium",
          message: `Lanche com ${mealItems.length} itens (recomendado: 1-2)`,
          suggestedFix: "Simplificar: 1 fruta ou fruta + iogurte",
          penaltyPoints: 6,
        });
      }
    }

    if (mealHasIssue) problematicMeals++;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  const label = score >= 90 ? "Simples e excelente"
    : score >= 75 ? "Aceitável"
    : score >= 60 ? "Complexo"
    : "Precisa simplificar urgente";

  const color = score >= 90 ? "text-green-600"
    : score >= 75 ? "text-blue-600"
    : score >= 60 ? "text-amber-600"
    : "text-red-600";

  return {
    total: score,
    label,
    color,
    issues,
    blockedFoodsFound: [...new Set(blockedFoodsFound)],
    problematicMeals,
    totalMeals: mealGroups.size,
  };
}

// ── Get Simple Brazilian Replacement ─────────────────────────

export function getSimpleBrazilianReplacement(
  foodName: string,
  _goal?: string,
  _mealType?: string
): SimplifiedReplacement | null {
  const normalized = normalize(foodName);

  // Direct match in replacement map
  for (const [key, value] of Object.entries(BRAZILIAN_REPLACEMENTS)) {
    if (normalized.includes(normalize(key))) {
      return {
        originalFood: foodName,
        replacement: value.replacement,
        reason: value.reason,
      };
    }
  }

  // Check if food is in blocked list
  for (const blocked of BLOCKED_FOODS) {
    if (normalized.includes(normalize(blocked))) {
      // Find by substitution groups
      for (const [, group] of Object.entries(SUBSTITUTION_GROUPS)) {
        const match = group.find(g => normalize(g) === normalize(blocked) || normalize(blocked).includes(normalize(g)));
        if (match) {
          const alt = group.find(g => normalize(g) !== normalize(match));
          if (alt) {
            return {
              originalFood: foodName,
              replacement: alt,
              reason: "Alternativa da mesma categoria",
            };
          }
        }
      }

      return {
        originalFood: foodName,
        replacement: "remover",
        reason: "Alimento premium sem substituto direto",
      };
    }
  }

  return null;
}

// ── Score Label Helpers ──────────────────────────────────────

export function getScoreBadgeColor(score: number): string {
  if (score >= 90) return "bg-green-500/10 text-green-700 border-green-500/20";
  if (score >= 75) return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  if (score >= 60) return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  return "bg-red-500/10 text-red-700 border-red-500/20";
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-500/10 text-red-700 border-red-500/20";
    case "high": return "bg-orange-500/10 text-orange-700 border-orange-500/20";
    case "medium": return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "low": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
    default: return "bg-muted text-muted-foreground";
  }
}

export function getMealTypeLabel(mealType: string): string {
  const labels: Record<string, string> = {
    breakfast: "☀️ Café da manhã",
    cafe_da_manha: "☀️ Café da manhã",
    morning_snack: "🍎 Lanche da manhã",
    lanche_manha: "🍎 Lanche da manhã",
    lunch: "🍽️ Almoço",
    almoco: "🍽️ Almoço",
    afternoon_snack: "🍌 Lanche da tarde",
    lanche_tarde: "🍌 Lanche da tarde",
    dinner: "🌙 Jantar",
    jantar: "🌙 Jantar",
    evening_snack: "🥛 Ceia",
    ceia: "🥛 Ceia",
  };
  return labels[mealType] || mealType;
}
