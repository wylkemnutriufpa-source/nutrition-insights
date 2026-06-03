# ✅ CHECKLIST EXECUTIVO — Auditoria + Implementação

**Data**: 03/06/2026  
**Status**: Pronto para implementar  
**Tempo estimado**: 20 minutos (código) + 10 minutos (testes)

---

## 📋 FASE 1: LEITURA & APROVAÇÃO (5 min)

- [ ] Ler LEIA_AGORA.md (2 min)
- [ ] Ler RESUMO_EXECUTIVO_AUDITORIA.md (3 min)
- [ ] ✅ Entender problema + solução
- [ ] ✅ Aprovado para implementação

---

## 🔧 FASE 2: IMPLEMENTAÇÃO TÉCNICA (15 min)

### 2.1 Executar SQL Migration (2 min)

**Arquivo**: `supabase/migrations/20260603000000_fix_validation_blocker.sql`

**Passos**:
- [ ] Abrir Supabase console (dashboard.supabase.com)
- [ ] Ir para "SQL Editor"
- [ ] Copiar TODO o conteúdo do arquivo
- [ ] Colar no editor
- [ ] Clique "Run"
- [ ] ✅ Verificar que criou tabela, RPC, view

**Validação**:
```sql
-- Copiar e executar para verificar:
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name = 'plan_validation_audits';
-- Deve retornar: 1
```

### 2.2 Revisar Código TypeScript (5 min)

**Arquivos**:
1. `src/lib/mealPlanValidationFlow.ts`
2. `supabase/functions/validate-meal-plan/index.ts`

**Checklist**:
- [ ] Arquivo 1: Linha ~95-120 — verificar função `runValidateAndFixMealPlan`
  - [ ] Deve ter comentário sobre "filosofia"
  - [ ] Não deve ter `throw` para score < 65
  - [ ] Deve retornar `success: true` sempre

- [ ] Arquivo 2: Linha ~280-300 — verificar retorno
  - [ ] `success: true` (sempre)
  - [ ] `validation_passed: overallScore >= 65`
  - [ ] `can_force_publish: true`
  - [ ] `overall_status: "sugestoes_pendentes"` para score < 65

**Validação**:
```bash
# Verificar sintaxe TypeScript:
npx tsc --noEmit src/lib/mealPlanValidationFlow.ts
# Sem erros? ✅ OK
```

### 2.3 Preparar Deploy (3 min)

- [ ] Criar branch: `git checkout -b fitjourney2.0`
- [ ] Stage arquivos: `git add src/lib/mealPlanValidationFlow.ts supabase/functions/validate-meal-plan/index.ts supabase/migrations/20260603000000_fix_validation_blocker.sql`
- [ ] Commit: `git commit -m "fix: permitir publicação de planos com score < 65"`
- [ ] Push: `git push -u origin fitjourney2.0`
- [ ] ✅ Criar PR no GitHub (tipo: "Fix" ou "Hotfix")

---

## 🧪 FASE 3: TESTES (10 min)

### 3.1 Teste Básico: Plano com Score < 65

**Cenário**:
1. [ ] Login como nutricionista
2. [ ] Ir para paciente
3. [ ] Gerar plano (qualquer template)
4. [ ] Tentar publicar

**Resultado Esperado**:
- [ ] ✅ Plano publica SEM erro "regras clínicas obrigatórias"
- [ ] ✅ Sem bloqueio de tela
- [ ] ✅ Pode continuar navegando

**Teste Falha Se**:
- ❌ Ainda aparecer erro "não passou nas regras"
- ❌ Tela fica travada
- ❌ Botão de publicar não funciona

### 3.2 Teste: Plano Vazio Ainda Bloqueia

**Cenário**:
1. [ ] Criar plano VAZIO (sem refeições)
2. [ ] Tentar publicar

**Resultado Esperado**:
- [ ] ✅ Erro "Plano vazio — adicione refeições"
- [ ] ✅ SIM, deve bloquear (proteção crítica)

**Teste Falha Se**:
- ❌ Plano vazio publica sem erro

### 3.3 Teste: Meta Indefinida Ainda Bloqueia

**Cenário**:
1. [ ] Paciente sem anamnese completa (meta indefinida)
2. [ ] Tentar publicar plano

**Resultado Esperado**:
- [ ] ✅ Erro "Complete a Anamnese ou Avaliação"
- [ ] ✅ SIM, deve bloquear (proteção crítica)

