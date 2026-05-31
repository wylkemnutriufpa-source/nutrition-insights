# 🔬 Motor Clínico Determinístico — FitJourney 2.0

## 🎯 Objetivo

Garantir que o motor clínico seja 100% determinístico: mesma entrada = mesma saída SEMPRE.

---

## 🔴 PROBLEMA DO 1.0

O motor clínico do 1.0 tinha fallbacks silenciosos:

```typescript
// ❌ ERRADO (1.0)
function calculateMacros(foodName: string) {
  const food = findFood(foodName);
  
  if (!food) {
    // Fallback silencioso!
    return getDefaultMacros();
  }
  
  if (!food.protein_g) {
    // Fallback silencioso!
    return estimateMacros(food.kcal_100g);
  }
  
  return food;
}
```

**Problemas:**
- Mesma entrada pode dar saídas diferentes
- Erros silenciosos
- Impossível debugar
- Resultados inconsistentes

---

## ✅ SOLUÇÃO 2.0 — DETERMINISMO TOTAL

### Princípio 1: Sem Fallbacks Silenciosos

```typescript
// ✅ CORRETO (2.0)
function calculateMacros(foodId: UUID): MacroResult {
  const food = foodRepository.findById(foodId);
  
  // Erro explícito, nunca fallback
  if (!food) {
    throw new FoodNotFoundError(`Food ${foodId} not found`);
  }
  
  // Validação rigorosa
  if (!food.protein_g || !food.carbs_g || !food.fat_g) {
    throw new InvalidFoodDataError(
      `Food ${foodId} has incomplete macro data`
    );
  }
  
  // Cálculo determinístico
  return {
    kcal: calculateKcal(food),
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    fiber_g: food.fiber_g || 0,
  };
}
```

### Princípio 2: Validação Rigorosa

```typescript
// Validar TUDO na entrada
interface FoodValidation {
  id: UUID;
  name: string;
  kcal_100g: number; // > 0
  protein_g: number; // >= 0
  carbs_g: number;   // >= 0
  fat_g: number;     // >= 0
  fiber_g: number;   // >= 0
}

function validateFood(food: unknown): FoodValidation {
  // Validação rigorosa
  if (!isValidUUID(food.id)) {
    throw new ValidationError('Invalid food ID');
  }
  
  if (typeof food.name !== 'string' || food.name.length === 0) {
    throw new ValidationError('Invalid food name');
  }
  
  if (typeof food.kcal_100g !== 'number' || food.kcal_100g <= 0) {
    throw new ValidationError('Invalid kcal_100g');
  }
  
  // ... validar todos os campos
  
  return food as FoodValidation;
}
```

### Princípio 3: Cálculos Determinísticos

```typescript
// Cálculos sempre iguais para mesma entrada
function calculateMealMacros(
  items: MealItem[],
  date: Date
): MealMacros {
  // Determinismo: sempre mesma ordem
  const sortedItems = items.sort((a, b) => a.id.localeCompare(b.id));
  
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  
  for (const item of sortedItems) {
    const food = validateFood(foodRepository.findById(item.foodId));
    const quantity = validateQuantity(item.quantity);
    
    // Cálculo determinístico
    const macros = {
      kcal: (food.kcal_100g * quantity) / 100,
      protein_g: (food.protein_g * quantity) / 100,
      carbs_g: (food.carbs_g * quantity) / 100,
      fat_g: (food.fat_g * quantity) / 100,
    };
    
    totalKcal += macros.kcal;
    totalProtein += macros.protein_g;
    totalCarbs += macros.carbs_g;
    totalFat += macros.fat_g;
  }
  
  return {
    kcal: Math.round(totalKcal * 100) / 100,
    protein_g: Math.round(totalProtein * 100) / 100,
    carbs_g: Math.round(totalCarbs * 100) / 100,
    fat_g: Math.round(totalFat * 100) / 100,
  };
}
```

### Princípio 4: Auditoria de Cálculos

