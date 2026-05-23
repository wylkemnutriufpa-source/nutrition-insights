---
inclusion: always
---

# 🛡️ FITJOURNEY 2.0 — REGRAS SOBERANAS ABSOLUTAS

## ⚠️ CONTEXTO CRÍTICO: DOIS AGENTES NA MESMA BRANCH

O projeto usa **Lovable** (no-code) + **Kiro** (aqui) na mesma branch `fitjourney2.0`.
O Lovable faz commits autônomos ("Changes", "Fast Visual Edit") que podem reverter nosso trabalho.

**Protocolo obrigatório**:
1. SEMPRE `git pull --no-rebase --no-edit` antes de qualquer push
2. SEMPRE `git push origin fitjourney2.0` depois de qualquer mudança
3. NUNCA acumular mudanças sem commit (o Lovable faz commits e cria conflitos)
4. Usar `--no-verify` em todos os commits (hook husky pode bloquear)

---

## 🎯 ARQUITETURA SOBERANA — REGRA ABSOLUTA

### O sistema opera em:
```
SNAPSHOT → PERSISTE → RENDERIZA
```

### O frontend NUNCA:
- ❌ calcula macros
- ❌ infere alimentos
- ❌ hidrata dados
- ❌ reconcilia macros
- ❌ normaliza estrutura
- ❌ corrige snapshot
- ❌ gera refeições
- ❌ cria equivalências runtime
- ❌ "cura" inconsistências

### A verdade única é o Snapshot V3 no banco:
```json
{
  "snapshot_version": "v3",
  "days": [{
    "day_of_week": 1,
    "meals": [{
      "name": "Café da Manhã",
      "time": "08:00",
      "macros": { "kcal": 410, "protein_g": 20, "carbs_g": 50, "fat_g": 10 },
      "items": [{
        "id": "uuid",
        "title": "Pão Integral",
        "imageUrl": "https://...jpg",
        "quantity_display": "50g",
        "clinical_mass_g": 50,
        "macros": { "kcal": 120, "protein_g": 4, "carbs_g": 24, "fat_g": 1 },
        "substitutions": [...]
      }]
    }]
  }],
  "daily_totals": { "1": { "kcal": 1500, "protein_g": 80 } },
  "targets": { "kcal": 1500, "protein_g": 80 }
}
```

---

## 🛡️ EXTRATOR SOBERANO (src/lib/sovereign/)

### Hierarquia de campos para imagem:
```typescript
raw?.visual?.image_url  // planos publicados (planPersistenceService)
|| raw?.imageUrl         // templates
|| raw?.image_url        // legado
|| null
```

### Hierarquia para quantity_display:
```typescript
raw?.quantity_display || raw?.display_quantity || raw?.qty || ''
```

### Hierarquia para macros:
```typescript
raw?.macros?.kcal ?? raw?.kcal ?? 0
raw?.macros?.protein_g ?? raw?.protein ?? 0
```

### metadata DEVE ser populado pelo extrator:
```typescript
metadata: {
  ...raw.metadata,
  substitution_count: subs.length,        // para botão "Trocar Opção"
  substitution_options: subs.map(...)     // para modal de substituições
}
```

---

## 🚨 ARQUIVOS PROIBIDOS (não recriar, não importar)

Os arquivos abaixo foram **deliberadamente deletados** como parte da soberania.
Se o Lovable os recriou, deletar novamente:

- `src/lib/legacy/mealPlanDisplay.ts` — `calculatePrimaryTotals` viola soberania
- `src/lib/legacy/mealPlanNormalizer.ts` — normalização legada V1/V2
- `src/components/MealPlanBuilder.tsx` — cálculos manuais P×4, C×4, G×9
- `src/components/MealPlanEditor.tsx` — editor legado V1

### Verificar se foram recriados:
```powershell
git diff HEAD~5 --name-only | findstr legacy
```

---

## 🎯 FLUXO SOBERANO DO PACIENTE

```
/onboarding/paciente (2 slides de intro)
  ↓ CTA: "Começar avaliação clínica"
/anamnesis
  ↓ trigger SQL → clinical_assessment_completed = true
/client/dashboard
```

