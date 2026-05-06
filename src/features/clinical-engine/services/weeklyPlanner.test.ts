import { describe, test, expect } from "vitest";
import {
  generateWeeklyPlan,
  applyVariation,
  getCurrentDayPlan,
  type DayPlan,
  type SubstitutionGroup,
  type WeeklyInput,
} from "./weeklyPlanner";

function buildDailyTemplate(): DayPlan {
  return {
    date: new Date("2026-05-04"), // segunda
    day_of_week: "segunda",
    meals: [
      {
        type: "cafe",
        time: "07:00",
        items: [
          { nome: "Pão integral", gramas: 50, group: "carb_breakfast", kcal: 130 },
        ],
      },
      {
        type: "almoco",
        time: "12:00",
        items: [
          {
            nome: "Frango grelhado",
            gramas: 150,
            group: "protein_main",
            kcal: 240,
            protein_g: 45,
            carbs_g: 0,
            fat_g: 6,
          },
          { nome: "Arroz integral", gramas: 100, group: "carb_main", kcal: 130 },
        ],
      },
      {
        type: "jantar",
        time: "20:00",
        items: [
          {
            nome: "Frango grelhado",
            gramas: 150,
            group: "protein_main",
            kcal: 240,
            protein_g: 45,
            carbs_g: 0,
            fat_g: 6,
          },
        ],
      },
    ],
    daily_totals: { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 60 },
  };
}

const proteinGroup: SubstitutionGroup = {
  group: "protein_main",
  alternatives: [
    { nome: "Frango grelhado", equivalence_factor: 1 },
    { nome: "Tilápia", equivalence_factor: 1.1 },
    { nome: "Carne moída", equivalence_factor: 0.9 },
  ],
};

describe("Phase 3 — Weekly Planner", () => {
  test("Gerar 7 dias: gramagens idênticas (sem variação)", () => {
    const input: WeeklyInput = {
      daily_template: buildDailyTemplate(),
      start_date: new Date("2026-05-04"),
      options: { enable_variation: false },
    };
    const weekly = generateWeeklyPlan(input);
    expect(weekly.days).toHaveLength(7);

    const almocoSegunda = weekly.days[0].meals.find((m) => m.type === "almoco")!;
    for (let i = 1; i < 7; i++) {
      const a = weekly.days[i].meals.find((m) => m.type === "almoco")!;
      expect(a.items[0].gramas).toBe(almocoSegunda.items[0].gramas);
      expect(a.items[0].nome).toBe(almocoSegunda.items[0].nome);
    }
  });

  test("Datas reais e dia da semana atribuídos", () => {
    const weekly = generateWeeklyPlan({
      daily_template: buildDailyTemplate(),
      start_date: new Date("2026-05-04"),
      options: { enable_variation: false },
    });
    expect(weekly.days[0].day_of_week).toBe("segunda");
    expect(weekly.days[6].day_of_week).toBe("domingo");
    expect(weekly.end_date.getDate()).toBe(10);
  });

  test("Variação ativada: proteínas alternam respeitando regras", () => {
    const weekly = generateWeeklyPlan({
      daily_template: buildDailyTemplate(),
      start_date: new Date("2026-05-04"),
      options: {
        enable_variation: true,
        variation_rules: {
          max_repeat_protein: 4,
          max_consecutive_days: 1,
          allowed_substitutions: [proteinGroup],
        },
      },
    });

    const proteinas = weekly.days.map(
      (d) => d.meals.find((m) => m.type === "almoco")!.items[0].nome,
    );
    // Sem 2 dias consecutivos iguais
    for (let i = 1; i < proteinas.length; i++) {
      expect(proteinas[i]).not.toBe(proteinas[i - 1]);
    }
    // Pelo menos 2 proteínas distintas
    expect(new Set(proteinas).size).toBeGreaterThanOrEqual(2);
  });

  test("Fallback: dia sem plano retorna o mais próximo", () => {
    const weekly = generateWeeklyPlan({
      daily_template: buildDailyTemplate(),
      start_date: new Date("2026-05-04"),
      options: { enable_variation: false },
    });
    const plan = getCurrentDayPlan(weekly, new Date("2026-05-06")); // quarta
    expect(plan).not.toBeNull();
    expect(plan!.day_of_week).toBe("quarta");
  });

  test("getCurrentDayPlan nunca retorna vazio quando há dias", () => {
    const weekly = generateWeeklyPlan({
      daily_template: buildDailyTemplate(),
      start_date: new Date("2026-05-04"),
      options: { enable_variation: false },
    });
    const farFuture = getCurrentDayPlan(weekly, new Date("2030-01-01"));
    const farPast = getCurrentDayPlan(weekly, new Date("2000-01-01"));
    expect(farFuture).not.toBeNull();
    expect(farPast).not.toBeNull();
  });

  test("applyVariation isolado: rotaciona apenas refeições principais", () => {
    const weekly = generateWeeklyPlan({
      daily_template: buildDailyTemplate(),
      start_date: new Date("2026-05-04"),
      options: { enable_variation: false },
    });
    const cafeAntes = weekly.days.map(
      (d) => d.meals.find((m) => m.type === "cafe")!.items[0].nome,
    );
    applyVariation(weekly, {
      max_repeat_protein: 3,
      max_consecutive_days: 1,
      allowed_substitutions: [proteinGroup],
    });
    const cafeDepois = weekly.days.map(
      (d) => d.meals.find((m) => m.type === "cafe")!.items[0].nome,
    );
    expect(cafeDepois).toEqual(cafeAntes);
  });
});
