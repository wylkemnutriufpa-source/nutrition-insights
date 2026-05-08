import { FoodItem } from "../types";

export interface Marmita extends FoodItem {
  isMarmita: true;
  ingredients: string[];
}

export const MARMITAS_DATABASE: Marmita[] = [
  {
    id: 'marmita-1',
    name: 'Frango com Arroz e Legumes',
    servingSize: 300,
    servingUnit: 'unidade',
    proteinPer100g: 10,
    carbsPer100g: 12,
    fatsPer100g: 3,
    caloriesPer100g: 115,
    category: 'protein',
    isMarmita: true,
    ingredients: ['Frango', 'Arroz', 'Brócolis', 'Cenoura'],
    householdMeasures: [{ unit: 'unidade', weight: 300 }]
  },
  {
    id: 'marmita-2',
    name: 'Carne Moída com Purê de Batata',
    servingSize: 300,
    servingUnit: 'unidade',
    proteinPer100g: 9,
    carbsPer100g: 15,
    fatsPer100g: 5,
    caloriesPer100g: 141,
    category: 'protein',
    isMarmita: true,
    ingredients: ['Carne moída', 'Batata', 'Leite', 'Manteiga'],
    householdMeasures: [{ unit: 'unidade', weight: 300 }]
  },
  // Add more as needed...
];

export class MarmitasDatabase {
  static getAll(): Marmita[] {
    return MARMITAS_DATABASE;
  }
}
