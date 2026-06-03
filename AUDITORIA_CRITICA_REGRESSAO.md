# 🚨 AUDITORIA CRÍTICA — REGRESSÃO ARQUITETURAL FITJOURNEY 2.0

**Data**: 03/06/2026  
**Status**: ALERTA CRÍTICO  
**Risco**: ALTO (regressão do 1.0)  
**Severidade**: P1 — Bloqueia fluxo operacional principal

---

## 📋 SITUAÇÃO ATUAL

### O Erro Encontrado
```
"O plano não passou nas regras clínicas obrigatórias. Revise as refeições e tente novamente."
```

**Causa Root**: Edge function `validate-meal-plan` retorna `success: false` quando score < 65.  
Isso dispara erro bloqueante na UI, impedindo publicação.

---

## ⚠️ O PROBLEMA ARQUITETURAL

### Código que está bloqueando (validate-meal-plan/index.ts, linhas 280-300):

```typescript
return new Response(JSON.stringify({
    success: overallScore >= 65,  // ← AQUI: se < 65, falha
    score: overallScore,
    // ... outras métricas
}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
```

### Como funciona atualmente:

1. **Validação é executada** em `mealPlanValidationFlow.ts`
2. **Edge function retorna** `success: false` se score < 65
3. **No handler** (`finalizeGeneratedMealPlan.ts`):
   ```typescript
   if (validationResult.success) {
     return { kind: "validated", validationResult };
   }
   // ← Aqui já falha se não passou
   ```
4. **Na UI** — usuário vê erro bloqueante e NÃO consegue salvar/publicar

---

## 🔴 VIOLAÇÃO CLARA DA FILOSOFIA DO PRODUTO

### O que foi definido:
> "O sistema sugere. O nutricionista decide."
> 
> O sistema pode alertar.  
> O sistema **não deve impedir**.

### O que está acontecendo:
❌ Sistema está impedindo (bloqueando publicação)  
❌ Não há opção de "forçar publicação com advertência"  
❌ Nutricionista não consegue ignorar o bloqueio  
❌ Validação obrigatória = burocracia invisível

---

## 📊 COMPARAÇÃO: 1.0 vs 2.0 vs ATUAL

| Aspecto | 1.0 (Errado) | 2.0 (Proposto) | 2.0 (ATUAL) |
|---------|------------|----------------|-----------|
| Validação obrigatória | ✅ Tinha | ❌ Não deveria ter | ❌ **TEM** |
| Bloqueia publicação | ✅ Sim | ❌ Não | ❌ **SIM** |
| Nutricionista pode forçar | ❌ Não | ✅ Sim | ❌ **NÃO** |
| Alerta + Sugestão | ❌ Não | ✅ Sim | ❌ **Apenas bloqueio** |
| UX: invisível ao usuário | ❌ Não | ✅ Sim | ❌ **Muito visível** |

---

## 🎯 IMPACTO OPERACIONAL

### Cenário Real:
1. Nutricionista recebe paciente
2. Faz anamnese
3. Gera plano automático
4. Tenta publicar para paciente
5. **ERRO: "não passou nas regras"**
6. Nutricionista fica preso — não consegue sair dessa tela
7. Precisa:
   - Entender que score < 65 (mensagem não explica)
   - Ajustar cada item até score > 65
   - Não tem clareza QUAL item tem problema
   - Pode levar 30+ minutos

**Resultado**: Fluxo operacional travado. Exatamente como era no 1.0.

---

## 📝 IDENTIFICAÇÃO DE PROBLEMAS

### Problema 1: Validação Obrigatória Bloqueante ⚠️

**Arquivo**: `supabase/functions/validate-meal-plan/index.ts`  
**Linhas**: ~280-300  
**Problema**: `success` é binário — passa ou falha, sem meio termo

**Impacto**: Nutricionista fica preso se score < 65

---

### Problema 2: Sem Contexto para o Erro ⚠️

**UI apresenta**: `"O plano não passou nas regras clínicas obrigatórias"`  
**Nutricionista vê**: Mensagem vaga, sem dizer ONDE está o problema  
**Deveria exibir**:
- ✅ Score: 58/100
- ✅ Razão #1: Calorias fora de meta (1800 vs 2000 kcal)
- ✅ Razão #2: Refeição matinal com 5+ itens
- ✅ Ação: "Clique aqui para ignorar e publicar mesmo assim"

---

### Problema 3: Sem Opção de Override ⚠️

**Código atual**: Se `success: false`, para tudo  
**Deveria ter**: Botão "Publicar mesmo assim - Nutricionista decide"

**Arquitetura esperada**:
```
Validação retorna:
{
  success: false,
  score: 58,
  issues: [...],
  can_force_publish: true  // ← NOVO: permite override
}

UI mostra:
[ ] Avisos importantes
[ ] Botão "Corrigir agora"
[ ] Botão "Publicar mesmo assim" (com warning)
```

