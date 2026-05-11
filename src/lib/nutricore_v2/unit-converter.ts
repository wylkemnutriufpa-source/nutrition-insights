/**
 * 🛠️ NutriCore V3 - Unit Converter
 * Handles conversion between grams and household measures (fatias, unidades, colheres).
 */

export interface NormalizedPortion {
  quantity: number;
  measurementType: 'unit' | 'gram' | 'spoon' | 'ml';
  portionValue: number;
  portionLabel: string;
}

export function convertGramsToHousehold(name: string, grams: number): NormalizedPortion {
  const lowerName = name.toLowerCase();
  
  // Default (Grams)
  let result: NormalizedPortion = {
    quantity: Math.round(grams),
    measurementType: 'gram',
    portionValue: 100,
    portionLabel: 'g'
  };

  // EGGS & OMELETS - Always in units (1 unit = 50g)
  if (lowerName.includes('ovo') || lowerName.includes('omelete')) {
    result = {
      measurementType: 'unit',
      portionValue: 50, // Média (M) = 50g
      quantity: Math.max(1, Math.round(grams / 50)),
      portionLabel: 'unidade(s)'
    };
  } else if (lowerName.includes('pão integral') || lowerName.includes('pão de forma')) {
    result = {
      measurementType: 'unit',
      portionValue: 25,
      quantity: Math.max(1, Math.round(grams / 25)),
      portionLabel: 'fatia(s)'
    };
  } else if (lowerName.includes('pão francês')) {
    result = {
      measurementType: 'unit',
      portionValue: 50,
      quantity: Math.max(1, Math.round(grams / 50)),
      portionLabel: 'unidade(s)'
    };
  } else if (lowerName.includes('banana')) {
    result = {
      measurementType: 'unit',
      portionValue: 90,
      quantity: Math.max(1, Math.round(grams / 90)),
      portionLabel: 'unidade(s) M'
    };
  } else if (lowerName.includes('arroz') || lowerName.includes('feijão')) {
    result = {
      measurementType: 'spoon',
      portionValue: 25,
      quantity: Math.max(1, Math.round(grams / 25)),
      portionLabel: 'colher(es) de sopa'
    };
  }

  return result;
}
