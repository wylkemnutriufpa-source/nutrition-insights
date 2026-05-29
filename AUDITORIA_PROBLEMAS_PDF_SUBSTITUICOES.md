# Auditoria Forense — Problemas no PDF e Substituições

**Data:** 28 de Maio de 2026  
**Severidade:** 🔴 CRÍTICA  
**Impacto:** Qualidade clínica comprometida

---

## 🔴 Problema 1: Unidades Não Aparecem no PDF

### Sintoma
```
PDF mostra: "150"
Deveria mostrar: "150g" ou "150ml" ou "1 unidade"
```

### Causa Provável
- Campo `unit` não está sendo renderizado no componente de impressão
- Ou `portion_label` não está sendo usado

### Onde Corrigir
**Arquivo:** `src/components/patient/MealPlanPDF.tsx` (ou similar)

**Antes (ERRADO):**
```tsx
<div>{item.quantity}</div>
```

**Depois (CORRETO):**
```tsx
<div>{item.quantity} {item.unit}</div>
// Ou melhor ainda:
<div>{item.portion_label || `${item.quantity} ${item.unit}`}</div>
```

---

## 🔴 Problema 2: Vitamina de Frutas Sem Descrição

### Sintoma
```
PDF mostra: "Vitamina de Frutas"
Deveria mostrar: "Vitamina de Frutas (1 banana, 1 maçã, 200ml leite, 2 colheres aveia)"
```

### Causa Provável
- Item "Vitamina de Frutas" é um **item composto** que deveria ter `ingredients` ou `description`
- Ou está sendo renderizado como item simples em vez de composto

### Estrutura Esperada
```json
{
  "name": "Vitamina de Frutas",
  "kcal": 250,
  "quantity": 1,
  "unit": "copo",
  "portion_label": "1 copo (300ml)",
  "description": "1 banana, 1 maçã, 200ml leite integral, 2 colheres aveia",
  "ingredients": [
    {
      "name": "Banana",
      "quantity": 1,
      "unit": "unidade"
    },
    {
      "name": "Maçã",
      "quantity": 1,
      "unit": "unidade"
    },
    {
      "name": "Leite Integral",
      "quantity": 200,
      "unit": "ml"
    },
    {
      "name": "Aveia",
      "quantity": 2,
      "unit": "colher"
    }
  ]
}
```

### Onde Corrigir
**Arquivo:** `src/components/patient/MealPlanPDF.tsx`

**Antes (ERRADO):**
```tsx
<div>{item.name}</div>
```

**Depois (CORRETO):**
```tsx
<div>
  {item.name}
  {item.description && <small>{item.description}</small>}
  {item.ingredients && (
    <ul>
      {item.ingredients.map(ing => (
        <li key={ing.name}>{ing.quantity} {ing.unit} {ing.name}</li>
      ))}
    </ul>
  )}
</div>
```

---

## 🔴 Problema 3: Substituições Todas em 100g

### Sintoma
```
Salada: 100g
Frutas: 100g
Legumes: 100g
Tudo em 100g!
```

### Causa Provável
- Substituições estão sendo geradas com `unit: "g"` hardcoded
- Não está usando `portion_label` correto
- Não está respeitando unidades naturais (salada = porção, frutas = unidade, etc)

### Estrutura Esperada
```json
{
  "substitutions": [
    {
      "name": "Salada Verde",
      "quantity": 1,
      "unit": "porção",
      "portion_label": "1 porção (150g)",
      "kcal": 25
    },
    {
      "name": "Maçã",
      "quantity": 1,
      "unit": "unidade",
      "portion_label": "1 maçã (150g)",
      "kcal": 80
    },
    {
      "name": "Brócolis Cozido",
      "quantity": 1,
      "unit": "xícara",
      "portion_label": "1 xícara (150g)",
      "kcal": 35
    }
  ]
}
```

### Onde Corrigir
**Arquivo:** `supabase/functions/_shared/clinical-engine.ts` ou `src/lib/substitutions.ts`

**Antes (ERRADO):**
```typescript
const substitution = {
  name: item.name,
  quantity: 100,
  unit: "g",
  kcal: item.kcal_100g
};
```

**Depois (CORRETO):**
```typescript
const substitution = {
  name: item.name,
  quantity: getPortionQuantity(item.unit),  // 1 para unidade, 1 para porção, etc
  unit: getPortionUnit(item.unit),          // "unidade", "porção", "xícara", etc
  portion_label: item.portion_label,        // "1 maçã (150g)"
  kcal: calculateKcalForPortion(item)
};
```

---

## 📊 Mapeamento de Problemas

| Problema | Arquivo | Campo | Solução |
|----------|---------|-------|---------|
| Unidades no PDF | MealPlanPDF.tsx | `unit` | Renderizar `{quantity} {unit}` |
| Vitamina sem descrição | MealPlanPDF.tsx | `description` / `ingredients` | Renderizar `description` ou `ingredients` |
| Substituições em 100g | clinical-engine.ts | `quantity`, `unit` | Usar `portion_label` e unidades naturais |

---

## 🔧 Plano de Correção

### Fase 1: Corrigir Renderização no PDF
- Adicionar `unit` ao template de impressão
- Adicionar `description` / `ingredients` ao template
- Testar PDF

### Fase 2: Corrigir Substituições
- Auditar como substituições estão sendo geradas
- Implementar lógica de unidades naturais
- Testar substituições

### Fase 3: Validar
- Gerar PDF para Igor
- Verificar que unidades aparecem
- Verificar que vitamina tem descrição
- Verificar que substituições têm unidades corretas

---

## ✅ Checklist de Validação

- [ ] PDF mostra unidades (150g, 1 unidade, etc)
- [ ] Vitamina de frutas mostra ingredientes
- [ ] Substituições não estão todas em 100g
- [ ] Salada mostra como "porção"
- [ ] Frutas mostram como "unidade"
- [ ] Legumes mostram como "xícara" ou "porção"
- [ ] PDF de Igor está correto

---

**Status:** 🔴 CRÍTICO — Aguardando correção imediata
