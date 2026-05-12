import { describe, test, expect } from "vitest";
import { 
  getSubstitutionsWithGrams, 
  type FoodItem, 
  type SubstitutionRequest 
} from "./v3Motor";

const frango: FoodItem = {
  id: "frango_1",
  name: "Peito de frango grelhado",
  kcal: 165, // per 100g
  protein: 31,
  carbs: 0,
  fat: 3.6,
  measurementType: "gram",
  category: "proteína"
};

const tilapia: FoodItem = {
  id: "tilapia_1",
  name: "Filé de tilápia",
  kcal: 96, // per 100g
  protein: 20,
  carbs: 0,
  fat: 1.7,
  measurementType: "gram",
  category: "proteína",
  imageUrl: "/images/tilapia.jpg"
};

const ovo: FoodItem = {
  id: "ovo_1",
  name: "Ovo cozido",
  kcal: 155, // per 100g
  protein: 13,
  carbs: 1.1,
  fat: 11,
  measurementType: "unit",
  portionValue: 50, // 1 unit = 50g
  category: "proteína",
  imageUrl: "/images/ovo.jpg"
};

const patinho: FoodItem = {
  id: "patinho_1",
  name: "Carne moída patinho",
  kcal: 219, // per 100g
  protein: 35.9,
  carbs: 0,
  fat: 7.3,
  measurementType: "gram",
  category: "proteína",
  // No imageUrl here, will check image bank
};

const arroz: FoodItem = {
  id: "arroz_1",
  name: "Arroz branco",
  kcal: 130,
  protein: 2.7,
  carbs: 28,
  fat: 0.3,
  measurementType: "gram",
  category: "carboidrato",
  imageUrl: "/images/arroz.jpg"
};

const imageBank = [
  { food_id: "patinho_1", image_url: "/images/patinho.jpg" },
  { food_id: "frango_1", image_url: "/images/frango.jpg" }
];

describe("Phase 4 — High Precision Substitutions", () => {
  test("Frango 150g → substitutos com mesma caloria (~247 kcal)", () => {
    const request: SubstitutionRequest = {
      base_item: frango,
      base_grams: 150,
      available_foods: [tilapia, patinho, ovo, arroz],
      image_bank: imageBank
    };

    const targetKcal = (frango.kcal / 100) * 150; // 247.5
    const subs = getSubstitutionsWithGrams(request);

    expect(subs.length).toBe(3); // tilápia, patinho, ovo (arroz is different category)
    
    subs.forEach(sub => {
      // Check caloric equivalence (within tolerance due to rounding)
      const diff = Math.abs(sub.calorias_equivalentes - targetKcal);
      expect(diff).toBeLessThan(10);
      expect(sub.imagem_url).toBeTruthy();
    });

    const subPatinho = subs.find(s => s.alimento === "Carne moída patinho")!;
    // 247.5 / (219/100) = 113g
    expect(subPatinho.gramas).toBeCloseTo(113, -1);
  });

  test("Pão integral 50g → substitutos com mesma caloria", () => {
    const pao: FoodItem = {
      id: "pao_1",
      name: "Pão integral",
      kcal: 250,
      protein: 10,
      carbs: 50,
      fat: 2,
      measurementType: "gram",
      category: "carboidrato"
    };

    const tapioca: FoodItem = {
      id: "tapioca_1",
      name: "Tapioca",
      kcal: 350,
      protein: 0,
      carbs: 87,
      fat: 0,
      measurementType: "gram",
      category: "carboidrato",
      imageUrl: "img_tapioca"
    };

    const request: SubstitutionRequest = {
      base_item: pao,
      base_grams: 50, // 125 kcal
      available_foods: [tapioca],
      image_bank: []
    };

    const subs = getSubstitutionsWithGrams(request);
    expect(subs[0].alimento).toBe("Tapioca");
    // 125 / (350/100) = 35.7 -> 36g
    expect(subs[0].gramas).toBe(36);
  });

  test("Substituto SEM imagem → NÃO aparece na lista", () => {
    const semImagem: FoodItem = {
      id: "no_img",
      name: "Alimento Fantasma",
      kcal: 100,
      protein: 10,
      carbs: 10,
      fat: 10,
      measurementType: "gram",
      category: "proteína"
    };

    const request: SubstitutionRequest = {
      base_item: frango,
      base_grams: 100,
      available_foods: [semImagem, tilapia],
      image_bank: [] // tilapia has internal imageUrl, semImagem doesn't
    };

    const subs = getSubstitutionsWithGrams(request);
    expect(subs.map(s => s.alimento)).not.toContain("Alimento Fantasma");
    expect(subs.map(s => s.alimento)).toContain("Filé de tilápia");
  });

  test("Gramagem do substituto é exata, não genérica", () => {
    const request: SubstitutionRequest = {
      base_item: frango,
      base_grams: 150,
      available_foods: [tilapia, ovo],
      image_bank: []
    };

    const subs = getSubstitutionsWithGrams(request);
    subs.forEach(sub => {
      expect(sub.gramas).toBeGreaterThan(0);
      expect(sub.unidade).not.toContain('cuscuz-tapioca-pão');
      // Should contain units if applicable
      if (sub.alimento === "Ovo cozido") {
        expect(sub.unidade).toContain("unidades");
      }
    });
  });
});
