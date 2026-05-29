# Auditoria de Templates — Problemas Críticos

**Data:** 28 de Maio de 2026  
**Severidade:** 🔴 CRÍTICA  
**Impacto:** Qualidade clínica comprometida

---

## 📋 Problemas Identificados

### 1. ❌ Templates com Apenas 1 Dia

**Problema:** Templates devem ter 7 dias, não 1

**Impacto:** 
- Paciente recebe plano incompleto
- Nutricionista não consegue editar semana completa
- Violação do contrato V3 (7 dias obrigatório)

**Ação:** Auditar `v3_diet_templates` e remover/corrigir templates com < 7 dias

---

### 2. ❌ Templates com Apenas Ovo no Café da Manhã

**Problema:** Falta diversidade alimentar

**Impacto:**
- Nutricionista não consegue fazer substituições
- Paciente fica entediado
- Violação de boas práticas clínicas

**Ação:** Adicionar variedade (pão, queijo, frutas, etc.)

---

### 3. ❌ Templates Sem Imagem

**Problema:** Falta de visualização

**Impacto:**
- Paciente não consegue identificar alimento
- Experiência ruim
- Reduz adesão

**Ação:** Adicionar `image_url` para todos os itens

---

### 4. ❌ Refeições Agrupadas em Vez de Separadas

**Problema:** Estrutura incorreta

**Antes (ERRADO):**
```json
{
  "name": "Café com Leite com Pão com Ovo",
  "kcal": 450,
  "items": [...]
}
```

**Depois (CORRETO):**
```json
{
  "items": [
    {
      "name": "Café com Leite",
      "kcal": 150,
      "macros": {...}
    },
    {
      "name": "Pão Integral",
      "kcal": 100,
      "macros": {...}
    },
    {
      "name": "Ovo Cozido",
      "kcal": 80,
      "macros": {...}
    }
  ]
}
```

**Impacto:**
- Nutricionista não consegue substituir itens individuais
- Cálculos de macros ficam errados
- Violação do modelo V3 (items separados)

**Ação:** Desagrupar refeições em items individuais

---

### 5. ❌ Ovo em Gramas (150g) em Vez de Unidades

**Problema:** Unidade incorreta

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
  "portion_g": 100,
  "kcal": 160
}
```

**Impacto:**
- Paciente não entende (150g de ovo é ~2 ovos)
- Nutricionista não consegue fazer substituições
- Violação de padrão clínico

**Ação:** Converter para unidades (ovo = unidade, não grama)

---

### 6. ❌ Arroz 100g Mostrado como "2 Colheres"

**Problema:** Conversão incorreta

**Antes (ERRADO):**
```json
{
  "name": "Arroz",
  "quantity": 100,
  "unit": "g",
  "display": "2 colheres"
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

**Impacto:**
- Paciente fica confuso (2 colheres ≠ 100g)
- Nutricionista não consegue fazer substituições
- Violação de padrão clínico

**Ação:** Usar `portion_label` correto (ex: "1/2 xícara")

---

### 7. ❌ Redirecionamento para Dashboard ao Atualizar Página

**Problema:** Perda de contexto de edição

**Antes (ERRADO):**
```
Nutricionista edita dieta → Página atualiza → Redireciona para dashboard
```

**Depois (CORRETO):**
```
Nutricionista edita dieta → Página atualiza → Mantém contexto de edição
```

**Impacto:**
- Nutricionista perde trabalho
- Experiência frustrante
- Reduz produtividade

**Ação:** Implementar persistência de contexto (localStorage/URL state)

---

### 8. ❌ Ajuste de Um Dia Não Ajusta Resto da Semana

**Problema:** Falta de sincronização

**Antes (ERRADO):**
```
Nutricionista ajusta segunda-feira → Resto da semana não muda
```

**Depois (CORRETO):**
```
Nutricionista ajusta segunda-feira → Opção de aplicar a semana toda
```

**Impacto:**
- Nutricionista precisa editar 7 vezes
- Violação de UX (falta de eficiência)
- Reduz produtividade

**Ação:** Adicionar botão "Aplicar a Semana" ou "Replicar Padrão"

---

## 🔧 Plano de Correção

### Fase 1: Auditoria de Dados (SQL)

```sql
-- 1. Encontrar templates com < 7 dias
SELECT id, title, 
  (SELECT COUNT(DISTINCT day_of_week) FROM jsonb_array_elements(plan_snapshot->'days') AS d(day)) as day_count
FROM v3_diet_templates
WHERE active = true
HAVING day_count < 7;

-- 2. Encontrar templates sem imagens
SELECT id, title, plan_snapshot
FROM v3_diet_templates
WHERE active = true
AND plan_snapshot::text NOT LIKE '%imageUrl%';

-- 3. Encontrar refeições agrupadas (items com múltiplos nomes)
SELECT id, title, plan_snapshot
FROM v3_diet_templates
WHERE active = true
AND plan_snapshot::text LIKE '%Café com Leite com Pão%';

-- 4. Encontrar ovo em gramas
SELECT id, title, plan_snapshot
FROM v3_diet_templates
WHERE active = true
AND plan_snapshot::text LIKE '%150%ovo%' OR plan_snapshot::text LIKE '%ovo%150%';
```

### Fase 2: Correção de Dados

1. **Remover/Corrigir templates com < 7 dias**
2. **Desagrupar refeições em items individuais**
3. **Converter ovo para unidades**
4. **Adicionar imagens**
5. **Corrigir portion_labels**

### Fase 3: Correção de Código

1. **Persistência de contexto de edição**
2. **Botão "Aplicar a Semana"**
3. **Validação de estrutura de template**

---

## ✅ Checklist de Validação

- [ ] Todos os templates têm 7 dias
- [ ] Todos os templates têm imagens
- [ ] Refeições estão desagrupadas em items
- [ ] Ovo está em unidades (não gramas)
- [ ] Arroz tem portion_label correto
- [ ] Contexto de edição é persistido
- [ ] Botão "Aplicar a Semana" funciona
- [ ] Testes passam

---

## 📊 Impacto

| Problema | Severidade | Impacto Clínico | Impacto UX |
|----------|-----------|-----------------|-----------|
| 1 dia | 🔴 CRÍTICA | Alto | Alto |
| Sem imagem | 🟠 ALTA | Médio | Alto |
| Refeições agrupadas | 🔴 CRÍTICA | Alto | Alto |
| Ovo em gramas | 🔴 CRÍTICA | Alto | Alto |
| Arroz em colheres | 🟠 ALTA | Médio | Alto |
| Redirecionamento | 🟠 ALTA | Baixo | Alto |
| Sem sincronização | 🟠 ALTA | Médio | Alto |

---

**Status:** 🔴 CRÍTICO — Aguardando ação imediata
