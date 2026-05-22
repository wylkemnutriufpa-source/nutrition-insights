# 🔍 DIAGNÓSTICO FINAL - TEMPLATES VAZIOS

## ✅ DESCOBERTA IMPORTANTE

**Query 7 confirmou:** A primeira refeição tem **3 alimentos** no banco:
- Cuscuz 100g (112 kcal)
- Ovo 2 unidades (146 kcal)
- Mamão 1 fatia (43 kcal)

**Mas no frontend:** Só aparece "Ovo"

---

## 🎯 PROBLEMA IDENTIFICADO

### Cenário A: Problema na Conversão
- Código está convertendo apenas o **primeiro** ou **último** item do array `foods`
- Array `items` está sendo sobrescrito ou truncado

### Cenário B: Problema na Renderização
- Código converte os 3 items corretamente
- Mas `MealCard` renderiza apenas 1 item
- Pode haver um `.slice(0, 1)` ou similar

### Cenário C: Problema no Estado
- Código converte e renderiza corretamente
- Mas `store.hydrateMeals` está perdendo items
- Estado do Zustand está sendo modificado incorretamente

---

## 🔍 PRÓXIMOS PASSOS

### URGENTE: Me envie os resultados das outras queries

**Query 4:** Quantos dias existem?
```sql
SELECT 
  title,
  jsonb_array_length(plan_snapshot->'1500'->'days') as qtd_dias
FROM v3_diet_templates
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true;
```

**Resultado esperado:**
- Se `qtd_dias = 7`: Template tem 7 dias ✅
- Se `qtd_dias = 1`: Template tem apenas 1 dia ❌ (explica por que só segunda tem alimentos)

**Query 5:** Quantas refeições por dia?
```sql
SELECT 
  title,
  day_index,
  day_data->>'day_of_week' as dia_semana,
  jsonb_array_length(day_data->'meals') as qtd_refeicoes
FROM v3_diet_templates,
     jsonb_array_elements(plan_snapshot->'1500'->'days') WITH ORDINALITY AS t(day_data, day_index)
WHERE title ILIKE '%emagrecimento%1500%'
  AND active = true;
```

**Resultado esperado:**
```
day_index | dia_semana | qtd_refeicoes
----------|------------|---------------
1         | 1          | 6
2         | 2          | 6
3         | 3          | 6
4         | 4          | 6
5         | 5          | 6
6         | 6          | 6
7         | 0          | 6
```

---

## 🛠️ CORREÇÕES POSSÍVEIS

### Se Query 4 retornar `qtd_dias = 1`:
**Problema:** Template no banco tem apenas 1 dia  
**Solução:** Executar SQL para duplicar o dia 1 para os outros 6 dias

### Se Query 4 retornar `qtd_dias = 7`:
**Problema:** Código está carregando apenas 1 dia  
**Solução:** Verificar `normalizeSnapshotToV3` e `handleSelectProfile`

### Para o problema "só aparece Ovo":
**Solução:** Adicionar log na renderização para ver quantos items chegam no `MealCard`

---

## 📊 ANÁLISE TÉCNICA

### Dados no Banco (Confirmado ✅)
```json
{
  "1500": {
    "days": [
      {
        "day_of_week": 1,
        "meals": [
          {
            "name": "Café da Manhã",
            "foods": [
              {"name": "Cuscuz", "qty": "100g", "kcal": 112},
              {"name": "Ovo", "qty": "2 unidades", "kcal": 146},
              {"name": "Mamão", "qty": "1 fatia", "kcal": 43}
            ]
          }
        ]
      }
    ]
  }
}
```

### Conversão Esperada (Código)
```javascript
items = [
  {name: "Cuscuz", clinical_mass_g: 100, kcal: 112},
  {name: "Ovo", clinical_mass_g: 100, kcal: 146},
  {name: "Mamão", clinical_mass_g: 100, kcal: 43}
]
```

### Renderização Esperada (Frontend)
```
🍳 Café da Manhã (08:00) - 301 kcal
   • Cuscuz 100g (112 kcal)
   • Ovo 2 unidades (146 kcal)
   • Mamão 1 fatia (43 kcal)
```

### Renderização Atual (Problema ❌)
```
🍳 Café da Manhã (08:00) - 146 kcal
   • Ovo (146 kcal)
```

---

## 🚨 HIPÓTESES

### Hipótese 1: Array sendo sobrescrito
```javascript
// ERRADO
let items = [];
m.foods.forEach(food => {
  items = [convertFood(food)]; // ❌ Sobrescreve array
});

// CORRETO
let items = [];
m.foods.forEach(food => {
  items.push(convertFood(food)); // ✅ Adiciona ao array
});
```

### Hipótese 2: Renderização limitada
```javascript
// ERRADO
meal.items.slice(0, 1).map(item => ...) // ❌ Só renderiza 1 item

// CORRETO
meal.items.map(item => ...) // ✅ Renderiza todos
```

### Hipótese 3: Estado sendo modificado
```javascript
// ERRADO
store.hydrateMeals(meals.map(m => ({...m, items: [m.items[0]]}))) // ❌

// CORRETO
store.hydrateMeals(meals) // ✅
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [x] Dados no banco verificados (3 alimentos confirmados)
- [ ] Query 4 executada (quantos dias?)
- [ ] Query 5 executada (refeições por dia?)
- [ ] Logs do console verificados (conversão funcionando?)
- [ ] Código de renderização verificado (limitação de items?)
- [ ] Estado do Zustand verificado (items sendo perdidos?)

---

**Aguardando:** Resultados das Queries 4 e 5

**Próxima ação:** Corrigir baseado nos resultados