### Flag oficial: `clinical_assessment_completed`
### Compatibilidade 30 dias: `onboarding_completed` (manter até 23/06/2026)
### Flags a deletar futuramente: `onboarding_completed`, `patient_state`, `journey_status`

### PROIBIDO no fluxo do paciente:
- ❌ Pipeline de 6 etapas visível
- ❌ Redirect forçado por guard
- ❌ Loop anamnese ↔ pipeline
- ❌ Bloqueio de dashboard
- ❌ Modal travando navegação

---

## 📋 ESTRUTURA DE DADOS — CAMPOS REAIS

### Templates (`v3_diet_templates.plan_snapshot`):
- Campo: `meal.items[]` (migrado 22/05/2026 — todos os 65 templates)
- **NÃO** tem `meal.foods[]` mais

### Planos publicados (`meal_plans.snapshot`):
- Campo: `item.visual.image_url` (não `item.imageUrl`)
- Campo: `item.macros.kcal` (não `item.kcal`)
- Campo: `item.quantity_display` (não `item.qty`)

### Templates antigos (`v3_diet_templates`):
- Campo: `item.imageUrl` (não `item.visual.image_url`)
- Campo: `item.kcal` (não `item.macros.kcal`)
- Campo: `item.qty` (não `item.quantity_display`)

O extrator soberano (`extractMealsFromSnapshot.ts`) normaliza ambas.

---

## ⚡ PERFORMANCE — PROBLEMAS CONHECIDOS

### useDraftSync (CORRIGIDO 22/05/2026):
- Debounce: 2 segundos (era imediato)
- Retry: máximo 3 tentativas com backoff (era loop infinito)
- Cleanup: timer cancelado no desmonte

### Auth SIGNED_IN loop (CORRIGIDO 22/05/2026):
- `TOKEN_REFRESHED` não dispara mais `setLoading(true)`
- `SIGNED_IN` do mesmo user com roles resolvidos → apenas atualiza session
- Refs: `currentUserIdRef`, `rolesResolvedRef`

### EditorV3 loadPlan (CORRIGIDO 22/05/2026):
- Loader só aparece se `store.meals.length === 0`
- `store.*` removido das deps do useEffect

---

## 🔑 GIT — REGRAS CRÍTICAS

```powershell
# Sempre antes de push:
git pull origin fitjourney2.0 --no-rebase --no-edit

# Sempre ao commitar:
git commit --no-verify -m "mensagem descritiva em portugues"

# Sempre na branch correta:
git push origin fitjourney2.0  # NUNCA main/master

# Se rejected, pull primeiro:
git pull origin fitjourney2.0 --no-rebase --no-edit
git push origin fitjourney2.0
```

---

## 📊 STATUS DAS SPRINTS

| Sprint | Status | Descrição |
|--------|--------|-----------|
| Sprint 1 | ✅ | Deletar legado (903 linhas), debounce autosave |
| Sprint 2 | ✅ | Remover bridge foods→items, extrator puro |
| Sprint 3 | ✅ | publishTargets = média 7 dias, deletar src/lib/legacy/ |
| Sprint 4 (onboarding) | ✅ | 2 slides, clinical_assessment_completed, banner leve |
| Sprint 5 | ⏳ | amputar flags legadas (23/06/2026) |

---

## 🛡️ ANTES DE QUALQUER MUDANÇA EM:

### `src/components/patient/**`:
- Verificar se não há `reduce`, `sum`, `calculate` novo
- Verificar se não lê `item.macros.kcal` sem optional chaining
- Verificar se não lê `item.meal.name` sem optional chaining

### `src/lib/sovereign/**`:
- `extractMealsFromSnapshot.ts` é o ÚNICO ponto de leitura do snapshot
- `readImageUrl` deve verificar `visual?.image_url` PRIMEIRO
- `metadata` deve incluir `substitution_count`

### `src/features/editor-v3/**`:
- Editor pode calcular DURANTE edição ativa
- Ao publicar: `planPersistenceService.buildSovereignSnapshot` compila
- `publishTargets` = média dos 7 dias (não só dia ativo)

### Migrations SQL:
- Nunca deletar coluna sem período de compatibilidade
- Sempre adicionar `IF NOT EXISTS` em novos campos
- Trigger `on_anamnesis_completed` sincroniza `clinical_assessment_completed`
