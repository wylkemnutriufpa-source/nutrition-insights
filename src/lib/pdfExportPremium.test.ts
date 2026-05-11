import { describe, it, expect } from "vitest";
import { buildPremiumMealPlanHTML, type PremiumMealPlanPDFData } from "./pdfExportPremium";

describe("PDF Export Premium - Macros Não Considerados", () => {
  it("deve incluir a seção 'Macros não considerados' com a soma das substituições", () => {
    const data: PremiumMealPlanPDFData = {
      planTitle: "Plano Teste",
      patientName: "João",
      nutritionistName: "Dr. Nutri",
      startDate: "2023-01-01",
      items: [
        {
          mealType: "lunch",
          title: "Prato Principal",
          calories_target: 500,
          protein_target: 40,
          carbs_target: 50,
          fat_target: 10,
          is_primary: true,
          substitution_group_id: "group-1",
        },
        {
          mealType: "lunch",
          title: "Sub 1",
          calories_target: 300,
          protein_target: 20,
          carbs_target: 30,
          fat_target: 5,
          is_primary: false,
          substitution_group_id: "group-1",
        },
        {
          mealType: "lunch",
          title: "Sub 2",
          calories_target: 200,
          protein_target: 10,
          carbs_target: 20,
          fat_target: 5,
          is_primary: false,
          substitution_group_id: "group-1",
        },
      ],
    };

    const html = buildPremiumMealPlanHTML(data);

    // Soma das subs: 300 + 200 = 500 kcal
    // Proteína: 20 + 10 = 30g
    // Carbos: 30 + 20 = 50g
    // Gorduras: 5 + 5 = 10g

    expect(html).toContain("Macros não considerados:");
    expect(html).toContain("500 kcal · P 30g · C 50g · G 10g");
    
    // O total considerado deve ser o do principal
    expect(html).toContain(">500</div>");
    expect(html).toContain("(Total Considerado)");
  });

  it("mantém ordem fixa por tipo sem esconder refeições primárias sem grupo", () => {
    const data: PremiumMealPlanPDFData = {
      planTitle: "Plano Marília",
      patientName: "Marília Costa",
      nutritionistName: "Dr. Nutri",
      startDate: "2026-05-11",
      items: [
        { id: "lanche-tarde", mealType: "Lanche da Tarde", title: "Iogurte com fruta", description: "170g", calories_target: 150, is_primary: true },
        { id: "ceia", mealType: "ceia", title: "Gelatina", description: "1 pote", calories_target: 50, is_primary: true },
        { id: "cafe-1", mealType: "breakfast", title: "Tapioca com ovo", description: "1 unidade", calories_target: 367, is_primary: true },
        { id: "almoco-1", mealType: "Almoço", title: "Frango grelhado", description: "150g", calories_target: 383, is_primary: true },
        { id: "jantar-1", mealType: "Dinner", title: "Sopa de legumes", description: "1 prato", calories_target: 133, is_primary: true },
        { id: "lanche-manha", mealType: "morning_snack", title: "Mamão", description: "1 fatia", calories_target: 100, is_primary: true },
      ],
    };

    const html = buildPremiumMealPlanHTML(data);
    const labels = ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];
    const positions = labels.map((label) => html.indexOf(label));

    expect(positions.every((pos) => pos >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("Tapioca com ovo");
    expect(html).toContain("Frango grelhado");
    expect(html).toContain("Sopa de legumes");
    expect(html).toContain("Gelatina");
  });

  it("não mistura grupos de substituição entre tipos diferentes e preserva porção equivalente", () => {
    const data: PremiumMealPlanPDFData = {
      planTitle: "Plano Débora",
      patientName: "Débora Encarnação",
      nutritionistName: "Dr. Nutri",
      startDate: "2026-05-11",
      items: [
        { mealType: "breakfast", title: "Cuscuz com ovo", description: "1 fatia + 1 ovo", calories_target: 300, is_primary: true, substitution_group_id: "same-group" },
        { mealType: "breakfast", title: "Pão com ovo", description: "Substituição", calories_target: 300, is_primary: false, substitution_group_id: "same-group" },
        { mealType: "lunch", title: "Filé de tilápia", description: "150g", calories_target: 283, is_primary: true, substitution_group_id: "same-group" },
        { mealType: "lunch", title: "Frango grelhado", description: "Substituição", calories_target: 283, is_primary: false, substitution_group_id: "same-group" },
      ],
    };

    const html = buildPremiumMealPlanHTML(data);
    const breakfastSection = html.slice(html.indexOf("Café da Manhã"), html.indexOf("Almoço"));
    const lunchSection = html.slice(html.indexOf("Almoço"));

    expect(breakfastSection).toContain("Pão com ovo");
    expect(breakfastSection).toContain("Porção equivalente: 1 fatia + 1 ovo");
    expect(breakfastSection).not.toContain("Frango grelhado");
    expect(lunchSection).toContain("Frango grelhado");
    expect(lunchSection).toContain("Porção equivalente: 150g");
  });
});
