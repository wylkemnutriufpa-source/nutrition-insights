# 🔐 Segurança e RLS — Blindagem Total

## 🎯 Objetivo

Garantir que o 2.0 seja 100% seguro: usuários só conseguem acessar seus próprios dados.

---

## 🔴 PROBLEMA DO 1.0

O 1.0 tinha RLS policies fracas:

```sql
-- ❌ ERRADO (1.0)
CREATE POLICY "Users can view patients"
  ON patients FOR SELECT
  USING (true); -- QUALQUER UM CONSEGUE VER!

CREATE POLICY "Users can view meal plans"
  ON meal_plans FOR SELECT
  USING (true); -- QUALQUER UM CONSEGUE VER!
```

**Problemas:**
- Usuários conseguiam ver dados de outros
- Sem validação de ownership
- Sem auditoria de acesso
- Sem proteção de dados sensíveis

---

## ✅ SOLUÇÃO 2.0 — RLS RIGOROSA

### Princípio 1: RLS em TODAS as Tabelas

```sql
-- ✅ CORRETO (2.0)

-- 1. PATIENTS — Usuário só vê seus próprios pacientes
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients: Users can view their own patients"
  ON patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Patients: Users can insert their own patients"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients: Users can update their own patients"
  ON patients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients: Users can delete their own patients"
  ON patients FOR DELETE
  USING (auth.uid() = user_id);

-- 2. MEAL_PLANS — Usuário só vê planos de seus pacientes
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meal Plans: Users can view their own meal plans"
  ON meal_plans FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meal Plans: Users can insert meal plans for their patients"
  ON meal_plans FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meal Plans: Users can update their own meal plans"
  ON meal_plans FOR UPDATE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- 3. MEAL_PLAN_ITEMS — Usuário só vê itens de seus planos
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meal Plan Items: Users can view their own items"
  ON meal_plan_items FOR SELECT
  USING (
    meal_plan_id IN (
      SELECT id FROM meal_plans WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Meal Plan Items: Users can insert items for their plans"
  ON meal_plan_items FOR INSERT
  WITH CHECK (
    meal_plan_id IN (
      SELECT id FROM meal_plans WHERE patient_id IN (
        SELECT id FROM patients WHERE user_id = auth.uid()
      )
    )
  );

-- 4. FOODS — Todos conseguem ver (dados públicos)
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foods: Everyone can view foods"
  ON foods FOR SELECT
  USING (true);

-- 5. V3_DIET_TEMPLATES — Todos conseguem ver (dados públicos)
ALTER TABLE v3_diet_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates: Everyone can view active templates"
  ON v3_diet_templates FOR SELECT
  USING (active = true);
```

### Princípio 2: Validação de Ownership

```typescript
// ✅ CORRETO (2.0)
async function getMealPlan(mealPlanId: UUID, userId: UUID): Promise<MealPlan> {
  const mealPlan = await mealPlanRepository.findById(mealPlanId);
  
  if (!mealPlan) {
    throw new NotFoundError('Meal plan not found');
  }
  
  // Validar ownership
  const patient = await patientRepository.findById(mealPlan.patient_id);
  
  if (!patient || patient.user_id !== userId) {
    throw new UnauthorizedError('You do not have access to this meal plan');
  }
  
  return mealPlan;
}
```

### Princípio 3: Sem Exceções de Segurança

```typescript
// ❌ ERRADO (1.0)
async function getMealPlan(mealPlanId: UUID): Promise<MealPlan> {
  // Sem validação de ownership!
  return await mealPlanRepository.findById(mealPlanId);
}

// ✅ CORRETO (2.0)
async function getMealPlan(mealPlanId: UUID, userId: UUID): Promise<MealPlan> {
  // Sempre validar ownership
  const mealPlan = await mealPlanRepository.findById(mealPlanId);
  
  if (!mealPlan) {
    throw new NotFoundError('Meal plan not found');
  }
  
  const patient = await patientRepository.findById(mealPlan.patient_id);
  
  if (!patient || patient.user_id !== userId) {
    throw new UnauthorizedError('Access denied');
  }
  
  return mealPlan;
}
```

### Princípio 4: Auditoria de Acesso