```typescript
// Registrar TODOS os cálculos
interface CalculationAudit {
  id: UUID;
  mealId: UUID;
  timestamp: Date;
  input: {
    items: MealItem[];
    date: Date;
  };
  output: MealMacros;
  hash: string; // Para verificar determinismo
}

function auditCalculation(
  mealId: UUID,
  input: any,
  output: MealMacros
): void {
  const hash = calculateHash(input);
  
  auditRepository.create({
    id: generateUUID(),
    mealId,
    timestamp: new Date(),
    input,
    output,
    hash,
  });
}
```

---

## 🧪 TESTES DE DETERMINISMO

### Teste 1: Mesma Entrada = Mesma Saída

```typescript
describe('Motor Clínico - Determinismo', () => {
  it('deve retornar mesmos macros para mesma entrada', () => {
    const input = {
      items: [
        { foodId: 'frango-id', quantity: 100 },
        { foodId: 'arroz-id', quantity: 50 },
      ],
      date: new Date('2026-05-31'),
    };
    
    const result1 = calculateMealMacros(input.items, input.date);
    const result2 = calculateMealMacros(input.items, input.date);
    const result3 = calculateMealMacros(input.items, input.date);
    
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });
});
```

### Teste 2: Ordem Não Importa

```typescript
it('deve retornar mesmos macros independente da ordem', () => {
  const items1 = [
    { foodId: 'frango-id', quantity: 100 },
    { foodId: 'arroz-id', quantity: 50 },
  ];
  
  const items2 = [
    { foodId: 'arroz-id', quantity: 50 },
    { foodId: 'frango-id', quantity: 100 },
  ];
  
  const result1 = calculateMealMacros(items1, new Date());
  const result2 = calculateMealMacros(items2, new Date());
  
  expect(result1).toEqual(result2);
});
```

### Teste 3: Erro Explícito

```typescript
it('deve lançar erro se alimento não existe', () => {
  const items = [
    { foodId: 'inexistente-id', quantity: 100 },
  ];
  
  expect(() => {
    calculateMealMacros(items, new Date());
  }).toThrow(FoodNotFoundError);
});
```

### Teste 4: Validação de Entrada

```typescript
it('deve validar quantidade', () => {
  const items = [
    { foodId: 'frango-id', quantity: -100 }, // Inválido
  ];
  
  expect(() => {
    calculateMealMacros(items, new Date());
  }).toThrow(ValidationError);
});
```

---

## 📊 CHECKLIST DE DETERMINISMO

- [ ] Sem fallbacks silenciosos
- [ ] Validação rigorosa de entrada
- [ ] Cálculos sempre iguais
- [ ] Ordem não importa (sort determinístico)
- [ ] Erros explícitos
- [ ] Auditoria de cálculos
- [ ] Testes de determinismo
- [ ] Documentação de regras
- [ ] Sem random/fuzzy
- [ ] Sem estado global

---

## 🚨 RED FLAGS

### ❌ NÃO FAÇA ISSO

```typescript
// ❌ Fallback silencioso
if (!food) return getDefaultMacros();

// ❌ Fuzzy matching
const food = findFoodByNameFuzzy(name);

// ❌ Valor padrão
const protein = food.protein_g || 10;

// ❌ Random
const macros = estimateMacrosRandomly(kcal);

// ❌ Estado global
globalCache.set(foodId, macros);

// ❌ Sem validação
return calculateMacros(input);
```

### ✅ FAÇA ASSIM

```typescript
// ✅ Erro explícito
if (!food) throw new FoodNotFoundError();

// ✅ Match exato
const food = findFoodById(id);

// ✅ Validação rigorosa
if (!food.protein_g) throw new ValidationError();

// ✅ Determinístico
const macros = calculateMacrosDeterministic(kcal);

// ✅ Sem estado global
return calculateMacros(input);

// ✅ Validação sempre
const validated = validateInput(input);
return calculateMacros(validated);
```

---

## 📞 IMPLEMENTAÇÃO

1. **Revisar** todos os cálculos clínicos
2. **Remover** fallbacks silenciosos
3. **Adicionar** validação rigorosa
4. **Implementar** auditoria
5. **Escrever** testes de determinismo
6. **Documentar** regras clínicas
7. **Testar** em produção

---

**O motor clínico 2.0 será determinístico, auditável e confiável!**
