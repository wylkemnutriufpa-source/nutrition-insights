# 🛡️ PLANO CIRÚRGICO DE SOBERANIA - FITJOURNEY 2.0

## 🎯 OBJETIVO FINAL
Transformar o FitJourney em **SNAPSHOT-FIRST PLATFORM**:
- **Frontend**: RENDERIZA
- **Backend**: COMPILA
- **Templates**: CONGELAM
- **Nada**: INVENTA

---

## 🕵️ MAPA FORENSE VALIDADO

### 🔴 CRÍTICO - Violação Direta de Soberania

| Arquivo | Problema | Impacto | Ação |
|---------|----------|---------|------|
| `src/lib/legacy/mealPlanDisplay.ts` | `calculatePrimaryTotals` - Motor de cálculo no frontend | Frontend "pensa" e recalcula macros | **DELETAR** |
| `src/lib/legacy/mealPlanNormalizer.ts` | Normalização legada V1/V2 | Mantém código morto ativo | **DELETAR** |
| `src/pages/PatientMealPlan.tsx` | Usa `calculatePrimaryTotals` e `normalizeMealPlan` | Regressão e inconsistência | **REFATORAR** |
| `src/components/patient/PatientProfileMealPlan.tsx` | Usa `calculatePrimaryTotals` e `buildWeeklyDisplayDays` | Divergência de macros | **REFATORAR** |
| `src/features/editor-v3/utils/normalization.ts` | Inferência de macros em runtime | Frontend altera verdade clínica | **REFATORAR** |

### 🟡 CONTAMINADO - Lógica de Transformação

| Arquivo | Problema | Impacto | Ação |
|---------|----------|---------|------|
| `src/components/patient/ExpandableMealPlanCard.tsx` | Usa `buildDailyDisplayItems` e `calculatePrimaryTotals` | Lentidão e divergência | **REFATORAR** |
| `src/components/patient/DailyMealPlanInline.tsx` | Usa `buildDailyDisplayItems` | Duplicidade de lógica | **REFATORAR** |
| `src/lib/pdfExportPremium.ts` | Importa `assertHierarchyIntegrity` (não usado) | Poluição de imports | **LIMPAR** |
| `src/features/editor-v3/components/EditorV3Page.tsx` | Importa `normalizeMealPlan` | Uso legado no loadPlan | **REFATORAR** |

### 🟢 SEGURO - Sem Violação Direta

| Arquivo | Status | Observação |
|---------|--------|------------|
| `src/features/editor-v3/components/MealCard.tsx` | ✅ Renderização passiva | Apenas exibe dados |
| `src/features/editor-v3/hooks/useEditorState.ts` | ✅ Estado local | Não recalcula |

---

## 🔪 PLANO CIRÚRGICO EXECUTÁVEL

### FASE 1 — EXCISÃO (AGORA)
**Objetivo**: Remover código legado que viola soberania

#### 1.1 Deletar Arquivos Legados
- ❌ `src/lib/legacy/mealPlanDisplay.ts`
- ❌ `src/lib/legacy/mealPlanNormalizer.ts`

#### 1.2 Remover Imports Legados
- `src/pages/PatientMealPlan.tsx`
- `src/components/patient/PatientProfileMealPlan.tsx`
- `src/components/patient/ExpandableMealPlanCard.tsx`
- `src/components/patient/DailyMealPlanInline.tsx`
- `src/lib/pdfExportPremium.ts`
- `src/features/editor-v3/components/EditorV3Page.tsx`

#### 1.3 Substituir Lógica de Cálculo
**ANTES** (Frontend pensa):
```typescript
const totals = calculatePrimaryTotals(items);
```

**DEPOIS** (Frontend renderiza):
```typescript
const totals = snapshot.daily_totals[day] || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
```

---

### FASE 2 — CONSOLIDAÇÃO (Próximo)
**Objetivo**: Single Source of Truth

#### 2.1 Criar Hook Soberano
```typescript
// src/hooks/useSovereignPlan.ts
export function useSovereignPlan(planId: string) {
  // Retorna snapshot bruto + totais pré-calculados
  // SEM transformações, SEM normalizações
}
```

#### 2.2 Refatorar Componentes Patient
- `PatientMealPlan.tsx` → usar `useSovereignPlan`
- `PatientProfileMealPlan.tsx` → usar `useSovereignPlan`
- `ExpandableMealPlanCard.tsx` → renderização passiva
- `DailyMealPlanInline.tsx` → renderização passiva

#### 2.3 Unificar Estrutura de Dados
- Snapshot V3 é a única fonte
- Se não é V3, erro de integridade (não fallback)

---

### FASE 3 — CONGELAMENTO (Depois)
**Objetivo**: Snapshot Immutable

