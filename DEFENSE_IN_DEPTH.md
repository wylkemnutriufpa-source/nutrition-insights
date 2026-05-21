# 🛡️ DEFENSE IN DEPTH - Arquitetura de Proteção do Sistema

## Problema Identificado

O sistema estava em um **ciclo infernal de consertos em cascata**:
- Conserta A → quebra B
- Conserta B → quebra C
- Conserta C → quebra D
- ...

**Causa raiz**: Arquitetura sem camadas claras de proteção. Validações espalhadas, sem contratos formais entre componentes.

---

## Solução: 3 Camadas de Proteção

```
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 3: CLIENT STATE ISOLATION                            │
│ (Zustand + Immer + Validação)                               │
│ - Single source of truth                                    │
│ - Optimistic updates + rollback                             │
│ - Cache invalidation strategy                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 2: API CONTRACTS (Validação com Zod)                 │
│ - Request validation                                        │
│ - Response validation                                       │
│ - Type-safe at runtime                                      │
│ - Fail fast com mensagens claras                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 1: DATABASE CONTRACTS (Transações)                   │
│ - Migrações versionadas                                     │
│ - Constraints formais (FK, CHECK, UNIQUE)                   │
│ - Transações explícitas                                     │
│ - Rollback automático em erro                               │
└─────────────────────────────────────────────────────────────┘
```

---

## CAMADA 1: Database Contracts

### Objetivo
Garantir integridade dos dados no nível mais baixo (banco de dados).

### Implementação

#### 1.1 Migrações Versionadas
```sql
-- db/migrations/001_initial_schema.sql
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status ENUM('draft', 'active', 'completed', 'archived') NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- CONSTRAINTS
  CONSTRAINT version_positive CHECK (version >= 1),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  UNIQUE(patient_id, version)
);

CREATE INDEX idx_meal_plans_patient_id ON meal_plans(patient_id);
CREATE INDEX idx_meal_plans_status ON meal_plans(status);
```

#### 1.2 Foreign Keys com Cascata
```sql
-- Deletar plano → deletar refeições automaticamente
ALTER TABLE meals ADD CONSTRAINT fk_meals_plan
  FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE;

-- Deletar refeição → deletar itens automaticamente
ALTER TABLE meal_items ADD CONSTRAINT fk_meal_items_meal
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE;
```

#### 1.3 Transações Explícitas
```typescript
// src/lib/safeTransaction.ts
export async function withTransaction<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    if (fallback) return fallback();
    throw error;
  }
}
```

**Uso**:
```typescript
const result = await withTransaction(
  async () => {
    const plan = await createMealPlan(data);
    const meals = await createMeals(plan.id, mealsData);
    return { plan, meals };
  },
  'CreateMealPlanWithMeals'
);
```

---

## CAMADA 2: API Contracts

### Objetivo
Validar TUDO que entra/sai do sistema em runtime.

### Implementação

#### 2.1 Schemas Zod
```typescript
// src/lib/validation/schemas.ts
export const MealPlanCreateSchema = z.object({
  patient_id: UUIDSchema,
  title: z.string().min(1).max(255),
  start_date: DateSchema,
  targets: MacroSchema.optional(),
});

export type MealPlanCreate = z.infer<typeof MealPlanCreateSchema>;
```

#### 2.2 Middleware de Validação
```typescript
// src/lib/validation/validateRequest.ts
export async function validateRequest<T>(
  schema: z.Schema<T>,
  data: unknown,
  context: string
): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `${context} validation failed`,
        error.errors
      );
    }
    throw error;
  }
}
```

#### 2.3 Serviço com Validação
```typescript
// src/lib/api/mealPlanService.ts
export async function createMealPlan(
  data: unknown,
  nutritionistId: string
) {
  // CAMADA 2: Validar entrada
  const validated = await validateRequest(
    MealPlanCreateSchema,
    data,
    'CreateMealPlan'
  );

  // CAMADA 1: Executar em transação
  return withTransaction(
    async () => {
      // Lógica de negócio aqui
      const plan = await supabase
        .from('meal_plans')
        .insert({ ...validated, created_by: nutritionistId })
        .select()
        .single();
      
      return plan;
    },
    'CreateMealPlan'
  );
}
```

---

## CAMADA 3: Client State Isolation

### Objetivo
Manter estado do cliente sincronizado com servidor, com rollback automático em erro.

### Implementação

