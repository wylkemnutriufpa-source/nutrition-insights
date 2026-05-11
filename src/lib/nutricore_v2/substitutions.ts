import { Food, FoodCategory } from "./food-database";
import { 
  isProtein as checkIsProtein, 
  isFruit as checkIsFruit,
  isBreadLike as checkIsBread,
  isComplexCarb as checkIsCarb,
  getFoodCategory 
} from "./helpers";

export interface Substitution {
  food: Food;
  grams: number;
  unit_label: string;
  kcal_diff: number;
}

/**
 * Motor de Equivalência Nutricional V3
 * ---------------------------------------------------------
 * Regra 1: Proteínas -> Equivalência por GRAMAS DE PROTEÍNA
 * Regra 2: Outros -> Equivalência por CALORIAS (KCAL)
 * Regra 3: NUNCA usar 100g fixo se a equivalência pedir outro valor
 */
export function getSubstitutions(
  food: Food,
  foodDb: Food[],
  currentGrams: number,
  restrictions: string[] = [],
  mealType?: string
): Substitution[] {
  // 🛡️ Extração Segura de Macros (Suporta kcal_100g e kcal Legado)
  const getMacros = (f: any) => ({
    p100: Number(f.protein_100g ?? f.protein ?? 0),
    c100: Number(f.carb_100g ?? f.carbs ?? 0),
    k100: Number(f.kcal_100g ?? f.kcal ?? 0)
  });

  const original = getMacros(food);
  const factor = currentGrams / 100;
  
  const originalProteinTotal = original.p100 * factor;
  const originalKcalTotal = original.k100 * factor;
  
  const name = food.name.toLowerCase();
  const category = getFoodCategory(food);
  const isProtein = checkIsProtein(name) || category === 'proteína';

  const candidates = foodDb.filter(f => {
    const candName = f.name.toLowerCase();
    const candCategory = getFoodCategory(f);
    
    // 🛡️ Filtro de Categoria Estrito: Evita Café <-> Frango
    if (candCategory !== category) return false;
    if (f.id === food.id) return false;
    
    // Bloquear restrições
    if (restrictions.some(r => candName.includes(r.toLowerCase()))) return false;

    return true;
  });

  const results: Substitution[] = candidates.map(candidate => {
    const cand = getMacros(candidate);
    let gramsSub = 0;

    if (isProtein) {
      // 🍖 REGRA DE OURO PROTEÍNA: Equivalência por gramas de proteína
      // gramas_sub = (proteina_original / proteina_candidato_100g) * 100
      if (cand.p100 > 0) {
        gramsSub = (originalProteinTotal / cand.p100) * 100;
      } else {
        // Fallback para kcal se o candidato não tiver proteína (segurança)
        gramsSub = cand.k100 > 0 ? (originalKcalTotal / cand.k100) * 100 : currentGrams;
      }
    } else {
      // 🍎 REGRA DE OURO CALORIAS: Frutas, Carbos, Gorduras
      if (cand.k100 > 0) {
        gramsSub = (originalKcalTotal / cand.k100) * 100;
      } else {
        gramsSub = currentGrams;
      }
    }

    // Arredondamento para múltiplos de 5g
    const roundedGrams = Math.round(gramsSub / 5) * 5;
    if (roundedGrams <= 5) return null; // Evitar quantidades irrelevantes
    
    // 🏷️ Rótulo de Unidade Inteligente (Humanizado)
    let unitLabel = `${roundedGrams}g`;
    const candName = candidate.name.toLowerCase();

    if (candName.includes('ovo')) {
      const units = Math.max(1, Math.round(roundedGrams / 50));
      unitLabel = `${units} ${units === 1 ? 'unidade' : 'unidades'} (${roundedGrams}g)`;
    } else if (candName.includes('pão integral') || candName.includes('pão de forma')) {
      const units = Math.max(1, Math.round(roundedGrams / 25));
      unitLabel = `${units} ${units === 1 ? 'fatia' : 'fatias'} (${roundedGrams}g)`;
    } else if (candName.includes('pão francês')) {
      const units = Math.max(1, Math.round(roundedGrams / 50));
      unitLabel = `${units} ${units === 1 ? 'unidade' : 'unidades'} (${roundedGrams}g)`;
    } else if (candName.includes('banana')) {
      const units = Math.round((roundedGrams / 90) * 10) / 10;
      unitLabel = `${units} unidade(s) M (${roundedGrams}g)`;
    } else if (checkIsFruit(candName)) {
      unitLabel = `1 unidade M (${roundedGrams}g)`;
    }

    const subKcal = (cand.k100 / 100) * roundedGrams;

    return {
      food: candidate,
      grams: roundedGrams,
      unit_label: unitLabel,
      kcal_diff: Math.round(subKcal - originalKcalTotal)
    };
  }).filter((s): s is Substitution => s !== null);

  // Ordenar por menor diferença calórica e limitar a 5
  return results.sort((a, b) => Math.abs(a.kcal_diff) - Math.abs(b.kcal_diff)).slice(0, 5);
}
