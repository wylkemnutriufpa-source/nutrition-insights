# Auditoria — Persistência de Dados no Editor V3

**Data:** 28 de Maio de 2026  
**Severidade:** 🔴 CRÍTICA  
**Problema:** Alterações não permanecem ao voltar no plano

---

## 🔍 Problema Identificado

### Sintoma
```
1. Usuário ajusta quantidade de um item (ex: 150g → 200g)
2. Salva e imprime PDF
3. Volta no plano
4. Alteração desapareceu (volta para 150g)
5. Tudo continua em "100" em vez de "100gr"
```

### Causa Raiz

**Arquivo:** `src/features/editor-v3/hooks/useEditorState.ts`

A função `preservedQuantityDisplay()` (linhas 11-35) está armazenando a quantidade E a unidade em um único campo `quantity_display` como string:

```typescript
// Exemplo: "2 unidades" ou "150g"
quantity_display: preservedQuantityDisplay(item, oldQty, safeNewQty)
```

**Arquivo:** `src/features/editor-v3/components/EditorV3Page.tsx` (linhas 659-660)

Ao salvar no banco, está tentando extrair a unidade de um campo que não existe:

```typescript
display_quantity: item.quantity,
display_unit: item.portionUnitLabel || 'g'  // ❌ portionUnitLabel NÃO EXISTE!
```

**Resultado:** 
- `display_quantity` = número correto (ex: 200)
- `display_unit` = sempre "g" (fallback)
- Unidades naturais (porção, unidade, xícara) são perdidas

---

## 🔧 Fluxo de Dados Quebrado

```
Editor (em memória)
  ↓
  item.quantity_display = "2 unidades"  ✅ Correto
  item.quantity = 200
  item.portionUnitLabel = undefined  ❌ Não existe!
  ↓
Salvar no Banco
  ↓
  display_quantity = 200  ✅
  display_unit = "g"  ❌ Deveria ser "unidade"
  ↓
Banco de Dados
  ↓
  meal_plan_items.display_unit = "g"  ❌ Perdeu a unidade original
  ↓
Voltar no Editor
  ↓
  Carrega do banco com display_unit = "g"
  Renderiza como "200g" em vez de "2 unidades"  ❌
```

---

## ✅ Solução

### Passo 1: Extrair Unidade de `quantity_display`

**Arquivo:** `src/features/editor-v3/components/EditorV3Page.tsx` (linhas 659-660)

Criar função para extrair unidade:

```typescript
function extractUnitFromQuantityDisplay(quantityDisplay: string): string {
  if (!quantityDisplay) return 'g';
  
  const unitMatch = quantityDisplay.match(/\b(unidade|unidades|fatia|fatias|colher|colheres|copo|copos|xicara|xícaras|porção|porções|ml|l)\b/i);
  if (unitMatch) return unitMatch[1];
  
  return 'g';
}
```

### Passo 2: Usar Função ao Salvar

**Arquivo:** `src/features/editor-v3/components/EditorV3Page.tsx` (linhas 659-660)

```typescript
// Antes (ERRADO):
display_quantity: item.quantity,
display_unit: item.portionUnitLabel || 'g'

// Depois (CORRETO):
display_quantity: item.quantity,
display_unit: extractUnitFromQuantityDisplay(item.quantity_display)
```

### Passo 3: Garantir Persistência

**Arquivo:** `src/features/editor-v3/services/planPersistenceService.ts` (linhas 468-470)

Adicionar `display_unit` ao salvar:

```typescript
// Antes (ERRADO):
description: item.quantity_display,

// Depois (CORRETO):
description: item.description,
display_quantity: item.quantity,
display_unit: extractUnitFromQuantityDisplay(item.quantity_display),
```

---

## 📊 Impacto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Alterações permanecem | ❌ Não | ✅ Sim |
| Unidades preservadas | ❌ Não | ✅ Sim |
| "100" vs "100gr" | ❌ Sempre "g" | ✅ Unidade correta |
| Dados consistentes | ❌ Não | ✅ Sim |

---

## 🔐 Princípios Mantidos

✅ **Determinismo:** Sem fuzzy matching  
✅ **Persistência:** Dados salvos e recuperados corretamente  
✅ **Unidades Naturais:** Porção, unidade, xícara preservadas  
✅ **Compatibilidade:** Fallback para "g" se unidade não encontrada  

---

## 📝 Arquivos a Modificar

1. `src/features/editor-v3/components/EditorV3Page.tsx`
   - Adicionar função `extractUnitFromQuantityDisplay()`
   - Usar ao salvar `display_unit`

2. `src/features/editor-v3/services/planPersistenceService.ts`
   - Adicionar `display_quantity` e `display_unit` ao salvar
   - Usar função `extractUnitFromQuantityDisplay()`

3. `src/features/editor-v3/hooks/useEditorState.ts`
   - Verificar se `quantity_display` está sendo gerado corretamente
   - Adicionar `portionUnitLabel` se necessário

---

**Status:** 🔴 CRÍTICO — Aguardando correção  
**Estimativa:** 30 minutos

