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
});
