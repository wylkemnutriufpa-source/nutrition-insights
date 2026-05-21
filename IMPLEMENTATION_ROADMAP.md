# 🚀 Roadmap de Implementação - Defense in Depth

## Status Atual

✅ **Criado**:
- `src/lib/validation/schemas.ts` - Schemas Zod para todas as operações
- `src/lib/validation/validateRequest.ts` - Middleware de validação
- `src/lib/safeTransaction.ts` - Wrapper de transações seguras
- `src/lib/api/mealPlanService.ts` - Exemplo de serviço com 3 camadas
- `DEFENSE_IN_DEPTH.md` - Documentação da arquitetura

---

## FASE 1: Foundation (Semana 1)

### 1.1 Database Contracts
**Objetivo**: Garantir integridade no nível do banco

- [ ] Criar `db/migrations/001_initial_schema.sql`
  - [ ] Definir todas as tabelas com tipos corretos
  - [ ] Adicionar constraints (FK, CHECK, UNIQUE)
  - [ ] Adicionar indexes estratégicos
  
- [ ] Criar `db/migrations/002_add_constraints.sql`
  - [ ] ON DELETE CASCADE para relacionamentos
  - [ ] ON DELETE SET NULL onde apropriado
  - [ ] Validações de negócio (ex: status válido)

- [ ] Criar `db/migrations/003_add_audit_tables.sql`
  - [ ] Tabela `audit_log` para rastrear mudanças
  - [ ] Triggers para popular audit_log automaticamente

**Checklist**:
- [ ] Todas as FKs têm ON DELETE definido
- [ ] Todas as enums têm CHECK constraints
- [ ] Indexes em colunas de filtro (patient_id, status, date)
- [ ] Testes de rollback funcionam

---

## FASE 2: API Contracts (Semana 2)

### 2.1 Validação em Endpoints
**Objetivo**: Validar TUDO que entra/sai

**Operações Críticas a Proteger**:

1. **Criar Plano de Refeição**
   - [ ] Usar `MealPlanCreateSchema`
   - [ ] Validar permissões (nutricionista → paciente)
   - [ ] Usar `withTransaction()`
   - [ ] Arquivo: `src/lib/api/mealPlanService.ts` ✅ (já criado)

2. **Publicar Plano**
   - [ ] Validar snapshot V3
   - [ ] Usar `withSequentialTransaction()`
   - [ ] Notificar paciente (não-crítico)
   - [ ] Arquivo: `src/lib/api/mealPlanService.ts` ✅ (já criado)

3. **Adicionar Alimento ao Plano**
   - [ ] Validar `FoodItemSchema`
   - [ ] Verificar se alimento existe na biblioteca
   - [ ] Validar macros (não podem ser 0)
   - [ ] Arquivo: `src/lib/api/foodService.ts` (a criar)

4. **Criar Substituição**
   - [ ] Validar `SubstitutionCreateSchema`
   - [ ] Verificar se item existe no plano
   - [ ] Validar macros do substituto
   - [ ] Arquivo: `src/lib/api/substitutionService.ts` (a criar)

5. **Registrar Aderência**
   - [ ] Validar `MealCompletionSchema`
   - [ ] Verificar se data não é futura
   - [ ] Arquivo: `src/lib/api/adherenceService.ts` (a criar)

**Implementação**:
```typescript
// Exemplo: src/lib/api/foodService.ts
export async function addFoodToMeal(
  mealId: string,
  data: unknown,
  userId: string
) {
  // CAMADA 2: Validar
  const validated = await validateRequest(
    FoodItemSchema,
    data,
    'AddFoodToMeal'
  );

  // CAMADA 1: Transação
  return withTransaction(
    async () => {
      // Verificar permissão
      // Verificar se alimento existe
      // Adicionar ao plano
      // Retornar resultado
    },
    'AddFoodToMeal'
  );
}
```

**Checklist**:
- [ ] Todos os endpoints validam entrada
- [ ] Todos os endpoints validam saída
- [ ] Mensagens de erro são claras
- [ ] Logging de auditoria em operações críticas

---

## FASE 3: Client State Isolation (Semana 3)

### 3.1 Refatorar Stores
**Objetivo**: Single source of truth com validação

**Stores a Refatorar**:

1. **Meal Plan Store**
   - [ ] Usar Zustand + Immer
   - [ ] Adicionar validação em cada ação
   - [ ] Implementar optimistic updates
   - [ ] Arquivo: `src/stores/mealPlanStore.ts` (a criar)

2. **Editor V3 Store**
   - [ ] Validar snapshot ao salvar
   - [ ] Rollback em erro
   - [ ] Arquivo: `src/features/editor-v3/hooks/useEditorState.ts` (refatorar)

3. **Patient Store**
   - [ ] Validar dados do paciente
   - [ ] Sincronizar com servidor
   - [ ] Arquivo: `src/stores/patientStore.ts` (a criar)

