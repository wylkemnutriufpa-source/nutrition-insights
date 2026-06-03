# 🔧 IMPLEMENTAÇÃO: FIX VALIDAÇÃO DE PLANOS

**Objetivo**: Desblocar publicação de planos respeitando a filosofia "O sistema sugere. O nutricionista decide."

**Status**: PRONTO PARA IMPLEMENTAR

---

## 📋 O QUE FOI CORRIGIDO

### Problema
Edge function `validate-meal-plan` retornava `success: false` quando score < 65, bloqueando publicação completamente.

### Solução
Mudança de semântica:
- **Antes**: `success = true/false` (bloqueante)
- **Depois**: `success = true` (sempre), `validation_passed = true/false` (consultivo)

---

## 🚀 PASSO A PASSO DE IMPLEMENTAÇÃO

### ETAPA 1: Deploy das correções TypeScript (5 min)

**Arquivos modificados**:
1. ✅ `supabase/functions/validate-meal-plan/index.ts`
   - Mudou retorno para sempre `success: true`
   - Adicionou `validation_passed`, `can_force_publish`, `overall_status`, `recommendations`

2. ✅ `src/lib/mealPlanValidationFlow.ts`
   - Removeu bloqueio para score < 65
   - Adicionou comentários sobre filosofia do produto
   - Alterou `resolveOverallValidationStatus()` para retornar status consultivo

**Ação**: Salve os arquivos (já feito via Kiro)

---

### ETAPA 2: Executar SQL de Auditoria (2 min)

**Arquivo**: `supabase/migrations/20260603000000_fix_validation_blocker.sql`

**O que faz**:
- Cria tabela `plan_validation_audits` para rastrear decisões
- Cria RPC `publish_meal_plan_with_validation_record()` 
- Cria view para dashboard de overrides
- Configura RLS

**Como executar** (no Supabase console):
```bash
# Copie TODO o conteúdo de 20260603000000_fix_validation_blocker.sql
# Cole no SQL editor do Supabase
# Clique "Run"
```

---

### ETAPA 3: Atualizar UI (10-15 min) — PRÓXIMO PASSO

A UI precisa ser modificada para:

❌ **Não fazer mais** (remove):
```typescript
// ANTES: Erro bloqueante
if (!validationResult.success) {
  throw new Error("O plano não passou nas regras clínicas obrigatórias");
}
```

✅ **Fazer agora** (novo comportamento):
```typescript
// DEPOIS: Exibir recomendações em painel
const { validation_passed, score, recommendations } = validationResult;

if (!validation_passed && recommendations?.length > 0) {
  // Mostrar sugestões em painel
  // Adicionar botão "Publicar mesmo assim"
} else {
  // Publicar normalmente
}
```

---

## 🎯 CENÁRIO DE TESTE IMEDIATO

### Testar a mudança (agora):

1. **Limpar cache** (dev):
   ```bash
   # Browser: Ctrl+Shift+Del → limpar cookies/sessão
   ```

2. **Voltar para o fluxo que falhou**:
   - Convite → Cadastro → Onboarding → Criar plano → Publicar

3. **Resultado esperado**:
   - ✅ Plano publica mesmo com score < 65
   - ✅ Sem erro "regras clínicas obrigatórias"
   - ⚠️ (por enquanto) Sem sugestões visuais (serão adicionadas na UI)

4. **Verificar auditoria**:
   ```sql
   SELECT * FROM public.plan_validation_audits 
   ORDER BY created_at DESC LIMIT 5;
   ```

---

## 📊 COMPARAÇÃO ANTES vs DEPOIS

| Fase | Comportamento | Bloqueio | UX |
|------|---------------|---------|-----|
| **ANTES** (1.0) | Sistema bloqueia se regra falha | ✅ Sim | ❌ Erro vago |
| **DURANTE** (2.0 atual) | Sistema bloqueia se score < 65 | ✅ Sim | ❌ "Regras clínicas obrigatórias" |
| **DEPOIS** (2.0 corrigido) | Sistema sugere, nutricionista decide | ❌ Não | ✅ Sugestões claras + botão override |

---

## 🔐 MUDANÇAS SEMÂNTICAS

### O que muda na resposta da API

**ANTES** (bloqueante):
```json
{
  "success": false,
  "score": 58,
  "errors": [...]
}
```

**DEPOIS** (consultivo):
```json
{
  "success": true,
  "validation_passed": false,
  "can_force_publish": true,
  "score": 58,
  "overall_status": "sugestoes_pendentes",
  "recommendations": [
    {
      "severity": "high",
      "message": "Calorias fora da meta: 1800 kcal (alvo 2000)"
    }
  ]
}
```

**Diferença chave**: 
- `success: true` = validação foi executada
- `validation_passed: false` = tem recomendações
- `can_force_publish: true` = nutricionista pode ignorar

---

## 📝 PRÓXIMOS PASSOS (PÓS-IMPLEMENTAÇÃO)

### Sprint Atual:
- [ ] Testar fluxo completo de publicação
- [ ] Verificar auditoria em `plan_validation_audits`
- [ ] Validar que planos com score < 65 agora publicam

### Próxima Sprint:
- [ ] Atualizar UI para exibir sugestões (não erros)
- [ ] Adicionar botão "Publicar mesmo assim" com modal de confirmação
- [ ] Mostrar score e breakdown (calorias, macros, etc.)
- [ ] Criar dashboard para monitorar overrides do time

### Backlog:
- [ ] Adicionar field `reason_for_override` na UI (opcional)
- [ ] Analytics: quantos planos foram publicados com override?
- [ ] Feature: sugestões específicas "Adicionar 200 kcal aqui"

---

## 🛡️ CHECKLIST DE VALIDAÇÃO

- [ ] Arquivos TypeScript modificados e salvos
- [ ] SQL executado no Supabase
- [ ] Tabela `plan_validation_audits` criada
- [ ] RPC `publish_meal_plan_with_validation_record` funciona
- [ ] Plano com score < 65 publica sem erro
- [ ] Auditoria registra decisão do nutricionista
- [ ] RLS permite admins/nutricionistas ver seus dados

---

## 🚨 ROLLBACK (se necessário)

Se precisar reverter:

```sql
-- Remover alterações
DROP FUNCTION IF EXISTS public.publish_meal_plan_with_validation_record();
DROP TABLE IF EXISTS public.plan_validation_audits;
DROP VIEW IF EXISTS public.vw_validation_override_audit;

-- Reverter código TypeScript para versão anterior
git checkout HEAD~1 -- src/lib/mealPlanValidationFlow.ts
git checkout HEAD~1 -- supabase/functions/validate-meal-plan/index.ts
```

---

## 📞 SUPORTE

Se algo quebrar:
1. Verificar logs da edge function: `supabase functions list`
2. Validar SQL no console do Supabase
3. Limpar cache do navegador
4. Testar em modo incógnito

---

**Última atualização**: 03/06/2026  
**Próximo review**: Após implementação da UI (sugestões visuais)

