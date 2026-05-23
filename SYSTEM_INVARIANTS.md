# 🛡️ SYSTEM INVARIANTS — FitJourney 2.0

## ⚠️ ARQUIVO DE PROTEÇÃO ARQUITETURAL
**NÃO ALTERAR estes invariantes sem revisão completa do impacto.**

---

## 🎯 PRINCÍPIO FUNDAMENTAL

```
ANAMNESE → MOTOR CLÍNICO (backend) → SNAPSHOT CONGELADO → RENDERIZAÇÃO PASSIVA
```

**O frontend NUNCA pensa. O frontend NUNCA calcula. O frontend APENAS renderiza.**

---

## 🔴 ARQUIVOS PROTEGIDOS (NÃO MODIFICAR ESTRUTURA)

| Arquivo | Por que protegido |
|---|---|
| `src/lib/sovereign/extractMealsFromSnapshot.ts` | Único ponto de leitura do snapshot |
| `src/lib/sovereign/SovereignMealItem.ts` | Type soberano único |
| `src/lib/sovereign/useSovereignPlan.ts` | Hook soberano único |
| `src/features/editor-v3/services/planPersistenceService.ts` | Compilador soberano |
| `src/features/editor-v3/types/snapshot.ts` | Schema do snapshot V3 |
| `src/lib/auth.tsx` | Bootstrap auth sem re-fetch redundante |
| `supabase/migrations/20260523100000_*.sql` | Motor determinístico Mifflin-St Jeor |
| `supabase/migrations/20260524000000_*.sql` | dietary_restrictions por template |

---

## 🔴 ARQUIVOS DELETADOS (NÃO RECRIAR)

| Arquivo | Por que foi deletado |
|---|---|
| `src/components/MealPlanBuilder.tsx` | Cálculos manuais P×4, C×4, G×9 no frontend |
| `src/components/MealPlanEditor.tsx` | Editor legado V1/V2 sem soberania |

> ⚠️ Se o Lovable recriar estes arquivos, **deletar imediatamente**.

---

## 🔴 COMPORTAMENTOS ABSOLUTAMENTE PROIBIDOS

### ❌ Frontend nunca calcula
```typescript
// PROIBIDO
const total = items.reduce((s, i) => s + i.kcal, 0);
const macros = weight * 22; // peso × fator

// CORRETO
const total = snapshot.daily_totals[day].kcal;
const macros = snapshot.targets.kcal;
```

### ❌ Frontend nunca normaliza
```typescript
// PROIBIDO
function normalizeMealPlan(plan) { /* qualquer lógica */ }
function healSnapshot(data) { /* qualquer lógica */ }

// CORRETO
function normalizeMealPlan(plan) { return plan; } // passthrough puro
```

### ❌ Frontend nunca busca imagem em runtime durante render
```typescript
// PROIBIDO (no render/patient app)
const img = await supabase.from('meal_visual_library').select().ilike('name', foodName);

// CORRETO
const img = item.imageUrl; // direto do snapshot
```

### ❌ Canais realtime sem filtro
```typescript
// PROIBIDO
supabase.channel(`bus-${user.id}-${Date.now()}`); // timestamp = novo canal a cada remount
channel.on('postgres_changes', { table: 'onboarding_pipelines' }); // sem filtro = global

// CORRETO
supabase.channel(`bus-${user.id}`); // nome estável
channel.on('postgres_changes', { table: 'onboarding_pipelines', filter: `nutritionist_id=eq.${user.id}` });
```

### ❌ N+1 queries em loops
```typescript
// PROIBIDO (504 queries para publicar 7 dias)
for (const item of items) {
  const visual = await resolveVisual(item); // await dentro de loop
}

// CORRETO (2 queries totais)
const visualMap = await resolveVisualBatch(items);
for (const item of items) {
  const visual = visualMap.get(item.id);
}
```

---

## 🟢 COMPORTAMENTOS OBRIGATÓRIOS

### ✅ Snapshot sempre completo ao publicar
```typescript
// Todo snapshot publicado DEVE ter:
{
  snapshot_version: 'v3',
  publication_id: 'uuid',
  targets: { kcal, protein_g, carbs_g, fat_g },
  daily_totals: { [day]: { kcal, ... } },
  days: [...],
  clinical_metadata: { engine_version, tmb, tdee, ... }
}
```

### ✅ clinical_metadata preservado na republicação
```typescript
// CORRETO: preservar e enriquecer
clinical_metadata: {
  ...originalClinicalMetadata,  // nunca sobrescrever
  republished_at: new Date().toISOString(),
  republished_by: nutritionistId,
}
```

### ✅ revision_number sempre cresce
```typescript
// revision_number: 1 → 2 → 3 → ... (nunca reseta)
```

---

## 🔵 ARQUITETURA DO MOTOR CLÍNICO (backend-only)

```
patient_anamnesis.answers (JSONB)
    ↓
calculate_clinical_kcal_target() — Mifflin-St Jeor RPC
    ↓ TMB, TDEE, VET, proteína, carbs, gordura
select_sovereign_template() — Matching determinístico
    ↓ score = objetivo(40) + kcal(20) + sexo(15) + condição(25)
    ↓ ORDER BY match_score DESC, title ASC (nunca random)
classify_and_assign_sovereign_template() — Orquestrador
    ↓ snapshot = template[kcal_key] + targets + clinical_metadata
meal_plans.snapshot — Congelado, completo, imutável
```

---

## 🔵 ARQUITETURA DE RENDERIZAÇÃO (frontend-only)

```
meal_plans.snapshot (banco)
    ↓
resolve_patient_meal_plan() — RPC
    ↓
extractMealsFromSnapshot() — ÚNICO ponto de leitura
    ↓ SovereignMealItem[]
Patient App Components — APENAS renderizam
    ↓
ZERO cálculo, ZERO inferência, ZERO normalização
```

---

## 🚨 REGRAS PARA O LOVABLE

O Lovable deve operar APENAS como:
- UI visual (cores, layout, animações)
- Deploy (build e publicação)
- Sync visual (componentes visuais)

O Lovable NÃO deve:
- Modificar `extractMealsFromSnapshot.ts`
- Modificar `planPersistenceService.ts`
- Modificar `buildSovereignSnapshot`
- Modificar o motor clínico (RPCs SQL)
- Recriar arquivos legados deletados
- Adicionar lógica de cálculo em componentes Patient
- Alterar o schema do `SovereignSnapshotV3`

---

## 📋 CHECKLIST DE REVISÃO (antes de merge)

- [ ] Nenhum `reduce/sum/calculate` em `src/components/patient/`
- [ ] Nenhum `await` dentro de loop em `planPersistenceService`
- [ ] Canais realtime com nomes estáveis (sem `Date.now()`)
- [ ] `onboarding_pipelines` com filtro `nutritionist_id`
- [ ] `snapshot.targets` presente em todos os planos publicados
- [ ] `clinical_metadata` preservado na republicação
- [ ] `mealPlanDisplay.ts` e `mealPlanNormalizer.ts` são stubs (passthrough)
- [ ] Nenhum arquivo da denylist foi recriado

---

## 🔢 MÉTRICAS ATUAIS (24/05/2026)

| Métrica | Valor |
|---|---|
| Grau de Soberania | 95% |
| Grau de Estabilidade | 89% |
| Templates com clinical_tags | 65/65 (100%) |
| Campos da anamnese usados na classificação | 8/8 (100%) |
| Queries na publicação | 2 (era 504) |
| Vulnerabilidades de segurança | 0 críticas |