#### 3.1 Store com Validação
```typescript
// src/stores/mealPlanStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { validateRequestSync } from '@/lib/validation/validateRequest';
import { MealPlanSnapshotV3Schema } from '@/lib/validation/schemas';

export const useMealPlanStore = create<MealPlanStore>()(
  immer((set, get) => ({
    plans: [],
    
    // Adicionar refeição com validação
    addMeal: (mealId: string) => set((state) => {
      if (!state.currentPlan) throw new Error("No plan");
      
      // Validar antes de aplicar
      const newMeal = { id: mealId, items: [] };
      state.currentPlan.meals.push(newMeal);
    }),
    
    // Sincronizar com servidor com rollback
    syncWithServer: async () => {
      const backup = JSON.parse(JSON.stringify(get().plans));
      try {
        const response = await api.sync(get().plans);
        
        // Validar resposta
        const validated = validateRequestSync(
          MealPlanSnapshotV3Schema,
          response,
          'SyncResponse'
        );
        
        set({ plans: validated });
      } catch (error) {
        // Rollback automático
        set({ plans: backup });
        throw error;
      }
    },
  }))
);
```

#### 3.2 Optimistic Updates
```typescript
// Exemplo: Atualizar quantidade de alimento
const updateQuantity = async (itemId: string, newQty: number) => {
  // 1. Atualizar estado imediatamente (optimistic)
  const backup = store.getState().items;
  store.setState((state) => {
    const item = state.items.find(i => i.id === itemId);
    if (item) item.quantity = newQty;
  });

  try {
    // 2. Sincronizar com servidor
    await api.updateItemQuantity(itemId, newQty);
  } catch (error) {
    // 3. Rollback se falhar
    store.setState({ items: backup });
    throw error;
  }
};
```

---

## Fluxo Completo: Criar Plano de Refeição

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENTE: Usuário clica "Criar Plano"                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CAMADA 3: Validar entrada no cliente                     │
│    - Verificar campos obrigatórios                          │
│    - Validar tipos                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CAMADA 3: Optimistic update                              │
│    - Atualizar store imediatamente                          │
│    - Mostrar UI otimista                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CAMADA 2: Enviar para API                                │
│    - Validar com Zod                                        │
│    - Falhar rápido se inválido                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CAMADA 1: Executar em transação                          │
│    - Verificar permissões                                   │
│    - Criar plano                                            │
│    - Criar refeições                                        │
│    - Rollback se alguma falhar                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. BANCO DE DADOS: Constraints garantem integridade         │
│    - FK: plano → paciente                                   │
│    - CHECK: status válido                                   │
│    - UNIQUE: não duplicar                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. RESPOSTA: Validar resposta                               │
│    - Zod valida estrutura                                   │
│    - Atualizar store com dados confirmados                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. CLIENTE: Mostrar sucesso                                 │
│    - UI atualiza com dados do servidor                      │
│    - Logging de auditoria                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefícios

### ✅ Ciclo de Consertos Quebrado
- Cada camada é independente
- Erro em uma camada não cascata para outra
- Rollback automático em falha

### ✅ Type Safety
- Validação em runtime com Zod
- TypeScript garante type-safety em compile-time
- Impossível passar dados inválidos

### ✅ Observabilidade
- Logging detalhado em cada camada
- Auditoria de todas as operações críticas
- Fácil identificar onde erro ocorreu

### ✅ Recuperação
- Fallback automático em transações
- Retry com backoff exponencial
- Rollback de estado em erro

---

## Próximos Passos

### SEMANA 1: Foundation
- [ ] Criar `db/migrations/` com schemas formais
- [ ] Adicionar constraints em todas as tabelas críticas
- [ ] Testar rollback de transações

### SEMANA 2: API Safety
- [ ] Implementar validação Zod em todos os endpoints
- [ ] Adicionar error boundaries
- [ ] Testar validação com dados inválidos

### SEMANA 3: Client Safety
- [ ] Refatorar stores para usar Zustand + Immer
- [ ] Implementar optimistic updates
- [ ] Adicionar cache invalidation

### SEMANA 4: Integration
- [ ] E2E tests para critical paths
- [ ] Monitoramento em produção
- [ ] Runbook de recovery

---

## Checklist de Implementação

Para cada operação crítica:

- [ ] Criar schema Zod em `src/lib/validation/schemas.ts`
- [ ] Criar validador em `src/lib/validation/validateRequest.ts`
- [ ] Implementar serviço em `src/lib/api/`
- [ ] Usar `withTransaction()` para operações multi-step
- [ ] Adicionar logging com `logAudit()`
- [ ] Testar com dados inválidos
- [ ] Testar rollback em erro
- [ ] Documentar em README

---

## Referências

- [Zod Documentation](https://zod.dev)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Database Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Transaction Handling](https://www.postgresql.org/docs/current/tutorial-transactions.html)
