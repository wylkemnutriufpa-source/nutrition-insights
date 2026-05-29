# Auditoria Forense — Degradação Arquitetural Lovable

**Data:** 28 de Maio de 2026  
**Severidade:** 🔴 CRÍTICA  
**Status:** Detectada e Mapeada

---

## 📋 Resumo Executivo

O Lovable reintroduziu **fallbacks silenciosos** e **lógica legada** no motor determinístico V3, criando um "Frankenstein híbrido" que:

- ✅ Mantém a estrutura correta (ClinicalEngine)
- ❌ Mas contém fallback silencioso para `profiles` quando anamnese falha
- ❌ Usa "fuzzy match" por proximidade calórica (heurística, não determinismo)
- ❌ Silencia erros que deveriam ser explícitos

---

## 🔍 Achados Críticos

### 1. Fallback Silencioso em clinical-engine.ts (Linhas 60-80)

**Código Problemático:**
```typescript
} else {
  // Fallback: If no anamnesis, check profile but warn
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", patientId)
    .single();
  
  if (!profile || !profile.current_weight_kg) {
    throw new Error("ANAMNESIS_MISSING: Anamnese incompleta ou não encontrada.");
  }

  console.log("[ClinicalEngine] Falling back to profile calculations");
  // ... recalcula TMB/TDEE/macros a partir de profiles
}
```

**Problema:**
- Quando `patient_anamnesis` está vazia, o sistema **silenciosamente** busca em `profiles`
- Isso reintroduz dados legados (V1/V2) no pipeline V3
- Viola o princípio: "Anamnese é a ÚNICA fonte de verdade"

### 2. Fuzzy Match por Proximidade Calórica (Linhas 110-125)

**Código Problemático:**
```typescript
if (!selectedTemplate && !template_id) {
  console.log("[ClinicalEngine] No exact kcal match. Trying fuzzy match.");
  const { data: allTemplates } = await supabase
    .from("v3_diet_templates")
    .select("*")
    .eq("active", true)
    .limit(20);
  
  selectedTemplate = allTemplates?.sort((a, b) => {
    const aProfiles = a.kcal_profiles || [];
    const bProfiles = b.kcal_profiles || [];
    const aDiff = Math.min(...aProfiles.map((k: number) => Math.abs(k - targetKcal)));
    const bDiff = Math.min(...bProfiles.map((k: number) => Math.abs(k - targetKcal)));
    return aDiff - bDiff;
  })[0];
}
```

**Problema:**
- "Fuzzy match" é **heurística**, não determinismo
- Viola o contrato V3: "Seleção de template é determinística"
- Pode retornar templates diferentes para mesma entrada em execuções diferentes

### 3. Snapshot Extraction por "Melhor Match" (Linhas 127-135)

**Código Problemático:**
```typescript
const snapshotKeys = Object.keys(snapshots).map(Number).sort((a, b) => Math.abs(a - targetKcal) - Math.abs(b - targetKcal));
const bestSnapshotKey = snapshotKeys[0];
```

**Problema:**
- Usa arredondamento/proximidade em vez de match exato
- Não é determinístico se houver múltiplos snapshots com mesma distância

---

## ✅ O Que Está Correto

- ✅ `generate-meal-plan/index.ts` usa `ClinicalEngine` (correto)
- ✅ `clinical-engine.ts` existe e tem estrutura correta
- ✅ Usa `patient_anamnesis` como fonte primária (correto)
- ✅ Calcula TMB/TDEE/macros corretamente (correto)
- ✅ Busca templates em `v3_diet_templates` (correto)
- ✅ Cria `meal_plans` com snapshot (correto)

---

## ❌ O Que Está Quebrado

| Item | Status | Problema |
|------|--------|----------|
| Fallback para profiles | ❌ QUEBRADO | Reintroduz dados legados |
| Fuzzy match de templates | ❌ QUEBRADO | Não é determinístico |
| Snapshot extraction | ❌ QUEBRADO | Usa proximidade, não match exato |
| Tratamento de erros | ❌ QUEBRADO | Silencia falhas de anamnese |

---

## 🔧 Plano de Correção

### Correção 1: Remover Fallback Silencioso

**Antes:**
```typescript
} else {
  // Fallback: If no anamnesis, check profile but warn
  const { data: profile } = await supabase...
  // ... recalcula
}
```

**Depois:**
```typescript
} else {
  throw new Error("ANAMNESIS_MISSING: Anamnese incompleta ou não encontrada. Paciente deve completar onboarding.");
}
```

**Impacto:** Falhas são explícitas, não silenciosas.

### Correção 2: Remover Fuzzy Match

**Antes:**
```typescript
if (!selectedTemplate && !template_id) {
  console.log("[ClinicalEngine] No exact kcal match. Trying fuzzy match.");
  selectedTemplate = allTemplates?.sort((a, b) => {
    // ... fuzzy logic
  })[0];
}
```

**Depois:**
```typescript
if (!selectedTemplate && !template_id) {
  throw new Error(`Nenhum template exato encontrado para ${targetKcal} kcal. Solicite ao nutricionista um template específico.`);
}
```

**Impacto:** Força seleção explícita de template, não heurística.

### Correção 3: Match Exato de Snapshot

**Antes:**
```typescript
const snapshotKeys = Object.keys(snapshots).map(Number).sort((a, b) => Math.abs(a - targetKcal) - Math.abs(b - targetKcal));
const bestSnapshotKey = snapshotKeys[0];
```

**Depois:**
```typescript
const snapshotKey = targetKcal.toString();
if (!snapshots[snapshotKey]) {
  throw new Error(`Snapshot exato para ${targetKcal} kcal não encontrado. Template ${selectedTemplate.title} não suporta essa caloria.`);
}
const snapshot = snapshots[snapshotKey];
```

**Impacto:** Determinismo garantido, sem ambiguidade.

---

## 📊 Impacto da Degradação

| Aspecto | Antes (Sprint J) | Depois (Lovable) | Impacto |
|---------|------------------|------------------|---------|
| Determinismo | ✅ 100% | ❌ ~70% | Perda de confiabilidade |
| Fonte de Verdade | ✅ Anamnese | ❌ Anamnese + Profiles | Contaminação de dados |
| Seleção de Template | ✅ Exata | ❌ Heurística | Não reproduzível |
| Tratamento de Erros | ✅ Explícito | ❌ Silencioso | Difícil de debugar |

---

## 🚨 Recomendação

**RESTAURAR IMEDIATAMENTE:**

1. Remover fallback para `profiles`
2. Remover fuzzy match de templates
3. Implementar match exato de snapshots
4. Tornar todos os erros explícitos

**Tempo Estimado:** 15 minutos

**Risco:** Baixo (apenas remove fallbacks, não altera lógica principal)

---

## ✅ Checklist de Validação Pós-Correção

- [ ] Nenhum fallback silencioso para `profiles`
- [ ] Nenhum fuzzy match de templates
- [ ] Snapshot extraction é determinístico
- [ ] Todos os erros são explícitos
- [ ] Testes passam
- [ ] Commit e push

---

**Status:** 🔴 CRÍTICO — Aguardando correção imediata
