import { describe, it, expect } from "vitest";

// Pure function tests extracted from ShoppingList logic

function guessCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/frango|carne|peixe|ovo|atum|salmão|tilápia|peito|patinho|alcatra|sardinha|camarão|whey|proteín/i.test(lower)) return "protein";
  if (/arroz|pão|macarrão|batata|aveia|tapioca|mandioca|inhame|granola|cereal|torrada|cuscuz/i.test(lower)) return "carbs";
  if (/alface|tomate|brócolis|espinafre|rúcula|cenoura|pepino|abobrinha|couve|chuchu|berinjela|beterraba|vagem/i.test(lower)) return "vegetables";
  if (/banana|maçã|morango|laranja|melão|mamão|abacate|uva|kiwi|manga|melancia|pera|limão/i.test(lower)) return "fruits";
  if (/leite|queijo|iogurte|cream cheese|requeijão|ricota|cottage|manteiga/i.test(lower)) return "dairy";
  if (/azeite|óleo|castanha|nozes|amendoim|amêndoa|linhaça|chia|coco|pasta de amendoim/i.test(lower)) return "oils";
  if (/sal|pimenta|orégano|alho|cebola|cheiro-verde|manjericão|canela|açúcar|adoçante|vinagre|mostarda|molho/i.test(lower)) return "seasoning";
  return "other";
}

function cleanFoodName(name: string): string {
  return name
    .replace(/^\d+[\s]*[gG][\s]+/g, '')
    .replace(/^\d+[\s]*(ml|g|kg|un|unidade|colher|xícara|fatia|porção|pedaço)\b[\s]*(de[\s]+)?/gi, '')
    .replace(/^\d+[\s]*[-–]\s*/g, '')
    .trim();
}

describe("Shopping List - guessCategory", () => {
  it("classifies proteins correctly", () => {
    expect(guessCategory("Peito de frango")).toBe("protein");
    expect(guessCategory("Ovo cozido")).toBe("protein");
    expect(guessCategory("Salmão grelhado")).toBe("protein");
    expect(guessCategory("Whey protein")).toBe("protein");
  });

  it("classifies carbs correctly", () => {
    expect(guessCategory("Arroz integral")).toBe("carbs");
    expect(guessCategory("Batata doce")).toBe("carbs");
    expect(guessCategory("Aveia em flocos")).toBe("carbs");
  });

  it("classifies vegetables correctly", () => {
    expect(guessCategory("Brócolis")).toBe("vegetables");
    expect(guessCategory("Tomate cereja")).toBe("vegetables");
    expect(guessCategory("Espinafre")).toBe("vegetables");
  });

  it("classifies fruits correctly", () => {
    expect(guessCategory("Banana")).toBe("fruits");
    expect(guessCategory("Morango")).toBe("fruits");
    expect(guessCategory("Abacate")).toBe("fruits");
  });

  it("classifies dairy correctly", () => {
    expect(guessCategory("Iogurte natural")).toBe("dairy");
    expect(guessCategory("Queijo cottage")).toBe("dairy");
  });

  it("returns 'other' for unknown items", () => {
    expect(guessCategory("Suplemento XYZ")).toBe("other");
  });
});

describe("Shopping List - cleanFoodName", () => {
  it("removes quantity prefixes", () => {
    expect(cleanFoodName("100g de frango")).toBe("de frango");
    expect(cleanFoodName("2 unidade de banana")).toBe("banana");
    expect(cleanFoodName("1 colher de azeite")).toBe("azeite");
  });

  it("keeps clean names intact", () => {
    expect(cleanFoodName("Frango grelhado")).toBe("Frango grelhado");
    expect(cleanFoodName("Arroz integral")).toBe("Arroz integral");
  });

  it("removes numbered dashes", () => {
    expect(cleanFoodName("2 - Frango")).toBe("Frango");
  });
});