**Teste Falha Se**:
- ❌ Publica sem meta definida

### 3.4 Teste: Auditoria Funciona

**Cenário**:
1. [ ] Publicar plano com score < 65
2. [ ] Verificar auditoria no banco

**SQL**:
```sql
SELECT * FROM public.plan_validation_audits 
WHERE published = true 
ORDER BY created_at DESC 
LIMIT 1;
```

**Resultado Esperado**:
- [ ] ✅ Uma linha retornada
- [ ] ✅ `ignored_suggestions = true` (pois score < 65)
- [ ] ✅ `validation_score` = valor real

**Teste Falha Se**:
- ❌ Nenhuma linha retornada
- ❌ `ignored_suggestions = false`

### 3.5 Teste: RLS Protege Dados

**Cenário** (como nutricionista A):
```sql
SELECT * FROM public.plan_validation_audits;
```

**Resultado Esperado**:
- [ ] ✅ Vê apenas seus próprios dados
- [ ] ✅ Não vê dados de nutricionista B

**Teste Falha Se**:
- ❌ Vê dados de outros nutricionistas

---

## 📊 FASE 4: VALIDAÇÃO FINAL (2 min)

**Checklist de Qualidade**:

- [ ] ✅ Código compila sem erros
- [ ] ✅ Testes manuais passam (3.1-3.5 acima)
- [ ] ✅ SQL executa sem erros
- [ ] ✅ RLS protege dados
- [ ] ✅ Auditoria registra decisões
- [ ] ✅ Proteções críticas funcionam (vazio, meta)
- [ ] ✅ Sem regressão em outras features

---

## 📈 FASE 5: COMUNICAÇÃO (3 min)

- [ ] Notificar team no Slack:
```
🚀 FIX IMPLEMENTADO: Validação de planos agora consultiva

✅ Planos com score < 65 publicam (antes: bloqueados)
✅ Auditoria rastreia cada decisão
✅ Bloqueios críticos mantidos (vazio, meta)

Status: Testado e pronto para produção
Próximo: Deploy em prod após OK final
```

- [ ] Criar issue em GitHub com link para docs
- [ ] Notificar stakeholders (veja RESUMO_EXECUTIVO_AUDITORIA.md)

---

## 🚀 FASE 6: DEPLOY (Após Aprovação Final)

**Checklist Pre-Deploy**:
- [ ] ✅ Code review aprovado
- [ ] ✅ Testes QA passam
- [ ] ✅ Sem secrets em commits
- [ ] ✅ Branch fitjourney2.0 limpo
- [ ] ✅ SQL migration testada em staging

**Deploy Steps**:
```bash
# 1. Merge PR na branch fitjourney2.0
# 2. Deploy para staging (seu script)
# 3. Fumaça testes em staging (5 min)
# 4. Merge fitjourney2.0 → main (se houver)
# 5. Deploy para produção
# 6. Monitorar por 30 min (logs, erros)
```

**Post-Deploy**:
- [ ] Monitorar `plan_validation_audits` por atividade
- [ ] Verificar que planos com score < 65 agora publicam
- [ ] Nenhum erro "regras clínicas obrigatórias"

---

## 📝 RASTREAMENTO

**Data Início**: 03/06/2026  
**Data Conclusão**: ____/____/______  
**Responsável**: ________________  

---

## 🎯 PRÓXIMAS AÇÕES (Após Implementação)

- [ ] **UI**: Exibir sugestões em painel (não erro)
- [ ] **UI**: Botão "Publicar mesmo assim"
- [ ] **Dashboard**: Monitorar taxa de override
- [ ] **Analytics**: Qual % de planos foi publicado com override?

---

## 📞 SUPORTE RÁPIDO

**Se algo quebrar**:

| Erro | Solução |
|------|---------|
| SQL não executa | Verificar Supabase console → Logs |
| Edge function com erro | `supabase functions list` → Debug |
| Teste falha | Limpar cache browser → Ctrl+Shift+Del |
| RLS bloqueia acesso | Verificar `get_user_tenant()` → Role |
| Auditoria não registra | Verificar se RPC foi chamado corretamente |

---

**STATUS FINAL**: ✅ PRONTO PARA IMPLEMENTAR

Tempo total estimado: **30-40 minutos**  
Risco: **Baixo** (mudança bem isolada + proteções mantidas)  
Impacto: **CRÍTICO** (resolve bloqueio operacional principal)

