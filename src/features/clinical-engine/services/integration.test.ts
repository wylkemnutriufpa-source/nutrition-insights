import { describe, test, expect, vi } from "vitest";

// Mock imageResolver BEFORE any other imports
vi.mock("./imageResolver", () => ({
  getFoodImage: vi.fn((name) => Promise.resolve({
    url: name === 'Frango' ? '/img/frango.jpg' : '/placeholder.svg',
    source: 'exact'
  })),
  filterFoodsWithImages: vi.fn((foods) => Promise.resolve(foods)),
  validateMealImage: vi.fn(() => true)
}));

import { 
  createPlanWithV3, 
  getPlanMotor, 
  migratePlanV2toV3,
  PatientMetrics 
} from "./integration";
import { FoodItem } from "./v3Motor";
import { MealSlot } from "./distribution";


const mockFoods: FoodItem[] = [
  {
    id: "f1",
    name: "Frango",
    kcal: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    measurementType: "gram",
    category: "proteína",
    imageUrl: "/img/frango.jpg"
  },
  {
    id: "f2",
    name: "Arroz",
    kcal: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    measurementType: "gram",
    category: "carboidrato"
  }
];

const mockPatient: PatientMetrics = {
  id: "p123",
  name: "João Silva",
  age: 30,
  gender: "masculino",
  weight: 80,
  height: 180,
  goal: "hypertrophy",
  activityLevel: "moderate",
  targetCalories: 2500,
  proteinTarget: 160,
  carbsTarget: 300,
  fatTarget: 70
};

const mockSlots: MealSlot[] = [
  { type: "cafe_da_manha", time: "08:00" },
  { type: "almoco", time: "12:00" },
  { type: "jantar", time: "19:00" }
];

describe("Phase 7 — V3 Integration Module", () => {
  test("V3 gera plano onboarding completo", async () => {
    const plan = await createPlanWithV3(mockPatient, mockSlots, 'onboarding', mockFoods);
    
    expect(plan.engine_version).toBe('v3');
    expect(plan.patient_id).toBe("p123");
    expect(plan.meals.length).toBe(3);
    expect(plan.meals[1].type).toBe("almoco");
    expect(plan.meals[1].items.length).toBeGreaterThan(0);
    expect(plan.meals[1].items[0].substitutions).toBeDefined();
    expect(plan.meals[1].items[0].imageUrl).toBeTruthy();
  });

  test("V3 gera plano semanal (7 dias)", async () => {
    const plan = await createPlanWithV3(mockPatient, mockSlots, 'semanal', mockFoods);
    
    expect(plan.weekly_plan).toBeDefined();
    expect(plan.weekly_plan.days.length).toBe(7);
  });

  test("getPlanMotor detecta corretamente", () => {
    const v3Plan = { engine_version: 'v3', id: '1' };
    const v2Plan = { id: '2', title: 'Plano Legado' };
    
    expect(getPlanMotor(v3Plan)).toBe('v3');
    expect(getPlanMotor(v2Plan)).toBe('v2');
  });

  test("Migração V2→V3 preserva gramagens", async () => {
    const v2Plan = {
      id: "v2_1",
      patient_id: "p123",
      meals: [
        {
          nome: "Almoço",
          items: [
            { nome: "Frango", gramas: 150 },
            { nome: "Arroz", gramas: 200 }
          ]
        }
      ],
      total_calorias: 2000
    };

    const migrated = await migratePlanV2toV3(v2Plan, mockFoods);
    
    expect(migrated.engine_version).toBe('v3');
    expect(migrated.meals[0].items[0].name).toBe("Frango");
    expect(migrated.meals[0].items[0].quantity).toBe(150);
    expect(migrated.meals[0].items[1].quantity).toBe(200);
    
    // Check if V3 features were added during migration
    expect(migrated.meals[0].items[0].substitutions).toBeDefined();
    expect(migrated.meals[0].items[0].imageUrl).toBeTruthy();
  });
});
