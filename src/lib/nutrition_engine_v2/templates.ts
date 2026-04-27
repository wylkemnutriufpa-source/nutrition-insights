/**
 * Motor Determinístico V2 — Templates de refeição
 *
 * Cópia EXATA de MOTOR_DETERMINISTICO.md seção 4 (MEAL_TEMPLATES).
 * Os nomes são resolvidos contra food_database existente via ILIKE/fallback
 * no momento da geração. Nada novo é inserido no banco.
 */

import type { Goal, MealType } from "./constants";

export interface TemplateItem {
  /** Nome canônico do alimento (será resolvido por similaridade). */
  food_name: string;
  /** Nomes alternativos aceitos no banco existente. */
  aliases?: string[];
  /** Gramatura base usada para o cálculo de escala. */
  base_grams: number;
}

export type MealTemplates = Record<MealType, Record<Goal, TemplateItem[]>>;

export const MEAL_TEMPLATES: MealTemplates = {
  breakfast: {
    lose: [
      { food_name: "Ovo inteiro cozido", aliases: ["Ovo cozido", "Ovo de galinha cozido"], base_grams: 50 },
      { food_name: "Pão integral", base_grams: 40 },
      { food_name: "Mamão papaia", aliases: ["Mamão"], base_grams: 120 },
      { food_name: "Café coado sem açúcar", aliases: ["Café coado"], base_grams: 150 },
    ],
    maintain: [
      { food_name: "Ovo inteiro cozido", aliases: ["Ovo cozido"], base_grams: 100 },
      { food_name: "Pão integral", base_grams: 60 },
      { food_name: "Mamão papaia", aliases: ["Mamão"], base_grams: 150 },
      { food_name: "Café coado sem açúcar", aliases: ["Café coado"], base_grams: 150 },
    ],
    gain: [
      { food_name: "Ovo inteiro cozido", aliases: ["Ovo cozido"], base_grams: 100 },
      { food_name: "Pão integral", base_grams: 80 },
      { food_name: "Banana prata", aliases: ["Banana nanica", "Banana"], base_grams: 100 },
      { food_name: "Aveia em flocos", aliases: ["Aveia em flocos crua", "Aveia"], base_grams: 40 },
      { food_name: "Pasta de amendoim", aliases: ["Pasta de amendoim integral"], base_grams: 15 },
    ],
  },
  morning_snack: {
    lose: [
      { food_name: "Iogurte natural integral", aliases: ["Iogurte natural", "Iogurte integral"], base_grams: 150 },
      { food_name: "Maçã", aliases: ["Maçã fuji"], base_grams: 100 },
    ],
    maintain: [
      { food_name: "Iogurte grego natural", aliases: ["Iogurte grego"], base_grams: 150 },
      { food_name: "Banana prata", aliases: ["Banana nanica", "Banana"], base_grams: 100 },
      { food_name: "Aveia em flocos", aliases: ["Aveia em flocos crua", "Aveia"], base_grams: 20 },
    ],
    gain: [
      { food_name: "Iogurte grego natural", aliases: ["Iogurte grego"], base_grams: 200 },
      { food_name: "Banana prata", aliases: ["Banana nanica", "Banana"], base_grams: 120 },
      { food_name: "Granola", base_grams: 40 },
      { food_name: "Pasta de amendoim", aliases: ["Pasta de amendoim integral"], base_grams: 15 },
    ],
  },
  lunch: {
    lose: [
      { food_name: "Arroz integral cozido", base_grams: 80 },
      { food_name: "Feijão carioca cozido", base_grams: 80 },
      { food_name: "Peito de frango grelhado", aliases: ["Peito de frango desossado grelhado", "Frango peito grelhado"], base_grams: 120 },
      { food_name: "Alface crespa", aliases: ["Alface"], base_grams: 40 },
      { food_name: "Tomate", base_grams: 50 },
      { food_name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva", "Azeite"], base_grams: 5 },
    ],
    maintain: [
      { food_name: "Arroz integral cozido", base_grams: 120 },
      { food_name: "Feijão carioca cozido", base_grams: 100 },
      { food_name: "Peito de frango grelhado", aliases: ["Peito de frango desossado grelhado", "Frango peito grelhado"], base_grams: 150 },
      { food_name: "Brócolis cozido", base_grams: 80 },
      { food_name: "Cenoura cozida", base_grams: 50 },
      { food_name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], base_grams: 8 },
    ],
    gain: [
      { food_name: "Arroz branco cozido", base_grams: 180 },
      { food_name: "Feijão carioca cozido", base_grams: 120 },
      { food_name: "Patinho grelhado", aliases: ["Patinho", "Carne moída magra grelhada"], base_grams: 180 },
      { food_name: "Batata doce cozida", base_grams: 100 },
      { food_name: "Brócolis cozido", base_grams: 80 },
      { food_name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], base_grams: 10 },
    ],
  },
  afternoon_snack: {
    lose: [
      { food_name: "Maçã", aliases: ["Maçã fuji"], base_grams: 100 },
      { food_name: "Amêndoas", base_grams: 15 },
    ],
    maintain: [
      { food_name: "Banana prata", aliases: ["Banana nanica", "Banana"], base_grams: 100 },
      { food_name: "Pasta de amendoim", aliases: ["Pasta de amendoim integral"], base_grams: 15 },
      { food_name: "Whey protein (scoop 30g)", aliases: ["Whey protein (dose)", "Whey protein (concentrado)", "Whey"], base_grams: 30 },
    ],
    gain: [
      { food_name: "Pão integral", base_grams: 60 },
      { food_name: "Pasta de amendoim", aliases: ["Pasta de amendoim integral"], base_grams: 25 },
      { food_name: "Banana prata", aliases: ["Banana nanica", "Banana"], base_grams: 100 },
      { food_name: "Whey protein (scoop 30g)", aliases: ["Whey protein (dose)", "Whey protein (concentrado)", "Whey"], base_grams: 30 },
    ],
  },
  dinner: {
    lose: [
      { food_name: "Tilápia grelhada", base_grams: 150 },
      { food_name: "Batata doce cozida", base_grams: 100 },
      { food_name: "Brócolis cozido", base_grams: 100 },
      { food_name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], base_grams: 5 },
    ],
    maintain: [
      { food_name: "Tilápia grelhada", base_grams: 180 },
      { food_name: "Batata doce cozida", base_grams: 150 },
      { food_name: "Abobrinha cozida", aliases: ["Abobrinha"], base_grams: 100 },
      { food_name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], base_grams: 8 },
    ],
    gain: [
      { food_name: "Salmão grelhado", base_grams: 180 },
      { food_name: "Arroz integral cozido", base_grams: 150 },
      { food_name: "Brócolis cozido", base_grams: 100 },
      { food_name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], base_grams: 10 },
    ],
  },
  evening_snack: {
    lose: [
      { food_name: "Iogurte natural integral", aliases: ["Iogurte natural"], base_grams: 100 },
    ],
    maintain: [
      { food_name: "Iogurte grego natural", aliases: ["Iogurte grego"], base_grams: 120 },
      { food_name: "Chia", aliases: ["Chia (sementes)"], base_grams: 8 },
    ],
    gain: [
      { food_name: "Iogurte grego natural", aliases: ["Iogurte grego"], base_grams: 150 },
      { food_name: "Castanha do Pará", base_grams: 15 },
    ],
  },
};
