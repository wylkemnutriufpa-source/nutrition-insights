
/**
 * NutriCore V3 - Helper functions for nutrition calculation and classification
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
export const isHeavyProtein = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('frango') || n.includes('carne') || n.includes('peixe') || 
         n.includes('tilápia') || n.includes('salmão') || n.includes('atum') || 
         n.includes('patinho') || n.includes('lombo') || n.includes('músculo') || 
         n.includes('alcatra');
};

export const isBreakfastProtein = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('ovo') || n.includes('whey') || n.includes('queijo') || 
         n.includes('iogurte') || n.includes('omelete') || n.includes('cottage');
};

export const isComplexCarb = (name: string): boolean => {
  const n = name.toLowerCase();
  return (n.includes('arroz') || n.includes('batata') || n.includes('macarrão') || 
         n.includes('mandioca') || n.includes('milho') || n.includes('inhame')) && !isBreadLike(n);
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
  if (food.category && food.category !== 'any') {
    const cat = food.category.toLowerCase();
    if (cat === 'protein') return 'proteína';
    if (cat === 'carb') return 'carboidrato';
    if (cat === 'fruit') return 'fruta';
    if (cat === 'fat') return 'gordura';
    if (cat === 'vegetable') return 'vegetal';
    if (cat === 'legume') return 'leguminosa';
    return cat;
  }
  const name = food.name.toLowerCase();
  if (isProtein(name)) return 'proteína';
  if (isLegume(name)) return 'leguminosa';
  if (isBreadLike(name)) return 'pão/substituto';
  if (isComplexCarb(name)) return 'carboidrato';
  if (isFruit(name)) return 'fruta';
  if (isVegetable(name)) return 'legume';
  if (isFat(name)) return 'gordura';
  if (name.includes('café') || name.includes('chá') || name.includes('água')) return 'bebida';
  return 'outro';
};

const resolveMacroGrams = (item: any, quantity: number) => {
  // 🛡️ SOBERANIA CLÍNICA: Se temos a massa clínica, ela governa absolutamente
  if (item.clinical_mass_g !== undefined && item.clinical_mass_g !== null) {
    return Number(item.clinical_mass_g);
  }

  // Se não temos clinical_mass_g, tentamos derivar da quantity + portionValue
  // Mas NUNCA adivinhamos se o dado estiver ausente.
  const portionValue = Number(item.portionValue);
  
  if (item.measurementType === 'unit' || item.measurementType === 'spoon') {
    if (!portionValue || portionValue <= 0) {
      console.error('[V3-MOTOR] Item missing portionValue for unit/spoon measurement:', item.name);
      return 0; // Falha explícita
    }
    return quantity * portionValue;
  }

  return Math.max(0, quantity);
};

export const calculateItemMacros = (item: any, quantity: number) => {
  // 🛡️ BORDER GOVERNANCE: Macros MUST always derive from clinical_mass_g if available
  const grams = item.clinical_mass_g ?? resolveMacroGrams(item, quantity);
  
  const kcal100 = Number(item.kcal_100g ?? item.calories_100g ?? 0);
  const protein100 = Number(item.protein_100g ?? item.protein_g ?? 0);
  const carbs100 = Number(item.carb_100g ?? item.carbs_g ?? 0);
  const fat100 = Number(item.fat_100g ?? item.fat_g ?? 0);

  const factor = grams / 100;
  
  const result = {
    kcal: Math.round(kcal100 * factor * 10) / 10,
    protein: Math.round(protein100 * factor * 10) / 10,
    carbs: Math.round(carbs100 * factor * 10) / 10,
    fat: Math.round(fat100 * factor * 10) / 10
  };

  // 🛑 ANTI-EXPLOSION: Absolute sanity check
  if (result.kcal > 10000) {
     console.error('[V3-MOTOR] Clinical Explosion Detected:', item.name, grams, 'g');
     return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  }

  return result;
};

export const getDeterministicSuggestions = (baseItemName: string, availableFoods: any[], baseMeasurementType?: string, basePortionLabel?: string): any[] => {
  const name = baseItemName.toLowerCase();
  let suggestions: any[] = [];

  if (isProtein(name)) {
    suggestions = availableFoods.filter(f => isProtein(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isBreadLike(name)) {
    suggestions = availableFoods.filter(f => isBreadLike(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isComplexCarb(name)) {
    suggestions = availableFoods.filter(f => isComplexCarb(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isFruit(name)) {
    suggestions = availableFoods.filter(f => isFruit(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isLegume(name)) {
    suggestions = availableFoods.filter(f => isLegume(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
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
  const baseKcal = base_item.kcal_100g ?? base_item.kcal ?? 0;
  const baseKcalPerGram = base_item.kcal_100g !== undefined ? baseKcal / 100 : baseKcal / (base_item.portionValue || 100);
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
      const candKcal = candidate.kcal_100g ?? candidate.kcal ?? 0;
      const candidateKcalPerGram = candidate.kcal_100g !== undefined ? candKcal / 100 : candKcal / (candidate.portionValue || 100);
      
      let equivalentGrams = candidateKcalPerGram > 0 
        ? caloriesBase / candidateKcalPerGram 
        : base_grams;
      
      equivalentGrams = Math.round(equivalentGrams);

      // 🛡️ SOBERANIA CLÍNICA: A unidade é derivada estritamente da estrutura do candidato, sem regex.
      let unidade = `${equivalentGrams}g`;
      if (candidate.measurementType === 'unit' && candidate.portionValue > 0) {
        const units = Math.round((equivalentGrams / candidate.portionValue) * 10) / 10;
        if (units >= 0.1) {
          const unitLabel = candidate.portionUnitLabel || candidate.portionLabel || 'unidade';
          unidade = `${units} ${unitLabel} (${equivalentGrams}g)`;
        }
      } else if (candidate.measurementType === 'spoon' && candidate.portionValue > 0) {
        const spoonWeight = candidate.portionValue;
        const spoons = Math.round((equivalentGrams / spoonWeight) * 10) / 10;
        const spoonLabel = candidate.portionUnitLabel || 'colher(es)';
        unidade = `${spoons} ${spoonLabel} (${equivalentGrams}g)`;
      }

      const ratioKcal = candidate.kcal_100g !== undefined ? equivalentGrams / 100 : equivalentGrams / (candidate.portionValue || 100);
      const calEquiv = candKcal * ratioKcal;

      return {
        alimento: candidate.name,
        alimento_id: candidate.id,
        gramas: equivalentGrams,
        unidade,
        calorias_equivalentes: Math.round(calEquiv * 10) / 10,
        macros: {
          proteina_g: Math.round((candidate.protein_100g ?? candidate.protein ?? 0) * ratioKcal * 10) / 10,
          carboidrato_g: Math.round((candidate.carb_100g ?? candidate.carbs ?? 0) * ratioKcal * 10) / 10,
          gordura_g: Math.round((candidate.fat_100g ?? candidate.fat ?? 0) * ratioKcal * 10) / 10,
        },
        imagem_url: candidate.imageUrl || imageMap.get(candidate.id) || '',
        equivalencia_calorica: Math.round((1 - Math.abs(calEquiv - caloriesBase) / (caloriesBase || 1)) * 100)
      };
    })
    .sort((a: any, b: any) => b.equivalencia_calorica - a.equivalencia_calorica)
    .slice(0, max_suggestions);
};
