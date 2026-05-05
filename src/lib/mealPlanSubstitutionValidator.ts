import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";

export type MealPlanItem = {
  id: string;
  title: string;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
  meal_type?: string | null;
  description?: string | null;
  metadata?: any;
  edit_metadata?: any;
};

const SUB_TOLERANCE = { 
  kcalPct: 0.12,    // 12% tolerance for calories
  proteinPct: 0.20, // 20% tolerance for protein
  carbsPct: 0.20,   // 20% tolerance for carbs
  fatPct: 0.25      // 25% tolerance for fat
};

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function parseFoodNutrition(text: string) {
  const n = normalize(text);
  
  // Try to find match in database
  // We look for the longest match to be more specific
  let bestMatch = null;
  let maxLen = 0;

  for (const food of FOOD_DATABASE) {
    const fn = normalize(food.name);
    if ((n.includes(fn) || fn.includes(n)) && fn.length > maxLen) {
      bestMatch = food;
      maxLen = fn.length;
    }
  }

  return bestMatch;
}

export interface SubstitutionError {
  mealId: string;
  mealTitle: string;
  substitutionIndex: number;
  foodName: string;
  macros: {
    kcal?: { value: number; target: number; diff: number; tolerance: number };
    protein?: { value: number; target: number; diff: number; tolerance: number };
    carbs?: { value: number; target: number; diff: number; tolerance: number };
    fat?: { value: number; target: number; diff: number; tolerance: number };
  };
  limitError?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  detailedErrors: SubstitutionError[];
}

