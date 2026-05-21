# ✅ Checklist de Blindagem do Sistema

## 📖 Leitura Obrigatória

- [ ] `BLINDAGEM_SISTEMA_RESUMO.md` - Entender o problema e solução (5 min)
- [ ] `DEFENSE_IN_DEPTH.md` - Entender as 3 camadas (15 min)
- [ ] `DEFENSE_QUICK_START.md` - Aprender como usar (10 min)

**Total**: 30 minutos para todo o time estar alinhado

---

## 🏗️ FASE 1: Database Contracts (Semana 1)

### Migrações SQL

- [ ] Criar `db/migrations/001_initial_schema.sql`
  - [ ] Tabela `meal_plans` com constraints
  - [ ] Tabela `meals` com FK para meal_plans
  - [ ] Tabela `meal_items` com FK para meals
  - [ ] Tabela `meal_item_completions` com FK
  - [ ] Indexes em colunas de filtro

- [ ] Criar `db/migrations/002_add_constraints.sql`
  - [ ] ON DELETE CASCADE para relacionamentos
  - [ ] CHECK constraints para enums
  - [ ] UNIQUE constraints onde necessário

- [ ] Criar `db/migrations/003_add_audit_tables.sql`
  - [ ] Tabela `audit_log`
  - [ ] Triggers para popular audit_log

### Testes

- [ ] Testar que FK funciona
- [ ] Testar que CASCADE delete funciona
- [ ] Testar que CHECK constraint funciona
- [ ] Testar que UNIQUE constraint funciona

**Responsável**: DBA / Backend Lead
**Deadline**: Fim da Semana 1

---

## 🔐 FASE 2: API Contracts (Semana 2)

### Validação em Endpoints Críticos

#### 1. Criar Plano de Refeição
- [ ] Usar `MealPlanCreateSchema` ✅ (já existe)
- [ ] Validar permissões (nutricionista → paciente)
- [ ] Usar `withTransaction()`
- [ ] Arquivo: `src/lib/api/mealPlanService.ts` ✅ (já existe)
- [ ] Testes: `src/__tests__/e2e/mealPlanFlow.test.ts` ✅ (já existe)

#### 2. Publicar Plano
- [ ] Validar snapshot V3
- [ ] Usar `withSequentialTransaction()`
- [ ] Notificar paciente (não-crítico)
- [ ] Arquivo: `src/lib/api/mealPlanService.ts` ✅ (já existe)

#### 3. Adicionar Alimento ao Plano
- [ ] Criar `FoodItemSchema` ✅ (já existe)
- [ ] Criar `src/lib/api/foodService.ts`
- [ ] Validar que alimento existe
- [ ] Validar macros (não podem ser 0)
- [ ] Usar `withTransaction()`

#### 4. Criar Substituição
- [ ] Criar `SubstitutionCreateSchema` ✅ (já existe)
- [ ] Criar `src/lib/api/substitutionService.ts`
- [ ] Validar que item existe no plano
- [ ] Validar macros do substituto
- [ ] Usar `withTransaction()`

#### 5. Registrar Aderência
- [ ] Criar `MealCompletionSchema` ✅ (já existe)
- [ ] Criar `src/lib/api/adherenceService.ts`
- [ ] Validar que data não é futura
- [ ] Usar `withTransaction()`

### Testes

- [ ] Testar validação com dados válidos
- [ ] Testar validação com dados inválidos
- [ ] Testar mensagens de erro claras
- [ ] Testar logging de auditoria

**Responsável**: Backend Team
**Deadline**: Fim da Semana 2

---

## 💾 FASE 3: Client State Isolation (Semana 3)

### Refatorar Stores

#### 1. Meal Plan Store
- [ ] Criar `src/stores/mealPlanStore.ts`
- [ ] Usar Zustand + Immer
- [ ] Adicionar validação em cada ação
- [ ] Implementar optimistic updates
- [ ] Implementar rollback em erro

#### 2. Editor V3 Store
- [ ] Refatorar `src/features/editor-v3/hooks/useEditorState.ts`
- [ ] Validar snapshot ao salvar
- [ ] Implementar rollback em erro

#### 3. Patient Store
- [ ] Criar `src/stores/patientStore.ts`
- [ ] Validar dados do paciente
- [ ] Sincronizar com servidor

### Testes

- [ ] Testar que optimistic updates funcionam
- [ ] Testar que rollback funciona
- [ ] Testar que sincronização funciona
- [ ] Testar que estado fica consistente

