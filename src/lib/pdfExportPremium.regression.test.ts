import { describe, it, expect } from "vitest";
import { buildPremiumMealPlanHTML, type PremiumMealPlanPDFData } from "./pdfExportPremium";

/**
 * Regressão crítica do PDF Premium:
 * 1. Ordem fixa imutável das refeições (Café → Lanche Manhã → Almoço → Lanche Tarde → Jantar → Ceia)
 * 2. Auditoria de gramas: nenhuma substituição pode renderizar "100g" fixo como porção
 *    — o motor deve sempre exibir a porção equivalente real do item principal.
 *
 * Estes testes existem para que qualquer regressão futura quebre o build.
 */

const FIXED_ORDER_LABELS = [
  "Café da Manhã",
  "Lanche da Manhã",
  "Almoço",
  "Lanche da Tarde",
  "Jantar",
  "Ceia",
];

function buildPatientFixture(name: string): PremiumMealPlanPDFData {
  // Cada paciente tem 6 refeições com substituições marcadas como "100g" genérico —
  // o PDF DEVE substituir por "Porção equivalente: <descrição real do principal>".
  const items = [
    { mealType: "breakfast", title: "Tapioca com ovo", description: "1 unidade média (80g)", calories_target: 320, is_primary: true, substitution_group_id: `${name}-cafe` },
    { mealType: "breakfast", title: "Pão integral com queijo", description: "100g", calories_target: 320, is_primary: false, substitution_group_id: `${name}-cafe` },
    { mealType: "morning_snack", title: "Mamão", description: "1 fatia média (150g)", calories_target: 90, is_primary: true, substitution_group_id: `${name}-lm` },
    { mealType: "morning_snack", title: "Banana", description: "100g", calories_target: 90, is_primary: false, substitution_group_id: `${name}-lm` },
    { mealType: "lunch", title: "Frango grelhado + arroz", description: "120g frango + 4 col. arroz", calories_target: 520, is_primary: true, substitution_group_id: `${name}-almoco` },
    { mealType: "lunch", title: "Tilápia + batata-doce", description: "100g", calories_target: 520, is_primary: false, substitution_group_id: `${name}-almoco` },
    { mealType: "afternoon_snack", title: "Iogurte com aveia", description: "170g iogurte + 2 col. aveia", calories_target: 180, is_primary: true, substitution_group_id: `${name}-lt` },
    { mealType: "afternoon_snack", title: "Mix de castanhas", description: "100g", calories_target: 180, is_primary: false, substitution_group_id: `${name}-lt` },
    { mealType: "dinner", title: "Sopa de legumes com frango", description: "1 prato fundo (350g)", calories_target: 380, is_primary: true, substitution_group_id: `${name}-jantar` },
    { mealType: "dinner", title: "Omelete com salada", description: "100g", calories_target: 380, is_primary: false, substitution_group_id: `${name}-jantar` },
    { mealType: "evening_snack", title: "Chá com biscoito integral", description: "200ml chá + 3 unidades", calories_target: 110, is_primary: true, substitution_group_id: `${name}-ceia` },
    { mealType: "evening_snack", title: "Iogurte natural", description: "100g", calories_target: 110, is_primary: false, substitution_group_id: `${name}-ceia` },
  ];
  return {
    planTitle: `Plano ${name}`,
    patientName: name,
    nutritionistName: "Dra. Teste",
    startDate: "2026-05-11",
    items,
  };
}

describe("PDF Export Premium — Regressão de Ordem Fixa", () => {
  it.each(["Marília Costa", "Lynn Ohana", "Ana Carla", "Débora Encarnação"])(
    "renderiza as 6 refeições na ordem canônica para %s",
    (patient) => {
      const html = buildPremiumMealPlanHTML(buildPatientFixture(patient));
      const positions = FIXED_ORDER_LABELS.map((label) => html.indexOf(label));
      expect(positions.every((p) => p >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  );
});

describe("PDF Export Premium — Auditoria de Gramas (anti-100g fixo)", () => {
  it.each(["Marília Costa", "Lynn Ohana", "Ana Carla", "Débora Encarnação", "Paciente E"])(
    "nenhuma substituição renderiza '100g' como porção fixa para %s",
    (patient) => {
      const html = buildPremiumMealPlanHTML(buildPatientFixture(patient));

      // Extrai apenas o conteúdo dentro das caixas de substituição
      const subBoxRegex = /<div class="substitution-box">([\s\S]*?)<\/div>\s*<\/div>/g;
      const subSections: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = subBoxRegex.exec(html)) !== null) {
        subSections.push(match[1]);
      }

      expect(subSections.length).toBeGreaterThan(0);

      for (const section of subSections) {
        // Não pode aparecer "— 100g" (descrição genérica vazada para o paciente)
        expect(section).not.toMatch(/—\s*100\s*g(\b|<)/i);
        // Toda substituição deve trazer "Porção equivalente: ..." quando descrição era genérica
        expect(section).toContain("Porção equivalente:");
      }
    }
  );

  it("garante que substituições com descrição real (ex: '50g pão integral') são preservadas", () => {
    const data: PremiumMealPlanPDFData = {
      planTitle: "Plano Real",
      patientName: "Paciente Real",
      nutritionistName: "Dra. Teste",
      startDate: "2026-05-11",
      items: [
        { mealType: "breakfast", title: "Pão integral", description: "2 fatias (50g)", calories_target: 200, is_primary: true, substitution_group_id: "g1" },
        { mealType: "breakfast", title: "Tapioca", description: "1 unidade pequena (40g)", calories_target: 200, is_primary: false, substitution_group_id: "g1" },
      ],
    };
    const html = buildPremiumMealPlanHTML(data);
    expect(html).toContain("1 unidade pequena (40g)");
    expect(html).not.toContain("Porção equivalente: 2 fatias (50g)"); // não deve forçar fallback
  });
});
