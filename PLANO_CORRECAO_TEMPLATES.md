# Plano de Correção de Templates

**Data:** 28 de Maio de 2026  
**Prioridade:** 🔴 CRÍTICA  
**Tempo Estimado:** 2-3 horas

---

## 🎯 Objetivo

Corrigir estrutura de dados dos templates para que:
1. Todos tenham 7 dias
2. Refeições estejam desagrupadas em items individuais
3. Ovo esteja em unidades (não gramas)
4. Todos os items tenham imagens
5. Portion labels estejam corretos

---

## 📋 Passo 1: Auditar Templates

### Executar SQL de Diagnóstico

```bash
# Copiar conteúdo de:
DIAGNOSTICO_TEMPLATES_ESTRUTURA.sql

# Executar no Supabase SQL Editor
# Isso vai mostrar:
# - Templates com < 7 dias
# - Templates sem imagens
# - Refeições agrupadas
# - Ovo em gramas
# - Arroz com conversão incorreta
```

### Documentar Achados

Anote:
- Quantos templates têm problema
- Quais são os IDs
- Qual é o tipo de problema

---

## 🔧 Passo 2: Corrigir Estrutura de Refeições

### Problema: Refeições Agrupadas

**Antes (ERRADO):**
```json
{
  "meals": [
    {
      "name": "Café com Leite com Pão com Ovo",
      "items": [
        {
          "name": "Café com Leite com Pão com Ovo",
          "kcal": 450,
          "quantity": 1,
          "unit": "porção"
        }
      ]
    }
  ]
}
```

**Depois (CORRETO):**
```json
{
  "meals": [
    {
      "name": "Café da Manhã",
      "items": [
        {
          "name": "Café com Leite",
          "kcal": 150,
          "quantity": 1,
          "unit": "xícara",
          "portion_label": "1 xícara (200ml)",
          "imageUrl": "https://..."
        },
        {
          "name": "Pão Integral",
          "kcal": 100,
          "quantity": 2,
          "unit": "fatia",
          "portion_label": "2 fatias (50g)",
          "imageUrl": "https://..."
        },
        {
          "name": "Ovo Cozido",
          "kcal": 80,
          "quantity": 1,
          "unit": "unidade",
          "portion_label": "1 ovo (50g)",
          "imageUrl": "https://..."
        }
      ]
    }
  ]
}
```

### SQL para Corrigir

```sql
-- Exemplo: Desagrupar refeição específica
UPDATE v3_diet_templates
SET plan_snapshot = jsonb_set(
  plan_snapshot,
  '{days,0,meals,0}',
  jsonb_build_object(
    'name', 'Café da Manhã',
    'items', jsonb_build_array(
      jsonb_build_object(
        'name', 'Café com Leite',
        'kcal', 150,
        'quantity', 1,
        'unit', 'xícara',
        'portion_label', '1 xícara (200ml)',
        'imageUrl', 'https://...'
      ),
      jsonb_build_object(
        'name', 'Pão Integral',
        'kcal', 100,
        'quantity', 2,
        'unit', 'fatia',
        'portion_label', '2 fatias (50g)',
        'imageUrl', 'https://...'
      ),
      jsonb_build_object(
        'name', 'Ovo Cozido',
        'kcal', 80,
        'quantity', 1,
        'unit', 'unidade',
        'portion_label', '1 ovo (50g)',
        'imageUrl', 'https://...'
      )
    )
  )
)
WHERE id = 'TEMPLATE_ID_AQUI';
```

---

## 🥚 Passo 3: Corrigir Ovo (Gramas → Unidades)

### Problema: Ovo em Gramas

**Antes (ERRADO):**
```json
{
  "name": "Ovo",
  "quantity": 150,
  "unit": "g"
}
```

**Depois (CORRETO):**
```json
{
  "name": "Ovo Cozido",
  "quantity": 2,
  "unit": "unidade",
  "portion_label": "2 ovos (100g)",
  "kcal": 160
}
```

### Conversão

- 1 ovo = ~50g = 80 kcal
- 150g de ovo = 3 ovos = 240 kcal
- 100g de ovo = 2 ovos = 160 kcal

### SQL para Corrigir

```sql
-- Encontrar e corrigir ovo em gramas
UPDATE v3_diet_templates
SET plan_snapshot = jsonb_set(
  plan_snapshot,
  '{days,0,meals,0,items,0}',
  jsonb_build_object(
    'name', 'Ovo Cozido',
    'quantity', 2,
    'unit', 'unidade',
    'portion_label', '2 ovos (100g)',
    'kcal', 160,
    'imageUrl', 'https://...'
  )
)
WHERE id = 'TEMPLATE_ID_AQUI'
AND plan_snapshot::text LIKE '%ovo%150%';
```

---

## 🍚 Passo 4: Corrigir Arroz (Colheres → Xícara)

### Problema: Arroz com Conversão Incorreta

