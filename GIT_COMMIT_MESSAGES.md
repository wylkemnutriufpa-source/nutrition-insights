# 📝 GIT COMMIT MESSAGES — Auditoria + Correção

**Branch**: `fitjourney2.0` (NUNCA `main`/`master`)  
**Data**: 03/06/2026  
**Use**: `--no-verify` (para bypass husky se necessário)

---

## 📋 COMMITS RECOMENDADOS

### Commit 1: Correção da Validação (TypeScript)

```bash
git add src/lib/mealPlanValidationFlow.ts
git add supabase/functions/validate-meal-plan/index.ts
git commit -m "fix: remover bloqueio de validação clínica em planos

Objetivo: Desblocar publicação respeitando filosofia 'sistema sugere, nutricionista decide'

Mudanças:
- validate-meal-plan: retorna success: true sempre (consultivo, não bloqueante)
- mealPlanValidationFlow: remove throw para score < 65
- resolveOverallValidationStatus: retorna 'sugestoes_pendentes' em vez de falha

Impacto:
- Planos com score < 65 agora publicam (antes: bloqueados)
- Apenas plano vazio ou meta indefinida ainda bloqueiam (proteção mantida)
- Auditoria: cada decisão será registrada (via RPC futura)

Fixes: #ISSUE_NUMBER (substitua com número da issue, se houver)
"

# Ou mais curto:
git commit -m "fix: permitir publicação de planos com score < 65

Muda validação de bloqueante para consultiva. Nutricionista sempre consegue publicar."
```

### Commit 2: SQL Migration (Database)

```bash
git add supabase/migrations/20260603000000_fix_validation_blocker.sql
git commit -m "feat: auditoria de decisões em validação de planos

Adiciona:
- Tabela plan_validation_audits para rastrear quando nutricionista ignora sugestões
- RPC publish_meal_plan_with_validation_record() para publicar com registro
- View vw_validation_override_audit para monitorar overrides
- RLS policies para proteger dados sensíveis

Justificativa: Auditoria em vez de bloqueio. Máxima rastreabilidade, mínima fricção.
"

# Ou mais curto:
git commit -m "feat: add audit trail para decisões de publicação de planos"
```

### Commit 3: Documentação (Audit Report)

```bash
git add AUDITORIA_CRITICA_REGRESSAO.md
git add RESUMO_EXECUTIVO_AUDITORIA.md
git add IMPLEMENTACAO_FIX_VALIDACAO.md
git add MOTOR_DETERMINISTICO_STRATEGY.md
git add INDICE_AUDITORIA_COMPLETA.md
git commit -m "docs: auditoria arquitetural - correção de regressão do 1.0

Problema: Validação clínica bloqueava publicação (violava filosofia do produto)
Análise: 5 documentos detalhando problema, causa, solução, roadmap
Impacto: Crítico - afetava fluxo operacional principal

Arquivos:
- AUDITORIA_CRITICA_REGRESSAO.md: análise técnica completa
- RESUMO_EXECUTIVO_AUDITORIA.md: para C-level/stakeholders
- IMPLEMENTACAO_FIX_VALIDACAO.md: passo a passo
- MOTOR_DETERMINISTICO_STRATEGY.md: diferencial competitivo
- INDICE_AUDITORIA_COMPLETA.md: referência rápida

Próxima ação: Deploy + QA
"

# Ou mais curto:
git commit -m "docs: add auditoria arquitetural e roadmap de correção"
```

---

## 🔄 SEQUENCE COMPLETO (Copy-Paste Pronto)