```typescript
// Registrar TODOS os acessos
interface AccessAudit {
  id: UUID;
  userId: UUID;
  resource: string; // 'patient', 'meal_plan', etc.
  resourceId: UUID;
  action: 'read' | 'create' | 'update' | 'delete';
  timestamp: Date;
  allowed: boolean;
  reason?: string; // Se negado
}

async function auditAccess(
  userId: UUID,
  resource: string,
  resourceId: UUID,
  action: string,
  allowed: boolean,
  reason?: string
): Promise<void> {
  await auditRepository.create({
    id: generateUUID(),
    userId,
    resource,
    resourceId,
    action,
    timestamp: new Date(),
    allowed,
    reason,
  });
}
```

---

## 🧪 TESTES DE SEGURANÇA

### Teste 1: Usuário Não Consegue Ver Dados de Outro

```typescript
describe('Segurança - RLS', () => {
  it('usuário A não consegue ver pacientes de usuário B', async () => {
    const userA = await createUser('user-a@test.com');
    const userB = await createUser('user-b@test.com');
    
    const patientB = await createPatient(userB.id, 'Patient B');
    
    // Tentar acessar como userA
    const result = await getMealPlan(patientB.id, userA.id);
    
    expect(result).toThrow(UnauthorizedError);
  });
});
```

### Teste 2: Usuário Consegue Ver Seus Próprios Dados

```typescript
it('usuário consegue ver seus próprios pacientes', async () => {
  const user = await createUser('user@test.com');
  const patient = await createPatient(user.id, 'My Patient');
  
  const result = await getPatient(patient.id, user.id);
  
  expect(result.id).toBe(patient.id);
  expect(result.user_id).toBe(user.id);
});
```

### Teste 3: RLS Policies Funcionam

```typescript
it('RLS policy bloqueia acesso não autorizado', async () => {
  const userA = await createUser('user-a@test.com');
  const userB = await createUser('user-b@test.com');
  
  const patientA = await createPatient(userA.id, 'Patient A');
  
  // Tentar acessar como userB via SQL direto
  const result = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientA.id)
    .setAuth(userB.id);
  
  expect(result.data).toHaveLength(0);
});
```

### Teste 4: Auditoria Registra Acessos

```typescript
it('auditoria registra todos os acessos', async () => {
  const user = await createUser('user@test.com');
  const patient = await createPatient(user.id, 'Patient');
  
  await getPatient(patient.id, user.id);
  
  const audit = await auditRepository.findByResource('patient', patient.id);
  
  expect(audit).toHaveLength(1);
  expect(audit[0].action).toBe('read');
  expect(audit[0].allowed).toBe(true);
});
```

---

## 📊 CHECKLIST DE SEGURANÇA

- [ ] RLS ativada em TODAS as tabelas
- [ ] Policies validam user_id
- [ ] Sem exceções de segurança
- [ ] Validação de ownership em TODAS as operações
- [ ] Auditoria de acesso
- [ ] Testes de RLS
- [ ] Testes de ownership
- [ ] Testes de auditoria
- [ ] Documentação de políticas
- [ ] Revisão de segurança

---

## 🚨 RED FLAGS

### ❌ NÃO FAÇA ISSO

```sql
-- ❌ Sem RLS
CREATE TABLE patients (...);
-- Sem ALTER TABLE ... ENABLE ROW LEVEL SECURITY;

-- ❌ RLS fraca
CREATE POLICY "Anyone can view"
  ON patients FOR SELECT
  USING (true);

-- ❌ Sem validação de ownership
SELECT * FROM meal_plans WHERE id = $1;

-- ❌ Sem auditoria
UPDATE patients SET name = $1 WHERE id = $2;
```

### ✅ FAÇA ASSIM

```sql
-- ✅ RLS ativada
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- ✅ RLS rigorosa
CREATE POLICY "Users can view their own patients"
  ON patients FOR SELECT
  USING (auth.uid() = user_id);

-- ✅ Validação de ownership
SELECT * FROM meal_plans 
WHERE id = $1 
AND patient_id IN (
  SELECT id FROM patients WHERE user_id = auth.uid()
);

-- ✅ Auditoria
INSERT INTO audit_log (user_id, action, resource_id, timestamp)
VALUES (auth.uid(), 'update', $2, NOW());
```

---

## 📞 IMPLEMENTAÇÃO

1. **Revisar** todas as RLS policies
2. **Ativar** RLS em TODAS as tabelas
3. **Validar** ownership em TODAS as operações
4. **Implementar** auditoria
5. **Escrever** testes de segurança
6. **Documentar** políticas
7. **Testar** em produção

---

**O 2.0 será seguro. Nenhum usuário conseguirá acessar dados de outro!**
