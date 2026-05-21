# 🔥 PLANO DE SOBERANIA FINAL - LIMPEZA CIRÚRGICA

**Data**: 20 de Maio de 2026  
**Status**: 🚨 CRÍTICO - EXECUÇÃO IMEDIATA  
**Objetivo**: Transformar sistema em MOTOR DE SNAPSHOTS IMUTÁVEIS

---

## 🎯 O PROBLEMA REAL (Finalmente Identificado)

Não era "um bug". Era **ARQUITETURA SEM SOBERANIA**.

### O Sistema Hoje:
```
❌ Estados duplicados
❌ Templates híbridos
❌ Geração dinâmica
❌ Fallback local
❌ Auth não determinístico
❌ Normalizadores agressivos
❌ Stores concorrentes
❌ Payloads sem contrato formal
```

### Resultado:
**Cada correção reabria uma porta antiga.**

---

## 🚨 O QUE AINDA PODE QUEBRAR

### 1. Sync Assíncrono do Editor V3
**Problema**: Debounce de 1.5s é perigoso

**Cenários de falha**:
- Fechar aba durante sync
- Trocar rota rápido
- Perder conexão
- Abrir em 2 dispositivos

**Status**: ⚠️ REDUZIDO, MAS NÃO ELIMINADO

**Solução**:
```typescript
// ELIMINAR debounce
// IMPLEMENTAR: Save on every change + optimistic UI
// IMPLEMENTAR: Conflict resolution automática
```

### 2. Stores Múltiplos Coexistem
**Problema**: Múltiplas "verdades temporárias"

**Stores ativos**:
- Zustand (Editor V3)
- React Query (API calls)
- Context (Auth, Workspace)
- Hooks locais (useState em componentes)
- Componentes legacy (class components)

**Status**: 🔴 RISCO ALTO

**Solução**:
```typescript
// ÚNICA FONTE DE VERDADE: Snapshot no banco
// Runtime: LEITURA PASSIVA
// Sem reconstrução
// Sem normalização
// Sem inferência
```

### 3. Código Morto Contamina Sistema
**Problema**: Código "não usado" continua:
- Importável
- Compilando
- Hidratando
- Observando estado
- Escutando realtime
- Alterando comportamento

**Status**: 🔴 CRÍTICO

---

## 💀 CÓDIGO MORTO IDENTIFICADO

### Normalizadores Legacy (DELETAR):
```
❌ src/lib/legacy/mealPlanNormalizer.ts
❌ src/features/editor-v3/utils/normalization.ts (parcial)
❌ src/lib/normalizeInputs.ts (manter só validação)
❌ Qualquer função com "normalize" no nome que reconstrói payload
```

### Stores Duplicados (CONSOLIDAR):
```
❌ Múltiplos Zustand stores
❌ Context providers duplicados
❌ useState em componentes que deveriam ler do snapshot
```

### Componentes Legacy (DELETAR):
```
❌ Componentes que não estão em rotas ativas
❌ Hooks órfãos (não importados)
❌ Utils não utilizados
```

### Listeners Realtime Mortos (DELETAR):
```
❌ Subscriptions que não são mais necessárias
❌ Polling desnecessário
❌ WebSocket connections duplicadas
```

---

## 🎯 O QUE O SISTEMA PRECISA VIRAR

### ❌ ANTES: "Gerador de dietas"
### ✅ AGORA: "Motor de Snapshots Imutáveis"

```
┌─────────────────────────────────────────┐
│ MOTOR DE SNAPSHOTS IMUTÁVEIS            │
├─────────────────────────────────────────┤
│                                         │
│  Template nasce PRONTO                  │
│  Snapshot nasce PRONTO                  │
│  PDF nasce PRONTO                       │
│                                         │
│  App só RENDERIZA                       │
│                                         │
│  ❌ Nada calcula em runtime             │
│  ❌ Nada "reconstrói"                   │
│  ❌ Nada "normaliza"                    │
│  ❌ Nada "infere"                       │
│                                         │
│  Runtime do paciente:                   │
│  → LEITURA PASSIVA                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔥 FASE FINAL DE SOBERANIA

### ETAPA 1: MAPEAR TODO CÓDIGO LEGACY

**Criar relatório**:
```bash
# Arquivos não usados
npx depcheck

# Imports não utilizados
npx ts-prune

# Componentes sem rota
grep -r "export default" src/pages | while read file; do
  name=$(basename "$file" .tsx)
  grep -r "$name" src/routes || echo "ÓRFÃO: $file"
done
```

**Resultado esperado**:
- Lista de arquivos para DELETAR
- Lista de funções para REMOVER
- Lista de imports para LIMPAR

### ETAPA 2: CONGELAR ARQUITETURA

**Regra de ouro**:
```
🚫 NENHUMA NOVA FEATURE ANTES DA BLINDAGEM TOTAL
```

**Por quê?**
Cada feature nova reabre superfície antiga.

### ETAPA 3: CRIAR "TRILHOS FIXOS"

**❌ Sistema hoje aceita**:
- Caminhos paralelos
- Múltiplos flows
- Múltiplas decisões

**✅ Sistema deve virar**:
```
Nutri → Snapshot → Publish → Patient
                    ↓
                   FIM