**Antes (ERRADO):**
```json
{
  "name": "Arroz",
  "quantity": 100,
  "unit": "g",
  "portion_label": "2 colheres"
}
```

**Depois (CORRETO):**
```json
{
  "name": "Arroz Cozido",
  "quantity": 100,
  "unit": "g",
  "portion_label": "1/2 xícara (100g)",
  "kcal": 130
}
```

### Conversão

- 100g de arroz cozido = ~1/2 xícara
- 150g de arroz cozido = ~3/4 xícara
- 200g de arroz cozido = ~1 xícara

### SQL para Corrigir

```sql
-- Encontrar e corrigir arroz
UPDATE v3_diet_templates
SET plan_snapshot = jsonb_set(
  plan_snapshot,
  '{days,0,meals,0,items,0}',
  jsonb_build_object(
    'name', 'Arroz Cozido',
    'quantity', 100,
    'unit', 'g',
    'portion_label', '1/2 xícara (100g)',
    'kcal', 130,
    'imageUrl', 'https://...'
  )
)
WHERE id = 'TEMPLATE_ID_AQUI'
AND plan_snapshot::text LIKE '%arroz%';
```

---

## 🖼️ Passo 5: Adicionar Imagens

### Problema: Items Sem Imagem

**Antes (ERRADO):**
```json
{
  "name": "Ovo Cozido",
  "kcal": 80
}
```

**Depois (CORRETO):**
```json
{
  "name": "Ovo Cozido",
  "kcal": 80,
  "imageUrl": "https://cdn.example.com/ovo-cozido.jpg"
}
```

### URLs de Imagens Padrão

```
Café com Leite: https://cdn.example.com/cafe-com-leite.jpg
Pão Integral: https://cdn.example.com/pao-integral.jpg
Ovo Cozido: https://cdn.example.com/ovo-cozido.jpg
Arroz Cozido: https://cdn.example.com/arroz-cozido.jpg
Fruta: https://cdn.example.com/fruta.jpg
```

---

## 📅 Passo 6: Garantir 7 Dias

### Problema: Templates com < 7 Dias

**Verificar:**
```sql
SELECT id, title, jsonb_array_length(plan_snapshot->'days') as day_count
FROM v3_diet_templates
WHERE active = true
AND jsonb_array_length(plan_snapshot->'days') < 7;
```

**Corrigir:**
- Duplicar dias existentes até completar 7
- Ou remover template se não puder ser corrigido

---

## 💾 Passo 7: Validar Correções

### Executar Diagnóstico Novamente

```bash
# Executar DIAGNOSTICO_TEMPLATES_ESTRUTURA.sql novamente
# Verificar que todos os problemas foram corrigidos
```

### Checklist

- [ ] Todos os templates têm 7 dias
- [ ] Todas as refeições estão desagrupadas
- [ ] Ovo está em unidades
- [ ] Arroz tem portion_label correto
- [ ] Todos os items têm imagens
- [ ] Testes passam

---

## 🔧 Passo 8: Corrigir Código (Redirecionamento)

### Problema: Redirecionamento ao Atualizar Página

**Arquivo:** `src/features/editor-v3/hooks/useEditorState.ts`

**Solução:**
1. Salvar estado em localStorage
2. Restaurar estado ao carregar página
3. Usar URL state para persistência

**Exemplo:**
```typescript
// Salvar contexto
localStorage.setItem('editorContext', JSON.stringify({
  patientId,
  mealPlanId,
  currentDay,
  currentMeal
}));

// Restaurar contexto
const savedContext = localStorage.getItem('editorContext');
if (savedContext) {
  const context = JSON.parse(savedContext);
  // Restaurar estado
}
```

---

## 🔄 Passo 9: Adicionar "Aplicar a Semana"

### Problema: Ajuste de Um Dia Não Ajusta Resto

**Solução:**
1. Adicionar botão "Aplicar a Semana"
2. Replicar mudanças para todos os 7 dias
3. Pedir confirmação antes de aplicar

**Exemplo:**
```typescript
const applyToWeek = async (dayOfWeek: number, meal: Meal) => {
  const confirmed = confirm('Aplicar esta refeição a toda a semana?');
  if (confirmed) {
    for (let i = 0; i < 7; i++) {
      updateMeal(i, meal);
    }
  }
};
```

---

## ✅ Checklist Final

- [ ] Passo 1: Auditoria completa
- [ ] Passo 2: Refeições desagrupadas
- [ ] Passo 3: Ovo em unidades
- [ ] Passo 4: Arroz com portion_label correto
- [ ] Passo 5: Imagens adicionadas
- [ ] Passo 6: 7 dias garantidos
- [ ] Passo 7: Validação completa
- [ ] Passo 8: Redirecionamento corrigido
- [ ] Passo 9: "Aplicar a Semana" implementado
- [ ] Testes passam
- [ ] Commit e push

---

**Status:** 🔴 CRÍTICO — Aguardando execução
