import { Food, FoodCategory } from "./food-database";

export interface Substitution {
  food: Food;
  grams: number;
  unit_label: string;
  kcal_diff: number; // Diferença calórica em relação ao original
  suggested_adjustment?: {
    foodName: string;
    gramsChange: number;
  };
}

/**
 * Calcula substituições baseadas na equivalência do macro principal da categoria.
 * Ex: Proteína para Proteínas, Carbo para Carbos.
 */
export function getSubstitutions(
  food: Food,
  foodDb: Food[],
  currentGrams: number,
  restrictions: string[] = [],
  mealType?: string
): Substitution[] {
  const originalFactor = currentGrams / 100;
  const originalProtein = food.protein_100g * originalFactor;
  const originalCarb = food.carb_100g * originalFactor;
  const originalKcal = food.kcal_100g * originalFactor;
  
  const name = food.name.toLowerCase();
  
  // Categorias Clínicas Estritas
  const isPaoLike = (n: string) => n.includes('pão') || n.includes('tapioca') || n.includes('cuscuz') || n.includes('torrada') || n.includes('aveia');
  const isMainCarb = (n: string) => (n.includes('arroz') || n.includes('batata') || n.includes('macarrão') || n.includes('mandioca') || n.includes('milho')) && !isPaoLike(n);
  const isProtein = (n: string) => n.includes('frango') || n.includes('carne') || n.includes('peixe') || n.includes('ovo') || n.includes('tilápia') || n.includes('atum') || n.includes('whey') || n.includes('patinho');
  const isHeavyProtein = (n: string) => n.includes('carne') || n.includes('patinho') || n.includes('peixe') || n.includes('frango') || n.includes('tilápia');
  const isLegume = (n: string) => n.includes('feijão') || n.includes('lentilha') || n.includes('grão de bico') || n.includes('ervilha');

  const foodIsPao = isPaoLike(name);
  const foodIsMainCarb = isMainCarb(name);
  const foodIsProtein = isProtein(name);
  const foodIsLegume = isLegume(name);

  // 🛡️ BLINDAGEM CEIA/LANCHE: Bloquear carnes pesadas em refeições leves
  const isLightMeal = mealType && (
    mealType.toLowerCase().includes('ceia') || 
    mealType.toLowerCase().includes('lanche') ||
    mealType.toLowerCase().includes('cafe')
  );

  const candidates = foodDb.filter(f => {
    const candName = f.name.toLowerCase();
    
    // Regra de Ouro: Se for Ceia/Lanche, NÃO sugerir carnes pesadas (frango, carne, peixe) 
    // exceto se o alimento original já for uma delas (para permitir trocas entre si se o usuário quiser, 
    // mas o motor não deve sugerir carne se o original for ovo na ceia)
    if (isLightMeal && !isHeavyProtein(name) && isHeavyProtein(candName)) {
      return false;
    }

    return f.id !== food.id &&
      !restrictions.some(r => candName.includes(r.toLowerCase()));
  });

  const results: Substitution[] = candidates.map(candidate => {
    let gramsSub = 0;
    const candName = candidate.name.toLowerCase();
    
    // 1. Match Estrito de Categoria Clínica
    if (foodIsPao && isPaoLike(candName)) {
      gramsSub = (originalCarb / (candidate.carb_100g / 100));
    } else if (foodIsMainCarb && isMainCarb(candName)) {
      gramsSub = (originalCarb / (candidate.carb_100g / 100));
    } else if (foodIsProtein && isProtein(candName)) {
      gramsSub = (originalProtein / (candidate.protein_100g / 100));
    } else if (foodIsLegume && isLegume(candName)) {
      gramsSub = (originalCarb / (candidate.carb_100g / 100)); // Equivalência por carbo/fibras
    } else if (!foodIsPao && !foodIsMainCarb && !foodIsProtein && !foodIsLegume && candidate.category === food.category) {
      // Outras categorias (frutas, gorduras, etc)
      gramsSub = (originalKcal / (candidate.kcal_100g / 100));
    } else {
      return null; // Bloqueia Arroz <-> Pão ou Feijão <-> Pão
    }

    // Arredondamento para múltiplos de 5g
    const roundedGrams = Math.round(gramsSub / 5) * 5;
    if (roundedGrams <= 0) return null;
    
    // Rótulo de unidade humanizado
    let unitLabel = `${roundedGrams}g`;
    if (candName.includes('ovo')) {
      const units = Math.max(1, Math.round(roundedGrams / 50));
      unitLabel = `${units} ${units === 1 ? 'unidade' : 'unidades'} (${roundedGrams}g)`;
    } else if (candName.includes('pão integral') || candName.includes('pão de forma')) {
      const units = Math.max(1, Math.round(roundedGrams / 25));
      unitLabel = `${units} ${units === 1 ? 'fatia' : 'fatias'} (${roundedGrams}g)`;
    } else if (candName.includes('pão francês')) {
      const units = Math.max(1, Math.round(roundedGrams / 50));
      unitLabel = `${units} ${units === 1 ? 'unidade' : 'unidades'} (${roundedGrams}g)`;
    } else if (candName.includes('frango') || candName.includes('carne')) {
      const filéType = roundedGrams >= 200 ? 'G' : (roundedGrams >= 150 ? 'M' : 'P');
      unitLabel = `1 filé ${filéType} (${roundedGrams}g)`;
    }

    const subKcal = (candidate.kcal_100g / 100) * roundedGrams;
    const kcalDiff = Math.round(subKcal - originalKcal);

    return {
      food: candidate,
      grams: roundedGrams,
      unit_label: unitLabel,
      kcal_diff: kcalDiff
    };
  }).filter((s): s is Substitution => s !== null);

  return results.sort((a, b) => Math.abs(a.kcal_diff) - Math.abs(b.kcal_diff)).slice(0, 5);
}
