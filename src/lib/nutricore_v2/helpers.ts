
/**
 * NutriCore V2 - Helper functions for nutrition calculation and classification
 */

export const isProtein = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('frango') || n.includes('carne') || n.includes('peixe') || 
         n.includes('ovo') || n.includes('whey') || n.includes('patinho') || 
         n.includes('presunto') || n.includes('queijo') || n.includes('lombo') ||
         n.includes('músculo') || n.includes('alcatra') || n.includes('tilápia') ||
         n.includes('salmão') || n.includes('atum') || n.includes('omelete') ||
         n.includes('suplemento de proteína');
};

export const isComplexCarb = (name: string): boolean => {
  const n = name.toLowerCase();
  return (n.includes('arroz') || n.includes('batata') || n.includes('macarrão') || 
         n.includes('mandioca') || n.includes('milho')) && !isBreadLike(n);
};

export const isBreadLike = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('pão') || n.includes('tapioca') || n.includes('cuscuz') || 
         n.includes('torrada') || n.includes('aveia');
};

export const isCarb = (name: string): boolean => {
  return isComplexCarb(name) || isBreadLike(name);
};

export const isLegume = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('feijão') || n.includes('lentilha') || n.includes('grão de bico') || 
         n.includes('ervilha') || n.includes('soja');
};

export const isFruit = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('banana') || n.includes('maçã') || n.includes('uva') || 
         n.includes('fruta') || n.includes('suco') || n.includes('laranja') ||
         n.includes('mamão') || n.includes('melão') || n.includes('melancia') ||
         n.includes('abacaxi') || n.includes('morango') || n.includes('manga') ||
         n.includes('pera') || n.includes('goiaba') || n.includes('tangerina') ||
         n.includes('kiwi') || n.includes('ameixa');
};

export const isVegetable = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('alface') || n.includes('tomate') || n.includes('brócolis') || 
         n.includes('cenoura') || n.includes('vagem') || n.includes('abobrinha') ||
         n.includes('couve') || n.includes('repolho') || n.includes('chuchu') ||
         n.includes('espinafre');
};

export const isFat = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('azeite') || n.includes('manteiga') || n.includes('castanha') || 
         n.includes('amendoim') || n.includes('nozes') || n.includes('abacate') ||
         n.includes('óleo') || n.includes('banha');
};

export const getFoodCategory = (food: any): string => {
  if (food.category && food.category !== 'any') return food.category.toLowerCase();
  const name = food.name.toLowerCase();
  if (isProtein(name)) return 'proteína';
  if (isLegume(name)) return 'leguminosa';
  if (isCarb(name)) return 'carboidrato';
  if (isFruit(name)) return 'fruta';
  if (isVegetable(name)) return 'legume';
  if (isFat(name)) return 'gordura';
  return 'outro';
};

export const calculateItemMacros = (item: any, quantity: number) => {
  // 🛡️ BLINDAGEM V3: Priorizar valores por 100g para evitar distorção
  const kcal100 = item.kcal_100g ?? item.calories_100g;
  const protein100 = item.protein_100g ?? item.protein_g;
  const carbs100 = item.carb_100g ?? item.carbs_g;
  const fat100 = item.fat_100g ?? item.fat_g;

  let factor = 0;
  
  if (kcal100 !== undefined || protein100 !== undefined) {
    // Temos base de 100g. Calculamos o total de gramas primeiro.
    const totalGrams = (item.measurementType === 'unit' || item.measurementType === 'spoon')
      ? (quantity * (item.portionValue || 1))
      : quantity;
    factor = totalGrams / 100;
    
    return {
      kcal: Math.round((kcal100 || 0) * factor * 10) / 10,
      protein: Math.round((protein100 || 0) * factor * 10) / 10,
      carbs: Math.round((carbs100 || 0) * factor * 10) / 10,
      fat: Math.round((fat100 || 0) * factor * 10) / 10
    };
  }

  // Fallback para valores por porção (Legado ou Custom)
  const kcalPortion = item.kcal ?? item.calories ?? 0;
  const proteinPortion = item.protein ?? 0;
  const carbsPortion = item.carbs ?? 0;
  const fatPortion = item.fat ?? 0;

  if (item.measurementType === 'unit' || item.measurementType === 'spoon') {
    factor = quantity;
  } else {
    // Se for gramas e não temos kcal_100g, assumimos que kcalPortion é para portionValue gramas
    factor = quantity / (item.portionValue || 100);
  }

  return {
    kcal: Math.round(kcalPortion * factor * 10) / 10,
    protein: Math.round(proteinPortion * factor * 10) / 10,
    carbs: Math.round(carbsPortion * factor * 10) / 10,
    fat: Math.round(fatPortion * factor * 10) / 10
  };
};