#### 3.1 Enriquecer Snapshot no Backend
```typescript
// Ao salvar plano, backend injeta:
{
  "formatted_portion": "100g",
  "canonical_name": "Cuscuz de Milho",
  "display_text": "Cuscuz de Milho (100g)",
  "daily_totals": {
    "1": { "kcal": 1500, "protein": 80, "carbs": 180, "fat": 50 }
  }
}
```

#### 3.2 Fim da Inferência
- Se alimento não tem macros → snapshot nasce com 0
- Frontend NÃO "chuta" valores
- Frontend NÃO recalcula nada

---

### FASE 4 — BLINDAGEM (Final)
**Objetivo**: Guardiões de Soberania

#### 4.1 PR Guards (GitHub Actions)
```yaml
# .github/workflows/sovereignty-guard.yml
- name: Block Frontend Calculations
  run: |
    if grep -r "reduce.*kcal\|sum.*protein\|calculate.*macros" src/components/patient/; then
      echo "❌ VIOLAÇÃO DE SOBERANIA: Frontend não pode calcular!"
      exit 1
    fi
```

#### 4.2 Auditoria Contínua
- `DeterministicAuditLog.tsx` → única fonte de debug
- Logs de snapshot em produção
- Alertas de divergência

---

## 📋 CHECKLIST DE EXECUÇÃO

### FASE 1 - EXCISÃO ✅
- [ ] Deletar `mealPlanDisplay.ts`
- [ ] Deletar `mealPlanNormalizer.ts`
- [ ] Remover imports em 6 arquivos
- [ ] Substituir `calculatePrimaryTotals` por `snapshot.daily_totals`
- [ ] Substituir `normalizeMealPlan` por `normalizeSnapshotToV3`
- [ ] Testar Patient App (não quebrar)
- [ ] Testar Editor V3 (não quebrar)
- [ ] Commit: "refactor: FASE 1 - excisão de código legado violador de soberania"
- [ ] Push para branch `fitjourney2.0`

### FASE 2 - CONSOLIDAÇÃO ⏳
- [ ] Criar `useSovereignPlan` hook
- [ ] Refatorar `PatientMealPlan.tsx`
- [ ] Refatorar `PatientProfileMealPlan.tsx`
- [ ] Refatorar `ExpandableMealPlanCard.tsx`
- [ ] Refatorar `DailyMealPlanInline.tsx`
- [ ] Testar renderização passiva
- [ ] Commit: "refactor: FASE 2 - consolidação em single source of truth"

### FASE 3 - CONGELAMENTO ⏳
- [ ] Enriquecer snapshot no backend (save-time)
- [ ] Adicionar `formatted_portion` e `canonical_name`
- [ ] Adicionar `daily_totals` pré-calculados
- [ ] Remover inferência de macros no frontend
- [ ] Testar PDF, Patient App, Editor
- [ ] Commit: "refactor: FASE 3 - snapshot immutable com dados enriquecidos"

### FASE 4 - BLINDAGEM ⏳
- [ ] Criar GitHub Action `sovereignty-guard.yml`
- [ ] Configurar bloqueio de PRs com cálculos
- [ ] Implementar auditoria contínua
- [ ] Documentar regras de soberania
- [ ] Commit: "feat: FASE 4 - blindagem com PR guards e auditoria"

---

## 🚨 REGRAS ABSOLUTAS

### ❌ PROIBIDO
- Heurística
- Regex inferindo refeição
- Cálculo frontend
- Hydration runtime
- Normalização silenciosa
- Fallback "inteligente"
- Reconstrução de snapshot

### ✅ PERMITIDO
- Renderização passiva
- Leitura de snapshot
- Exibição de dados
- Formatação visual (CSS)
- Navegação entre dias

---

## 🎯 META FINAL

**Qualquer snapshot salvo deve abrir IGUAL em:**
- ✅ Editor V3
- ✅ Patient App
- ✅ PDF
- ✅ WhatsApp
- ✅ Exportação

**SEM nenhuma diferença.**

---

## 📊 IMPACTO ESTIMADO

| Fase | Arquivos Modificados | Linhas Deletadas | Linhas Adicionadas | Risco |
|------|---------------------|------------------|-------------------|-------|
| FASE 1 | 8 arquivos | ~200 linhas | ~50 linhas | 🟡 Médio |
| FASE 2 | 5 arquivos | ~300 linhas | ~150 linhas | 🟡 Médio |
| FASE 3 | 3 arquivos (backend) | ~50 linhas | ~200 linhas | 🟢 Baixo |
| FASE 4 | 2 arquivos (CI/CD) | 0 linhas | ~100 linhas | 🟢 Baixo |

---

## 🛡️ GUARDIÃO DA SOBERANIA

**A partir deste momento:**
- NENHUMA alteração entra sem passar pela Auditoria de Soberania
- NENHUM cálculo frontend é permitido
- NENHUMA normalização runtime é aceita
- SNAPSHOT É A VERDADE ÚNICA

**Snapshot é o Destino.**