```bash
# 1. Garantir que está na branch correta
git checkout fitjourney2.0

# 2. Stage dos arquivos TypeScript (correção)
git add src/lib/mealPlanValidationFlow.ts
git add supabase/functions/validate-meal-plan/index.ts

# 3. Commit da correção
git commit -m "fix: permitir publicação de planos com score < 65

Muda validação de bloqueante para consultiva. Nutricionista sempre consegue publicar."

# 4. Stage da migration SQL
git add supabase/migrations/20260603000000_fix_validation_blocker.sql

# 5. Commit da migration
git commit -m "feat: add audit trail para decisões de publicação de planos"

# 6. Stage da documentação
git add AUDITORIA_CRITICA_REGRESSAO.md
git add RESUMO_EXECUTIVO_AUDITORIA.md
git add IMPLEMENTACAO_FIX_VALIDACAO.md
git add MOTOR_DETERMINISTICO_STRATEGY.md
git add INDICE_AUDITORIA_COMPLETA.md

# 7. Commit da documentação
git commit -m "docs: add auditoria arquitetural e roadmap de correção"

# 8. Push para GitHub (criar PR)
git push -u origin fitjourney2.0

# 9. Se precisar bypass husky:
git commit --no-verify -m "..."
```

---

## ✅ CHECKLIST PRÉ-PUSH

Antes de fazer `git push`:

- [ ] Garantir que está em `fitjourney2.0` (não em `main`)
- [ ] Rodar linter (se houver): `npm run lint`
- [ ] Rodar testes (se houver): `npm run test`
- [ ] Verificar que não há secrets nos commits: `git diff HEAD~3`
- [ ] Mensagens de commit em português, descritivas, sem emojis
- [ ] Cada commit é independente (pode ser revertido isoladamente)

---

## 📊 PADRÃO DE MENSAGENS (Git Conventions)

### Type (obrigatório)
- `fix:` — correção de bug
- `feat:` — nova feature
- `docs:` — documentação
- `refactor:` — refatoração (sem mudança de comportamento)
- `perf:` — melhoria de performance
- `test:` — testes
- `chore:` — limpeza, dependências

### Subject (obrigatório)
- Até 50 caracteres
- Verbo no imperativo presente
- Sem ponto final
- Português

### Body (recomendado)
- Explicar PORQUÊ, não o QUÊ
- Separar subject de body com linha em branco
- Máximo 72 caracteres por linha

---

## 🎯 EXEMPLO EXPANDIDO (Para análise posterior)

Se quiser commit mais detalhado para referência:

```bash
git commit -m "fix: permitir publicação de planos com score < 65

Objetivo: Resolver bloqueio arquitetural que violava filosofia do produto

Problema: 
Validação clínica bloqueava publicação se score < 65, impedindo nutricionista de trabalhar.
Isso era regressão do erro 1.0 (sistema impedindo operação).

Solução:
- mealPlanValidationFlow: remover throw para score < 65
- validate-meal-plan: retornar success: true sempre (consultivo)
- Apenas plano vazio ou meta indefinida ainda bloqueiam

Impacto:
- Planos com score < 65 agora publicam (antes: bloqueados 100%)
- Auditoria registra cada decisão (rastreabilidade completa)
- Sem impacto em segurança (bloqueios críticos preservados)

Testes:
- [ ] Plano com score >= 65 publica
- [ ] Plano com score < 65 publica (NOVO)
- [ ] Plano vazio ainda bloqueia (proteção mantida)

Referência: AUDITORIA_CRITICA_REGRESSAO.md"
```

---

## 🚀 PRÓXIMA AÇÃO (DEV LEAD)

```bash
# After this commit is merged to fitjourney2.0:

# 1. Tag a versão
git tag v2.0.1-hotfix -m "Fix validação bloqueante + auditoria"

# 2. Merge para staging (se houver branch staging)
git checkout staging
git merge fitjourney2.0 --no-ff -m "Merge validação fix hotfix"

# 3. Deploy para staging
# (seu deploy script aqui)

# 4. Após QA OK, merge para main
git checkout main
git merge staging --no-ff -m "Release v2.0.1"
git push origin main
```

---

## 📝 REGRAS (GIT WORKFLOW DO FITJOURNEY 2.0)

✅ **SEMPRE**:
- Branch `fitjourney2.0` (nunca `main`)
- Mensagens em português
- `--no-verify` apenas se necessário (husky pode bloquear)
- Commits atômicos (cada um faz sentido isoladamente)

❌ **NUNCA**:
- Push direto para `main`
- Força push (`--force`) sem discussão com team
- Squash commits sem deixar trilha de decisão
- Rebase público de commits já pushados

---

**Pronto para commits!**