export const getDeterministicSuggestions = (baseItemName: string, availableFoods: any[], baseMeasurementType?: string, basePortionLabel?: string): any[] => {
  const name = baseItemName.toLowerCase();
  let suggestions: any[] = [];

  if (isProtein(name)) {
    suggestions = availableFoods.filter(f => isProtein(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isCarb(name)) {
    suggestions = availableFoods.filter(f => isCarb(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isFruit(name)) {
    suggestions = availableFoods.filter(f => isFruit(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  }

  if (suggestions.length < 3) {
    const additional = availableFoods.filter(f => 
      f.measurementType === baseMeasurementType && 
      f.name.toLowerCase() !== name &&
      !suggestions.find(s => s.id === f.id)
    );
    suggestions = [...suggestions, ...additional];
  }

  return suggestions.sort((a, b) => {
    const aTypeMatch = a.measurementType === baseMeasurementType ? 1 : 0;
    const bTypeMatch = b.measurementType === baseMeasurementType ? 1 : 0;
    const aLabelMatch = basePortionLabel && a.portionLabel === basePortionLabel ? 1 : 0;
    const bLabelMatch = basePortionLabel && b.portionLabel === basePortionLabel ? 1 : 0;
    if (aTypeMatch !== bTypeMatch) return bTypeMatch - aTypeMatch;
    return bLabelMatch - aLabelMatch;
  }).slice(0, 5);
};

export const getSubstitutionsWithGrams = (request: any): any[] => {
  const { base_item, base_grams, available_foods, image_bank, max_suggestions = 5 } = request;
  
  const baseCategory = getFoodCategory(base_item);
  const baseKcalPerGram = (base_item.kcal_100g || base_item.kcal) / (base_item.portionValue || 100);
  const caloriesBase = baseKcalPerGram * base_grams;

  const imageMap = new Map(image_bank?.map((i: any) => [i.food_id, i.image_url]) || []);

  return available_foods
    .filter((food: any) => {
      if (getFoodCategory(food) !== baseCategory) return false;
      if (food.id === base_item.id) return false;
      const img = food.imageUrl || imageMap.get(food.id);
      return !!img;
    })
    .map((candidate: any) => {
      const candKcal = candidate.kcal_100g || candidate.kcal;
      const candidateKcalPerGram = candKcal / (candidate.portionValue || 100);
      
      let equivalentGrams = candidateKcalPerGram > 0 
        ? caloriesBase / candidateKcalPerGram 
        : base_grams;
      
      equivalentGrams = Math.round(equivalentGrams);

      let unidade = `${equivalentGrams}g`;
      if (candidate.measurementType === 'unit' && candidate.portionValue) {
        const units = Math.round((equivalentGrams / candidate.portionValue) * 10) / 10;
        if (units >= 0.1) {
          const unitLabel = candidate.name.toLowerCase().includes('ovo') ? (units === 1 ? 'unidade' : 'unidades') : (candidate.portionLabel || 'unidade');
          unidade = `${units} ${unitLabel} (${equivalentGrams}g)`;
        }
      } else if (candidate.measurementType === 'spoon') {
        const spoonWeight = candidate.portionValue || 15;
        const spoons = Math.round((equivalentGrams / spoonWeight) * 10) / 10;
        unidade = `${spoons} colheres (${equivalentGrams}g)`;
      }

      const ratio = equivalentGrams / (candidate.portionValue || 100);
      const calEquiv = candKcal * ratio;

      return {
        alimento: candidate.name,
        alimento_id: candidate.id,
        gramas: equivalentGrams,
        unidade,
        calorias_equivalentes: Math.round(calEquiv * 10) / 10,
        macros: {
          proteina_g: Math.round((candidate.protein_100g || candidate.protein) * ratio * 10) / 10,
          carboidrato_g: Math.round((candidate.carb_100g || candidate.carbs) * ratio * 10) / 10,
          gordura_g: Math.round((candidate.fat_100g || candidate.fat) * ratio * 10) / 10,
        },
        imagem_url: candidate.imageUrl || imageMap.get(candidate.id) || '',
        equivalencia_calorica: Math.round((1 - Math.abs(calEquiv - caloriesBase) / (caloriesBase || 1)) * 100)
      };
    })
    .sort((a: any, b: any) => b.equivalencia_calorica - a.equivalencia_calorica)
    .slice(0, max_suggestions);
};
