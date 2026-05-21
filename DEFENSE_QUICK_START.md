# 🚀 Quick Start - Defense in Depth

## Para Desenvolvedores: Como Adicionar Uma Nova Operação Crítica

### Passo 1: Criar Schema Zod

```typescript
// src/lib/validation/schemas.ts

export const MyOperationSchema = z.object({
  patientId: UUIDSchema,
  value: z.number().min(0).max(100),
  date: DateSchema,
});

export type MyOperation = z.infer<typeof MyOperationSchema>;
```

### Passo 2: Criar Serviço com Validação

```typescript
// src/lib/api/myService.ts

import { validateRequest } from '@/lib/validation/validateRequest';
import { withTransaction } from '@/lib/safeTransaction';
import { MyOperationSchema } from '@/lib/validation/schemas';

export async function myOperation(
  data: unknown,
  userId: string
): Promise<{ success: boolean }> {
  // CAMADA 2: Validar entrada
  const validated = await validateRequest(
    MyOperationSchema,
    data,
    'MyOperation'
  );

  // CAMADA 1: Executar em transação
  return withTransaction(
    async () => {
      // Verificar permissão
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!user) throw new Error('User not found');

      // Executar operação
      const { error } = await supabase
        .from('my_table')
        .insert({ ...validated, user_id: userId });

      if (error) throw error;

      logAudit('my_operation_success', { userId });

      return { success: true };
    },
    'MyOperation',
    undefined,
    { timeout: 5000, retries: 2 }
  );
}
```

### Passo 3: Usar no Componente

```typescript
// src/components/MyComponent.tsx

import { myOperation } from '@/lib/api/myService';
import { toast } from 'sonner';

export function MyComponent() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: unknown) => {
    setLoading(true);
    try {
      const result = await myOperation(formData, userId);
      toast.success('Operação realizada com sucesso');
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(`Dados inválidos: ${error.message}`);
      } else {
        toast.error('Erro ao realizar operação');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(new FormData(e.currentTarget));
    }}>
      {/* Form fields */}
    </form>
  );
}
```

---

## Para QA: Como Testar

### Teste 1: Dados Válidos
```
1. Preencher formulário com dados válidos
2. Clicar "Enviar"
3. ✅ Esperado: Sucesso, dados salvos no banco
```

### Teste 2: Dados Inválidos
```
1. Preencher formulário com dados inválidos (ex: UUID inválido)
2. Clicar "Enviar"
3. ✅ Esperado: Erro claro, nada salvo no banco
```

### Teste 3: Erro de Transação
```
1. Desligar internet
2. Clicar "Enviar"
3. ✅ Esperado: Retry automático, sucesso quando internet volta
```

### Teste 4: Acesso Negado
```
1. Fazer login como Paciente
2. Tentar acessar operação de Nutricionista
3. ✅ Esperado: Erro "Access denied"
```

---

## Para DevOps: Como Monitorar

### Logs Importantes

```bash
# Validação passou
[VALIDATION] ✓ CreateMealPlan passed validation

# Validação falhou
[VALIDATION] ✗ CreateMealPlan failed: patient_id: Invalid UUID

# Transação iniciada
[TRANSACTION] Starting: CreateMealPlan (attempt 1/2)

# Transação completada
[TRANSACTION] ✓ Completed: CreateMealPlan

# Transação falhou, tentando fallback
[TRANSACTION] All retries failed, attempting fallback for: CreateMealPlan

# Auditoria
[AUDIT] meal_plan_created: planId=xxx, patientId=yyy
```

### Alertas

```
🔴 CRÍTICO: Taxa de erro > 5%
🟡 AVISO: Transação falhou 3x
🟢 INFO: Operação completada com sucesso
```

---

## Troubleshooting

### Problema: "ValidationError: patient_id: Invalid UUID"

**Causa**: Dados inválidos sendo enviados

**Solução**:
1. Verificar que UUID está no formato correto (ex: `550e8400-e29b-41d4-a716-446655440000`)
2. Verificar que campo não é null/undefined
3. Verificar schema em `src/lib/validation/schemas.ts`

### Problema: "TransactionError: Transaction timeout after 30000ms"

**Causa**: Operação demorando muito

**Solução**:
1. Verificar se banco está respondendo
2. Aumentar timeout em `withTransaction()` se necessário
3. Verificar se há queries N+1

### Problema: "TransactionError: Transaction failed after 2 attempt(s)"

**Causa**: Operação falhou mesmo após retries

**Solução**:
1. Verificar logs de erro
2. Verificar se permissões estão corretas
3. Verificar se dados violam constraints do banco

### Problema: "Access denied to this meal plan"

**Causa**: Usuário não tem permissão

**Solução**:
1. Verificar que usuário é criador, paciente ou admin
2. Verificar que tenant_id está correto
3. Verificar roles do usuário em `user_roles`

---

## Checklist: Antes de Fazer Deploy

- [ ] Todos os schemas Zod estão definidos
- [ ] Todos os serviços usam `validateRequest()`
- [ ] Todas as operações críticas usam `withTransaction()`
- [ ] Testes E2E passam
- [ ] Logs de auditoria funcionam
- [ ] Alertas estão configurados
- [ ] Documentação está atualizada

---

## Referências Rápidas

### Validação
```typescript
import { validateRequest } from '@/lib/validation/validateRequest';
import { MealPlanCreateSchema } from '@/lib/validation/schemas';

const validated = await validateRequest(
  MealPlanCreateSchema,
  data,
  'CreateMealPlan'
);
```

### Transação
```typescript
import { withTransaction } from '@/lib/safeTransaction';

const result = await withTransaction(
  async () => {
    // Sua lógica aqui
  },
  'OperationName',
  async () => {
    // Fallback opcional
  }
);
```

### Auditoria
```typescript
import { logAudit } from '@/lib/monitoring';

logAudit('operation_name', {
  userId,
  planId,
  action: 'created',
});
```

### Erro
```typescript
import { logError } from '@/lib/monitoring';

try {
  // Sua lógica
} catch (error) {
  logError(error, { context: 'MyOperation', userId });
}
```

---

## Próximas Etapas

1. ✅ Ler `DEFENSE_IN_DEPTH.md` para entender arquitetura
2. ✅ Ler este documento para aprender como usar
3. ⏳ Implementar primeira operação crítica
4. ⏳ Rodar testes E2E
5. ⏳ Deploy em staging
6. ⏳ Monitorar em produção

---

## Suporte

- **Dúvidas sobre Zod**: Ver `src/lib/validation/schemas.ts`
- **Dúvidas sobre Transações**: Ver `src/lib/safeTransaction.ts`
- **Dúvidas sobre Serviços**: Ver `src/lib/api/mealPlanService.ts`
- **Dúvidas sobre Testes**: Ver `src/__tests__/e2e/mealPlanFlow.test.ts`