---

### Problema 4: Fluxo Não Está Invisível ⚠️

**O que foi especificado**: "Se existir versionamento, deve ser invisível"

**O que está acontecendo**: Nutricionista vê bloqueio de publicação (não é invisível!)

---

## 🛠️ COMO CORRIGIR

### PASSO 1: Mudar a semântica de "sucesso"

**ANTES**:
```typescript
success: overallScore >= 65  // Binário: passa ou falha
```

**DEPOIS**:
```typescript
{
  success: true,  // Sempre retorna sucesso (validação completou)
  validation_passed: overallScore >= 65,  // Resultado da validação
  can_proceed: true,  // Nutricionista SEMPRE pode prosseguir
  score: overallScore,
  recommendations: [...],  // Sugestões, não bloqueios
}
```

---

### PASSO 2: Mudar a lógica em `mealPlanValidationFlow.ts`

**ANTES**:
```typescript
if (validationResult.success) {
  return { kind: "validated", validationResult };
}
// ← Falha se score < 65
```

**DEPOIS**:
```typescript
// Validação SEMPRE completa. Retorna score + sugestões.
// Nutricionista decide se quer fazer ajustes ou publicar mesmo assim.

return {
  kind: "validated",
  validationResult,
  can_force_publish: true,  // ← NOVO
};
```

---

### PASSO 3: UI mostra sugestões, não bloqueios

**ANTES**: Erro bloqueante  
**DEPOIS**: Panel de sugestões + 2 botões

```
┌─────────────────────────────────────────┐
│ ⚠️ Sugestões do Sistema                 │
├─────────────────────────────────────────┤
│ Score: 58/100                           │
│                                         │
│ 🔴 Calorias: 1800 kcal (alvo: 2000)   │
│    → Adicionar 200 kcal em carbos      │
│                                         │
│ 🟡 Refeição 1: 5 itens (máx: 5)        │
│    → Combinar 2 itens similares        │
│                                         │
│ [Fazer Ajustes] [Publicar Mesmo Assim]│
└─────────────────────────────────────────┘
```

---

### PASSO 4: Criar RPC que permite publicação com override

```sql
-- Tabela de audit: rastrear quando nutricionista ignorou sugestões
CREATE TABLE IF NOT EXISTS plan_publication_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES meal_plans(id),
  nutritionist_id uuid NOT NULL,
  validation_score numeric,
  reason_for_override text,
  published_at timestamptz DEFAULT now()
);

-- RPC que publica mesmo com score baixo
CREATE OR REPLACE FUNCTION publish_meal_plan_with_override(
  p_plan_id uuid,
  p_nutritionist_id uuid,
  p_validation_score numeric
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Rastrear decisão do nutricionista
  INSERT INTO plan_publication_overrides 
  (meal_plan_id, nutritionist_id, validation_score)
  VALUES (p_plan_id, p_nutritionist_id, p_validation_score);
  
  -- 2. Publicar plano
  UPDATE meal_plans
  SET status = 'published', published_at = now()
  WHERE id = p_plan_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Plano publicado com sucesso'
  );
END;
$$;
```

---

## 🎯 RECOMENDAÇÕES FINAIS

### IMEDIATO (Hoje):
1. ✅ Mudar `validate-meal-plan` para **nunca retornar erro bloqueante**
2. ✅ Sempre retornar `success: true` + `validation_passed: boolean`
3. ✅ Remover as mensagens de erro; substituir por recomendações

### CURTO PRAZO (Esta semana):
4. ✅ Atualizar UI para mostrar sugestões em painel, não erro
5. ✅ Adicionar botão "Publicar mesmo assim"
6. ✅ Criar RPC `publish_meal_plan_with_override()`

### MÉDIO PRAZO (Esta sprint):
7. ✅ Adicionar contexto: "Por que o score é 58?"
8. ✅ Sugestões específicas: "Adicionar 200 kcal aqui"
9. ✅ Auditoria: rastrear quando nutricionista ignora sugestões

---

## 📚 FILOSOFIA PARA LEMBRAR

> **"O sistema sugere. O nutricionista decide."**

### O que muda:

| Antes | Depois |
|-------|--------|
| Sistema bloqueia | Sistema aconselha |
| Usuário fica preso | Usuário tem opção |
| Erro genérico | Feedback específico |
| Sem contexto | Com sugestões actionáveis |
| Burocracia | Velocidade |

---

## 🔐 CONCLUSÃO

A arquitetura 2.0 tem **boas intenções** (validação clínica), mas está sendo implementada com **semântica errada** (bloqueio em vez de alerta).

Isso é regressão clara do 1.0.

**Ação Urgente**: Mudar a validação de **bloqueante** para **consultiva**.

---

**Próximo Passo**: Implementar correções acima. Começar pelo PASSO 1 (mudar semântica em validate-meal-plan).