**Implementação**:
```typescript
// src/stores/mealPlanStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { validateRequestSync } from '@/lib/validation/validateRequest';

export const useMealPlanStore = create<MealPlanStore>()(
  immer((set, get) => ({
    plans: [],
    
    addMeal: (mealId: string) => set((state) => {
      // Validar antes de aplicar
      state.currentPlan?.meals.push({ id: mealId, items: [] });
    }),
    
    syncWithServer: async () => {
      const backup = JSON.parse(JSON.stringify(get().plans));
      try {
        const response = await api.sync(get().plans);
        const validated = validateRequestSync(
          MealPlanSnapshotV3Schema,
          response
        );
        set({ plans: validated });
      } catch (error) {
        set({ plans: backup }); // Rollback
        throw error;
      }
    },
  }))
);
```

**Checklist**:
- [ ] Todos os stores usam Zustand + Immer
- [ ] Todas as ações validam dados
- [ ] Optimistic updates funcionam
- [ ] Rollback funciona em erro

---

## FASE 4: Integration & Testing (Semana 4)

### 4.1 E2E Tests
**Objetivo**: Testar fluxos críticos end-to-end

**Testes a Criar**:

1. **Criar Plano → Publicar → Paciente Visualiza**
   - [ ] Arquivo: `src/__tests__/e2e/mealPlanFlow.test.ts`
   - [ ] Validar que plano aparece para paciente
   - [ ] Validar que macros estão corretos

2. **Adicionar Alimento → Substituir → Aderência**
   - [ ] Arquivo: `src/__tests__/e2e/foodFlow.test.ts`
   - [ ] Validar que substituição funciona
   - [ ] Validar que aderência é registrada

3. **Erro em Transação → Rollback**
   - [ ] Arquivo: `src/__tests__/e2e/transactionRollback.test.ts`
   - [ ] Simular erro no meio da transação
   - [ ] Validar que tudo foi revertido

**Implementação**:
```typescript
// src/__tests__/e2e/mealPlanFlow.test.ts
describe('Meal Plan Flow', () => {
  it('should create, publish, and display plan', async () => {
    // 1. Nutricionista cria plano
    const plan = await createMealPlan({
      patient_id: patientId,
      title: 'Plano Teste',
      start_date: '2024-01-01',
    }, nutritionistId);

    // 2. Nutricionista publica
    const published = await publishMealPlan(
      plan.id,
      validSnapshot,
      nutritionistId
    );

    // 3. Paciente visualiza
    const patientView = await getMealPlan(plan.id, patientId);
    expect(patientView.status).toBe('active');
  });
});
```

### 4.2 Monitoramento
**Objetivo**: Detectar problemas em produção

- [ ] Criar dashboard de erros
  - [ ] Contar erros por tipo
  - [ ] Alertar se taxa de erro > 5%
  - [ ] Arquivo: `src/lib/monitoring.ts` (expandir)

- [ ] Criar alertas
  - [ ] Transação falhou 3x
  - [ ] Validação rejeitou 10+ requisições
  - [ ] Arquivo: `src/lib/alerts.ts` (a criar)

**Checklist**:
- [ ] Todos os erros são logados
- [ ] Dashboard mostra status do sistema
- [ ] Alertas funcionam

---

## FASE 5: Documentation & Runbooks (Semana 4)

### 5.1 Documentação
- [ ] Atualizar README com arquitetura
- [ ] Criar guia de "Como Adicionar Nova Operação"
- [ ] Criar guia de "Como Debugar Erro"

### 5.2 Runbooks
- [ ] Runbook: "Transação Travada"
- [ ] Runbook: "Dados Inconsistentes"
- [ ] Runbook: "Rollback Manual"

---

## Priorização

### 🔴 CRÍTICO (Fazer Primeiro)
1. Database Contracts - Fase 1
2. Validação em Endpoints Críticos - Fase 2
3. E2E Tests - Fase 4

### 🟡 IMPORTANTE (Fazer Depois)
4. Client State Isolation - Fase 3
5. Monitoramento - Fase 4

### 🟢 NICE-TO-HAVE (Fazer por Último)
6. Documentation - Fase 5

---

## Métricas de Sucesso

- [ ] 0 ciclos de conserto em cascata por 2 semanas
- [ ] 100% de operações críticas com validação
- [ ] 100% de operações críticas com transação
- [ ] Taxa de erro < 1%
- [ ] MTTR (Mean Time To Recovery) < 5 min

---

## Comandos Úteis

```bash
# Rodar testes
npm run test

# Rodar E2E tests
npm run test:e2e

# Verificar tipos
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

---

## Contatos & Escalação

- **Erro em Transação**: Verificar `src/lib/safeTransaction.ts`
- **Erro em Validação**: Verificar `src/lib/validation/schemas.ts`
- **Erro em Banco**: Verificar `db/migrations/`
- **Erro em Cliente**: Verificar `src/stores/`

---

## Próxima Reunião

- [ ] Revisar Fase 1 (Database Contracts)
- [ ] Planejar Fase 2 (API Contracts)
- [ ] Identificar operações críticas faltando
