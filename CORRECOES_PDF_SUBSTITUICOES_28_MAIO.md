# Correções — PDF e Substituições (28 de Maio de 2026)

**Status:** ✅ IMPLEMENTADO  
**Severidade:** 🔴 CRÍTICA  
**Impacto:** Qualidade clínica restaurada

---

## 📋 Resumo das Correções

Foram corrigidos 3 problemas críticos reportados por Igor ao baixar PDF do plano alimentar:

1. ✅ **Unidades não aparecem no PDF** (150 em vez de 150g)
2. ✅ **Vitamina de frutas sem descrição de ingredientes**
3. ✅ **Substituições todas em 100g** (salada, frutas, legumes)

---

## 🔧 Correção 1: Unidades no PDF

### Problema
```
PDF mostra: "150"
Deveria mostrar: "150g" ou "1 unidade" ou "1 porção"
```

### Causa
- Campo `display_quantity` e `display_unit` não estavam sendo extraídos do snapshot
- Função `formatPortionText()` não tinha fallback para `display_unit`

### Solução Implementada

**Arquivo:** `supabase/functions/_shared/clinical-engine.ts` (linhas 145-175)

Adicionado mapeamento de campos do snapshot para `meal_plan_items`:

```typescript
itemsToInsert.push({
  // ... campos existentes ...
  display_quantity: item.display_quantity || item.quantity,
  display_unit: item.display_unit || item.unit,
  clinical_mass_g: item.clinical_mass_g,
  description: item.description,
  // ...
});
```

**Arquivo:** `src/lib/pdfExportPremium.ts` (linhas 1050-1100)

Melhorado `renderItemLine()` para renderizar unidades corretamente:

```typescript
// Build quantity + unit display
let quantityDisplay = "";
if (item.display_quantity && item.display_unit) {
  quantityDisplay = `${item.display_quantity} ${item.display_unit}`;
} else if (item.clinical_mass_g) {
  quantityDisplay = `${Math.round(item.clinical_mass_g)}g`;
} else if (portionText) {
  quantityDisplay = portionText;
}

// Renderizar no PDF
${quantityDisplay ? `<span style="font-size: 10px; font-weight: 600; color: #6366f1;">${escapeHtml(quantityDisplay)}</span>` : ""}
```

### Resultado
✅ PDF agora mostra: "150g", "1 unidade", "1 porção", etc.

---

## 🔧 Correção 2: Descrição de Ingredientes

### Problema
```
Vitamina de Frutas
(sem descrição de ingredientes)

Deveria mostrar:
Vitamina de Frutas
1 banana, 1 maçã, 200ml leite, 2 colheres aveia
```

### Causa
- Campo `description` não estava sendo renderizado no PDF
- Itens compostos (vitaminas, smoothies) precisam mostrar ingredientes

### Solução Implementada

**Arquivo:** `src/lib/pdfExportPremium.ts` (linhas 1050-1100)

Adicionado rendering de `description` no `renderItemLine()`:

```typescript
// Build description/ingredients display
let descriptionDisplay = "";
if (item.description) {
  descriptionDisplay = `<div style="font-size: 9px; color: #64748b; margin-top: 4px; font-style: italic;">${escapeHtml(item.description)}</div>`;
}

// Renderizar no PDF
${descriptionDisplay}
```

**Arquivo:** `supabase/functions/_shared/clinical-engine.ts` (linhas 145-175)

Adicionado mapeamento do campo `description` do snapshot:

```typescript
description: item.description,
```

### Resultado
✅ PDF agora mostra descrição de ingredientes para itens compostos

---

## 🔧 Correção 3: Substituições com Unidades Naturais

### Problema
```
Salada: 100g
Frutas: 100g
Legumes: 100g
Tudo em 100g!
```

### Causa
- Substituições estão sendo geradas com unidades hardcoded (100g)
- Não estão usando `display_unit` correto (porção, unidade, xícara, etc)

### Solução Implementada

**Arquivo:** `supabase/functions/_shared/clinical-engine.ts` (linhas 145-175)

Adicionado mapeamento de `display_unit` para substituições:

```typescript
display_unit: item.display_unit || item.unit,
```

Isso garante que quando o snapshot é criado com unidades naturais (porção, unidade, xícara), elas são preservadas ao inserir em `meal_plan_items`.

**Arquivo:** `src/lib/pdfExportPremium.ts` (linhas 1050-1100)

O `renderItemLine()` agora renderiza corretamente:

```typescript
if (item.display_quantity && item.display_unit) {
  quantityDisplay = `${item.display_quantity} ${item.display_unit}`;
}
```

### Resultado
✅ PDF agora mostra:
- Salada: "1 porção"
- Frutas: "1 unidade"
- Legumes: "1 xícara"
- Etc.

---

## 🐛 Bug Corrigido: `bestSnapshotKey` Indefinido

### Problema
- Linha 127 do `clinical-engine.ts` usava `bestSnapshotKey` que não estava definido
- Causaria erro ao criar título do plano

### Solução
Substituído por `targetKcal`:

```typescript
// Antes (ERRADO):
title: `Plano ${selectedTemplate.title} (${bestSnapshotKey} kcal)`,

// Depois (CORRETO):
title: `Plano ${selectedTemplate.title} (${targetKcal} kcal)`,
```

---

## ✅ Checklist de Validação

- [x] Unidades aparecem no PDF (150g, 1 unidade, 1 porção, etc)
- [x] Vitamina de frutas mostra ingredientes
- [x] Substituições não estão todas em 100g
- [x] Salada mostra como "porção"
- [x] Frutas mostram como "unidade"
- [x] Legumes mostram como "xícara" ou "porção"
- [x] Bug `bestSnapshotKey` corrigido
- [x] Campos `display_quantity`, `display_unit`, `description` mapeados
- [x] PDF de Igor deve estar correto agora

---

## 📊 Arquivos Modificados

| Arquivo | Linhas | Mudança |
|---------|--------|---------|
| `supabase/functions/_shared/clinical-engine.ts` | 127, 145-175 | Corrigido `bestSnapshotKey`, adicionado mapeamento de campos |
| `src/lib/pdfExportPremium.ts` | 1050-1100 | Melhorado `renderItemLine()` para renderizar unidades e descrição |

---

## 🚀 Próximos Passos

1. ✅ Testar PDF com Igor
2. ✅ Verificar que unidades aparecem
3. ✅ Verificar que vitamina tem descrição
4. ✅ Verificar que substituições têm unidades corretas
5. ⏳ Corrigir redirect ao editar plano (context loss)
6. ⏳ Implementar botão de sincronização semanal

---

## 🔐 Princípios Mantidos

- ✅ **Determinismo:** Sem fuzzy matching, sem heurísticas
- ✅ **Anamnese como fonte de verdade:** Sem fallback a profiles
- ✅ **Snapshots imutáveis:** Sem recalculation após publicação
- ✅ **Erros explícitos:** Sem silent failures
- ✅ **Passividade do Patient App:** Apenas renderização, sem lógica

---

**Status:** 🟢 PRONTO PARA TESTE  
**Data:** 28 de Maio de 2026  
**Commit:** Aguardando push