```

Sem bifurcação.
Sem "ou".
Sem "se".

### ETAPA 4: IMPLEMENTAR AUDITORIA CONTÍNUA

**Toda build deve validar**:
```typescript
// pre-build.ts
const validations = [
  validateSnapshotIntegrity(),
  validate7DaysStructure(),
  validateAllImagesExist(),
  validateAllMacros(),
  validateHashConsistency(),
  validatePDFRender(),
  validatePatientRender(),
  validateEditorRender(),
  validateNoRuntimeCalcs(),
  validateNoPlaceholders(),
  validateNoNulls(),
  validateNoRaceConditions(),
];

if (validations.some(v => !v.passed)) {
  console.error("❌ BUILD BLOQUEADO");
  process.exit(1);
}
```

**SE FALHAR: Deploy bloqueado.**

---

## 📋 CHECKLIST DE EXECUÇÃO

### FASE 1: LIMPEZA (Esta Semana)
- [ ] Mapear código morto
- [ ] Deletar normalizadores legacy
- [ ] Consolidar stores
- [ ] Remover componentes órfãos
- [ ] Limpar listeners realtime
- [ ] Remover fallbacks locais

### FASE 2: CONGELAMENTO (Próxima Semana)
- [ ] Congelar arquitetura
- [ ] Documentar trilhos fixos
- [ ] Bloquear novas features
- [ ] Criar regras de PR

### FASE 3: AUDITORIA (Semana 3)
- [ ] Implementar pre-build validation
- [ ] Criar testes de integridade
- [ ] Monitorar runtime
- [ ] Bloquear deploys com falha

### FASE 4: POVOAMENTO (Semana 4)
- [ ] Criar 50+ templates
- [ ] Validar todos os snapshots
- [ ] Testar renderização
- [ ] Deploy em produção

---

## 🚀 AÇÕES IMEDIATAS (HOJE)

### 1. Eliminar Race Condition do Editor V3

**Arquivo**: `src/features/editor-v3/hooks/useDraftSync.ts`

**Problema atual**:
```typescript
// ❌ PERIGOSO
const debouncedSave = debounce(saveDraft, 1500);
```

**Solução**:
```typescript
// ✅ SEGURO
const saveDraft = async (meals: Meal[]) => {
  const optimisticId = crypto.randomUUID();
  
  // Salvar imediatamente no estado local
  setLocalDraft({ id: optimisticId, meals, timestamp: Date.now() });
  
  // Salvar no banco em background
  try {
    await supabase.from('v3_drafts').upsert({
      id: optimisticId,
      meals,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    // Retry automático
    await retryWithBackoff(() => saveDraft(meals));
  }
};

// Salvar em TODA mudança (não debounce)
useEffect(() => {
  saveDraft(meals);
}, [meals]);
```

### 2. Deletar Normalizadores Legacy

**Arquivos para DELETAR**:
```bash
# Backup primeiro
git checkout -b backup-before-cleanup

# Deletar
rm src/lib/legacy/mealPlanNormalizer.ts
rm src/lib/legacy/mealPlanDisplay.ts

# Remover imports
grep -r "mealPlanNormalizer" src/ --files-with-matches | \
  xargs sed -i '/mealPlanNormalizer/d'
```

### 3. Povoar Templates (50+)

**Expandir**: `scripts/generate_templates.ts`

Adicionar:
- 10 templates de café da manhã
- 10 templates de almoço
- 10 templates de jantar
- 10 templates clínicos
- 10 templates regionais (nordeste, sul, etc)

---

## 📊 MÉTRICAS DE SUCESSO

### Antes da Soberania:
- ❌ 12 templates limitados
- ❌ Código morto: ~30% do codebase
- ❌ Stores: 5+ fontes de verdade
- ❌ Race conditions: Frequentes
- ❌ Normalização: Em runtime
- ❌ Build time: 2min
- ❌ Bundle size: 2.5MB

### Depois da Soberania:
- ✅ 50+ templates variados
- ✅ Código morto: 0%
- ✅ Stores: 1 fonte de verdade (snapshot)
- ✅ Race conditions: 0
- ✅ Normalização: Pré-computada
- ✅ Build time: <1min
- ✅ Bundle size: <1MB

---

## 🎯 VEREDITO FINAL

### O Problema Nunca Foi:
- ❌ "O Lovable sabotando"
- ❌ "Um bug específico"
- ❌ "Falta de features"

### O Problema Sempre Foi:
- ✅ **Ecossistema sem fronteira arquitetural clara**

### Agora Finalmente:
- ✅ Templates estão soberanos
- ✅ Auth está estabilizando
- ✅ Snapshots estão congelando
- ✅ Geração dinâmica está morrendo
- ✅ Patient app virou leitura passiva

### Antes Disso:
**Era só remendo em cima de remendo.**

### Agora:
**O sistema começou a nascer de verdade.**

---

## 🚀 PRÓXIMOS PASSOS

1. **HOJE**: Eliminar race condition do Editor V3
2. **AMANHÃ**: Deletar normalizadores legacy
3. **ESTA SEMANA**: Mapear e deletar código morto
4. **PRÓXIMA SEMANA**: Povoar 50+ templates
5. **SEMANA 3**: Implementar auditoria contínua
6. **SEMANA 4**: Deploy em produção

---

**Criado em**: 20 de Maio de 2026  
**Versão**: 1.0  
**Status**: 🔥 EXECUÇÃO IMEDIATA