**Responsável**: Frontend Team
**Deadline**: Fim da Semana 3

---

## 🧪 FASE 4: Integration & Testing (Semana 4)

### E2E Tests

- [ ] Criar `src/__tests__/e2e/mealPlanFlow.test.ts` ✅ (já existe)
- [ ] Criar `src/__tests__/e2e/foodFlow.test.ts`
- [ ] Criar `src/__tests__/e2e/transactionRollback.test.ts`
- [ ] Criar `src/__tests__/e2e/concurrency.test.ts`

### Monitoramento

- [ ] Criar dashboard de erros
- [ ] Criar alertas para taxa de erro > 5%
- [ ] Criar alertas para transação falhar 3x
- [ ] Testar que alertas funcionam

### Documentação

- [ ] Atualizar README com arquitetura
- [ ] Criar guia "Como Adicionar Nova Operação"
- [ ] Criar guia "Como Debugar Erro"
- [ ] Criar runbooks de recovery

**Responsável**: QA + DevOps + Tech Lead
**Deadline**: Fim da Semana 4

---

## 📊 Métricas de Sucesso

### Antes da Blindagem
- ❌ Ciclos de conserto em cascata frequentes
- ❌ Dados inconsistentes no banco
- ❌ Erros não-claros para usuário
- ❌ Sem auditoria de operações

### Depois da Blindagem
- ✅ 0 ciclos de conserto em cascata por 2 semanas
- ✅ 100% de operações críticas com validação
- ✅ 100% de operações críticas com transação
- ✅ Taxa de erro < 1%
- ✅ MTTR (Mean Time To Recovery) < 5 min
- ✅ Auditoria completa de todas as operações

---

## 🚨 Sinais de Alerta

Se você ver isso, a blindagem não está funcionando:

- 🔴 Dados inconsistentes no banco (plano sem refeições)
- 🔴 Erro "Transaction failed" sem retry
- 🔴 Validação não rejeitando dados inválidos
- 🔴 Sem logs de auditoria
- 🔴 Ciclo de consertos em cascata

**Ação**: Verificar que todas as fases foram implementadas

---

## 📋 Checklist Diário

### Para Desenvolvedores

- [ ] Toda nova operação tem schema Zod?
- [ ] Toda nova operação usa `validateRequest()`?
- [ ] Toda operação crítica usa `withTransaction()`?
- [ ] Todos os erros são logados?
- [ ] Testes E2E passam?

### Para QA

- [ ] Testou dados válidos?
- [ ] Testou dados inválidos?
- [ ] Testou erro de transação?
- [ ] Testou acesso negado?
- [ ] Verificou logs de auditoria?

### Para DevOps

- [ ] Monitoramento está ativo?
- [ ] Alertas estão configurados?
- [ ] Logs estão sendo coletados?
- [ ] Dashboard está atualizado?

---

## 🎯 Próximas Ações

### Hoje
- [ ] Ler `BLINDAGEM_SISTEMA_RESUMO.md`
- [ ] Ler `DEFENSE_IN_DEPTH.md`
- [ ] Reunião de alinhamento (30 min)

### Esta Semana
- [ ] Começar Fase 1 (Database Contracts)
- [ ] Criar migrações SQL
- [ ] Testar constraints

### Próxima Semana
- [ ] Começar Fase 2 (API Contracts)
- [ ] Implementar validação em endpoints
- [ ] Testar validação

### Semanas 3-4
- [ ] Fase 3 (Client State)
- [ ] Fase 4 (Integration & Testing)

---

## 📞 Suporte

### Dúvidas sobre Arquitetura?
→ Ler `DEFENSE_IN_DEPTH.md`

### Dúvidas sobre Implementação?
→ Ler `DEFENSE_QUICK_START.md`

### Dúvidas sobre Roadmap?
→ Ler `IMPLEMENTATION_ROADMAP.md`

### Dúvidas sobre Código?
→ Ver `src/lib/api/mealPlanService.ts`

### Dúvidas sobre Testes?
→ Ver `src/__tests__/e2e/mealPlanFlow.test.ts`

---

## ✨ Conclusão

Você tem tudo que precisa para blindar o sistema:

✅ Arquitetura clara (3 camadas)
✅ Código de exemplo (mealPlanService)
✅ Testes de exemplo (mealPlanFlow)
✅ Documentação completa
✅ Roadmap de 4 semanas

**Próximo passo**: Começar Fase 1 (Database Contracts)

**Boa sorte! 🚀**