export function validateMealSubstitutions(item: MealPlanItem, maxCount: number = 4, patientName?: string): ValidationResult {
  const meta = (item as any).edit_metadata || (item as any).metadata || {};
  const substitutions = meta.substitutions_json as string[];
  
  if (!substitutions || !Array.isArray(substitutions) || substitutions.length === 0) {
    return { valid: true, errors: [], detailedErrors: [] };
  }

  const errors: string[] = [];
  const detailedErrors: SubstitutionError[] = [];

  // 1. Validate Limit FIRST (Requirement 3)
  if (substitutions.length > maxCount) {
    const errorMsg = `A refeição "${item.title}" tem ${substitutions.length} substituições, mas o limite definido é ${maxCount}.`;
    errors.push(errorMsg);
    detailedErrors.push({
      mealId: item.id,
      mealTitle: item.title || "Sem título",
      substitutionIndex: -1,
      foodName: "Limite Excedido",
      macros: {},
      limitError: errorMsg
    });
    // We continue validation of macros even if limit is exceeded to show all errors
  }

  const mainKcal = Number(item.calories_target) || 0;
  const mainProtein = Number(item.protein_target) || 0;
  const mainCarbs = Number(item.carbs_target) || 0;
  const mainFat = Number(item.fat_target) || 0;

  // We only validate macros if main meal has macros defined
  if (mainKcal === 0) return { valid: errors.length === 0, errors, detailedErrors };

  substitutions.forEach((sub, idx) => {
    // 2. Improved Robust Parsing (Requirement 4)
    // Handle "•", "→", "-", "Item 1, Item 2"
    // Extract part after arrow or bullet if present, or take the whole thing
    const cleanedSub = sub.replace(/^[•\-\*→\s]+/, "").trim();
    const parts = cleanedSub.split(/[→]/);
    const subContent = parts[parts.length - 1] || cleanedSub;
    
    // Split by commas or " e " (and) to handle multiple items in one line
    const individualFoods = subContent.split(/[,]| e /i).map(f => f.trim().replace(/^[\s•\-\*]+/, ""));

    individualFoods.forEach(foodText => {
      if (!foodText) return;
      const foodMatch = parseFoodNutrition(foodText);
      
      if (foodMatch) {
        const kcalDiff = Math.abs(foodMatch.calories - mainKcal) / mainKcal;
        const protDiff = mainProtein > 2 ? Math.abs(foodMatch.protein - mainProtein) / mainProtein : 0;
        const carbDiff = mainCarbs > 2 ? Math.abs(foodMatch.carbs - mainCarbs) / mainCarbs : 0;
        const fatDiff = mainFat > 1 ? Math.abs(foodMatch.fat - mainFat) / mainFat : 0;

        const macroErrors: SubstitutionError["macros"] = {};
        const missingFields: string[] = [];

        // 3. Macro Validation with all fields (Requirement 1 & Requirement 4: Missing macros)
        if (foodMatch.calories === undefined || foodMatch.calories === null) missingFields.push("calorias");
        if (foodMatch.protein === undefined || foodMatch.protein === null) missingFields.push("proteínas");
        if (foodMatch.carbs === undefined || foodMatch.carbs === null) missingFields.push("carboidratos");
        if (foodMatch.fat === undefined || foodMatch.fat === null) missingFields.push("gorduras");

        if (missingFields.length > 0) {
          const msg = `Alimento "${foodMatch.name}" sem ${missingFields.join(", ")} no banco.`;
          errors.push(msg);
          detailedErrors.push({
            mealId: item.id,
            mealTitle: item.title || "Sem título",
            substitutionIndex: idx,
            foodName: foodMatch.name,
            macros: {},
            limitError: msg
          });
          return;
        }

        if (kcalDiff > SUB_TOLERANCE.kcalPct) {
          macroErrors.kcal = { value: foodMatch.calories, target: mainKcal, diff: kcalDiff, tolerance: SUB_TOLERANCE.kcalPct };
        }
        if (protDiff > SUB_TOLERANCE.proteinPct) {
          macroErrors.protein = { value: foodMatch.protein, target: mainProtein, diff: protDiff, tolerance: SUB_TOLERANCE.proteinPct };
        }
        if (carbDiff > SUB_TOLERANCE.carbsPct) {
          macroErrors.carbs = { value: foodMatch.carbs, target: mainCarbs, diff: carbDiff, tolerance: SUB_TOLERANCE.carbsPct };
        }
        if (fatDiff > SUB_TOLERANCE.fatPct) {
          macroErrors.fat = { value: foodMatch.fat, target: mainFat, diff: fatDiff, tolerance: SUB_TOLERANCE.fatPct };
        }

        if (Object.keys(macroErrors).length > 0) {
          const errorParts: string[] = [];
          if (macroErrors.kcal) errorParts.push(`${foodMatch.calories}kcal (±12%)`);
          if (macroErrors.protein) errorParts.push(`${foodMatch.protein}g P (±20%)`);
          if (macroErrors.carbs) errorParts.push(`${foodMatch.carbs}g C (±20%)`);
          if (macroErrors.fat) errorParts.push(`${foodMatch.fat}g G (±25%)`);

          const msg = `Substituição ${idx + 1}: "${foodMatch.name}" está fora da tolerância em: ${errorParts.join(", ")}.`;
          errors.push(msg);
          detailedErrors.push({
            mealId: item.id,
            mealTitle: item.title || "Sem título",
            substitutionIndex: idx,
            foodName: foodMatch.name,
            macros: macroErrors
          });
        }
      }
    });
    // 4. Mixing and Coherence validation (Requirement: Prevent mixing substitutions from different meals/templates)
    const mealType = (item.meal_type as string || "").toLowerCase();
    const mainDesc = normalize(item.description || "");
    
    individualFoods.forEach(foodText => {
      const ft = normalize(foodText);
      
      // Heuristic: check if food contains keywords of other meals that are incompatible
      const lunchKeywords = ["arroz", "feijao", "carne", "frango", "peixe", "salada", "legumes"];
      const breakfastKeywords = ["pao", "ovo", "cafe", "leite", "fruta", "iogurte", "aveia", "tapioca"];
      
      // Coherence Check: Prevent Soup + Protein combination (User Request)
      const isSoup = ft.includes("sopa") || ft.includes("caldo");
      const hasMainProtein = mainDesc.includes("peixe") || mainDesc.includes("frango") || mainDesc.includes("carne") || mainDesc.includes("bife");
      
      if (isSoup && hasMainProtein) {
        const msg = `Incoerência: "${foodText}" deve ser uma substituição da refeição completa, não um acompanhamento da proteína.`;
        errors.push(msg);
        detailedErrors.push({
          mealId: item.id,
          mealTitle: item.title || "Sem título",
          substitutionIndex: idx,
          foodName: foodText,
          macros: {},
          limitError: msg
        });
      }

      if (mealType.includes("breakfast") || mealType.includes("desjejum") || mealType.includes("cafe")) {
        if (lunchKeywords.some(k => ft.includes(k) && !ft.includes("ovo") && !ft.includes("fruta"))) {
           const msg = `Possível mistura: "${foodText}" parece ser uma opção de Almoço/Jantar em uma refeição de Café da Manhã.`;
           errors.push(msg);
           detailedErrors.push({
             mealId: item.id,
             mealTitle: item.title || "Sem título",
             substitutionIndex: idx,
             foodName: foodText,
             macros: {},
             limitError: msg
           });
        }
      }
      
      if (mealType.includes("lunch") || mealType.includes("dinner") || mealType.includes("almoco") || mealType.includes("jantar")) {
        if (breakfastKeywords.some(k => ft.includes(k) && !ft.includes("frango") && !ft.includes("carne"))) {
           const msg = `Possível mistura: "${foodText}" parece ser uma opção de Café da Manhã em uma refeição de Almoço/Jantar.`;
           errors.push(msg);
           detailedErrors.push({
             mealId: item.id,
             mealTitle: item.title || "Sem título",
             substitutionIndex: idx,
             foodName: foodText,
             macros: {},
             limitError: msg
           });
        }
      }
    });

    // 5. Wannubia Specific Rules
    if (patientName?.toLowerCase().includes("wannubia")) {
      // Regra de Ordem: Proteína (1º), Carboidrato (2º), Legume (3º), Fruta/Extra (4º)
      const proteinKeywords = ["frango", "carne", "ovo", "peixe", "tilapia", "bovina", "lombo", "suino"];
      const carbKeywords = ["arroz", "batata", "macarrao", "cuscuz", "pao", "tapioca", "macaxeira", "aipim", "mandioca"];
      const legumeKeywords = ["feijao", "lentilha", "grao de bico", "ervilha"];

      substitutions.forEach((sub, idx) => {
        const ft = normalize(sub);
        
        // Validação de proteínas mistas (já existente)
        const hasFrango = ft.includes("frango");
        const hasOvo = ft.includes("ovo");
        const hasCarne = ft.includes("carne") || ft.includes("bovina");

        if ((hasFrango && hasOvo) || (hasFrango && hasCarne) || (hasOvo && hasCarne)) {
           const msg = `Wannubia: "${sub}" mistura fontes de proteína. Use apenas uma por linha.`;
           errors.push(msg);
           // ... (detailed error logic remains similar)
        }

        // Validação de Ordem sugerida (Heurística)
        if (idx === 0 && !proteinKeywords.some(k => ft.includes(k))) {
          errors.push(`Wannubia: A primeira substituição deve ser uma Proteína (ex: Frango, Carne).`);
        }
        if (idx === 1 && !carbKeywords.some(k => ft.includes(k))) {
          errors.push(`Wannubia: A segunda substituição deve ser um Carboidrato (ex: Arroz, Batata).`);
        }
        if (idx === 2 && !legumeKeywords.some(k => ft.includes(k)) && substitutions.length > 2) {
          errors.push(`Wannubia: A terceira substituição deve ser um Legume (ex: Feijão, Lentilha).`);
        }
      });
    }
    
    // 6. Fixed Meal Validation (Marmita Fixa)
    if (meta.is_fixed) {
      if (substitutions.length < 3 || substitutions.length > 4) {
        const msg = `Marmita Fixa "${item.title}" deve ter entre 3 e 4 substituições (atual: ${substitutions.length}).`;
        errors.push(msg);
        detailedErrors.push({
          mealId: item.id,
          mealTitle: item.title || "Sem título",
          substitutionIndex: -1,
          foodName: "Erro de Quantidade",
          macros: {},
          limitError: msg
        });
      }
      
      const genericTerms = ["marmita do dia", "marmita dia", "ver no app", "conferir", "opcoes do dia"];
      const foundGeneric = substitutions.find(sub => genericTerms.some(term => normalize(sub).includes(term)));
      
      if (foundGeneric) {
        const msg = `Marmita Fixa "${item.title}" contém termos genéricos proibidos ("${foundGeneric}"). Especifique o prato real conforme receitas do sistema.`;
        errors.push(msg);
        detailedErrors.push({
          mealId: item.id,
          mealTitle: item.title || "Sem título",
          substitutionIndex: -1,
          foodName: "Termo Genérico",
          macros: {},
          limitError: msg
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    detailedErrors
  };
}

export function validatePlanSubstitutions(items: MealPlanItem[], maxCount: number = 4, patientName?: string): ValidationResult {
  const allErrors: string[] = [];
  const allDetailedErrors: SubstitutionError[] = [];
  
  items.forEach(item => {
    const result = validateMealSubstitutions(item, maxCount, patientName);
    if (!result.valid) {
      result.errors.forEach(err => allErrors.push(`[${item.title}] ${err}`));
      allDetailedErrors.push(...result.detailedErrors);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    detailedErrors: allDetailedErrors
  };
}
