import { Food } from '../types/clinical-types';

export const isProtein = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('frango') || n.includes('carne') || n.includes('peixe') || 
         n.includes('ovo') || n.includes('whey') || n.includes('patinho') || 
         n.includes('presunto') || n.includes('queijo') || n.includes('lombo') ||
         n.includes('músculo') || n.includes('alcatra') || n.includes('tilápia') ||
         n.includes('salmão') || n.includes('atum');
};

export const isCarb = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('arroz') || n.includes('batata') || n.includes('macarrão') || 
         n.includes('feijão') || n.includes('pão') || n.includes('aveia') || 
         n.includes('tapioca') || n.includes('cuscuz') || n.includes('mandioca') ||
         n.includes('milho') || n.includes('grão de bico') || n.includes('lentilha');
};

export const isFruit = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('banana') || n.includes('maçã') || n.includes('uva') || 
         n.includes('fruta') || n.includes('suco') || n.includes('laranja') ||
         n.includes('mamão') || n.includes('melão') || n.includes('melancia') ||
         n.includes('abacaxi') || n.includes('morango') || n.includes('manga');
};

export const calculateItemMacros = (item: Partial<Food>, quantity: number) => {
  const cal = item.calories || item.kcal || 0;
  const protein = item.protein ?? 0;
  const carbs = item.carbs ?? 0;
  const fat = item.fat ?? 0;

  const factor = (item.measurementType === 'gram' || item.measurementType === 'ml') ? quantity / 100 : quantity;

  return {
    kcal: cal * factor,
    protein: protein * factor,
    carbs: carbs * factor,
    fat: fat * factor
  };
};

/**
 * Motor V3 Determinístico - Regras de Sugestão
 * 1. Prioriza mesma categoria nutricional (Proteína, Carbo, Fruta)
 * 2. Se não encontrar, prioriza mesma unidade de medida
 * 3. Ordena por compatibilidade de measurementType
 */
export const getDeterministicSuggestions = (baseItemName: string, availableFoods: Food[], baseMeasurementType?: string, basePortionLabel?: string): Food[] => {
  const startTime = performance.now();
  const name = baseItemName.toLowerCase();
  let suggestions: Food[] = [];

  if (isProtein(name)) {
    suggestions = availableFoods.filter(f => isProtein(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isCarb(name)) {
    suggestions = availableFoods.filter(f => isCarb(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  } else if (isFruit(name)) {
    suggestions = availableFoods.filter(f => isFruit(f.name.toLowerCase()) && f.name.toLowerCase() !== name);
  }

  // Fallback: mesma unidade de medida se poucas sugestões
  if (suggestions.length < 3) {
    const additional = availableFoods.filter(f => 
      f.measurementType === baseMeasurementType && 
      f.name.toLowerCase() !== name &&
      !suggestions.find(s => s.id === f.id)
    );
    suggestions = [...suggestions, ...additional];
  }

  // Priorização por measurementType e portionLabel compatíveis
  const result = suggestions.sort((a, b) => {
    // Mesma unidade de medida (gram/unit/spoon)
    const aTypeMatch = a.measurementType === baseMeasurementType ? 1 : 0;
    const bTypeMatch = b.measurementType === baseMeasurementType ? 1 : 0;
    
    // Mesmo rótulo de porção (ex: "1 unidade", "100g")
    const aLabelMatch = basePortionLabel && a.portionLabel === basePortionLabel ? 1 : 0;
    const bLabelMatch = basePortionLabel && b.portionLabel === basePortionLabel ? 1 : 0;

    if (aTypeMatch !== bTypeMatch) return bTypeMatch - aTypeMatch;
    return bLabelMatch - aLabelMatch;
  });

  const endTime = performance.now();
  console.log(`[EditorV3 Engine] Geração inteligente finalizada:
    - Item base: ${baseItemName}
    - Sugestões geradas: ${result.length}
    - Tempo de execução: ${(endTime - startTime).toFixed(2)}ms`);

  return result;
};
