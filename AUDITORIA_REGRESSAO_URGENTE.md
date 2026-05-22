# 🚨 AUDITORIA DE REGRESSÃO CRÍTICA - FITJOURNEY 2.0

## ❌ REGRESSÃO IDENTIFICADA

**Data:** 21/05/2026 14:45  
**Severidade:** CRÍTICA  
**Impacto:** Sistema de geração de planos COMPLETAMENTE QUEBRADO

---

## 🔍 DESCOBERTA

A edge function `generate-meal-plan` **FOI DELETADA** do sistema!

### Evidências:

1. **Pasta não existe:**
   ```
   ❌ supabase/functions/generate-meal-plan/
   ```

2. **Código frontend ainda chama a função:**
   ```typescript
   // src/components/plans/SmartPlanGenerator.tsx (linha 165)
   const { data, error } = await invokeWithRetry("generate-meal-plan", {
     body: { ... }
   });
   ```

3. **Outras funções ainda invocam:**
   - `process-meal-plan-jobs/index.ts` (linha 47)
   - `inngest/index.ts` (linha 30)
   - `inngest/functions.ts` (linha 25)
   - `generate-bb-meal-plan/index.ts` (linha 50)

4. **Testes ainda referenciam:**
   - `tests/clinical-engine.test.ts`
   - `tests/marmita-flow.test.ts`
   - E2E tests

---

## 🎯 CAUSA RAIZ

**HIPÓTESE MAIS PROVÁVEL:**

O Lovable (ou algum agente AI) **deletou a pasta** `generate-meal-plan` durante uma "limpeza de código morto".

**POR QUE ISSO ACONTECEU:**

1. ✅ Vocês removeram engines legadas (correto)
2. ✅ Vocês limparam código morto (correto)
3. ❌ **MAS** alguém/algo interpretou que `generate-meal-plan` era "código morto"
4. ❌ A função foi deletada SEM verificar dependências
5. ❌ Sistema ficou quebrado silenciosamente

---

## 📊 IMPACTO

### Funcionalidades Quebradas:

1. ❌ **Botão "Gerar Plano"** no SmartPlanGenerator
2. ❌ **Geração automática** no onboarding
3. ❌ **Jobs assíncronos** de geração de planos
4. ❌ **Inngest workflows** de geração
5. ❌ **Protocolo Biquini Branco** (usa generate-bb-meal-plan que chama generate-meal-plan)

### Usuários Afetados:

- ❌ Nutricionistas não conseguem gerar planos
- ❌ Pacientes não conseguem completar onboarding
- ❌ Sistema de automação parado

---

## 🛡️ ARQUITETURA SOBERANA VIOLADA

### Princípios Violados:

1. **"Snapshot é verdade única"** → ✅ MANTIDO (não foi violado)
2. **"Sem heurística/inferência"** → ✅ MANTIDO (não foi violado)
3. **"Código determinístico"** → ✅ MANTIDO (não foi violado)
4. **"Dependências explícitas"** → ❌ **VIOLADO** (função deletada sem verificar dependências)

### O Que Deveria Ter Acontecido:

1. ✅ Verificar TODAS as referências à função
2. ✅ Criar função substituta ANTES de deletar
3. ✅ Migrar chamadas gradualmente
4. ✅ Testar TUDO antes de deletar
5. ✅ Documentar a mudança

### O Que Aconteceu:

1. ❌ Função deletada diretamente
2. ❌ Sem verificação de dependências
3. ❌ Sem migração
4. ❌ Sem testes
5. ❌ Sem documentação

---

## 🔧 SOLUÇÃO IMEDIATA

### Opção 1: Restaurar a Função (RECOMENDADO)

1. Verificar se existe backup/commit anterior
2. Restaurar pasta `generate-meal-plan`
3. Verificar se está funcionando
4. Deploy urgente

### Opção 2: Criar Função Nova

1. Criar `supabase/functions/generate-meal-plan/index.ts`
2. Implementar lógica SOBERANA (sem heurística)
3. Usar apenas:
   - `ClinicalEngine` para métricas
   - Templates soberanos do banco
   - Snapshot como verdade única
4. Testar localmente
5. Deploy urgente

---

## 📝 CÓDIGO DA FUNÇÃO (RECONSTRUÇÃO SOBERANA)

```typescript
// supabase/functions/generate-meal-plan/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ClinicalEngine } from "../_shared/clinical-engine.ts";

serve(async (req) => {
  try {
    const { patientId, nutritionistId, generationMode, professionalOverride } = await req.json();

    // 1. Buscar dados do paciente
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: patient } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", patientId)
      .single();

    if (!patient && !professionalOverride) {
      return new Response(
        JSON.stringify({ success: false, code: "ANAMNESIS_MISSING" }),
        { status: 422 }
      );
    }

    // 2. Calcular métricas com ClinicalEngine
    const clinicalInput = {
      patientId,
      weight: professionalOverride?.weight || patient.current_weight_kg,
      height: professionalOverride?.height || patient.current_height_cm,
      age: professionalOverride?.age || calculateAge(patient.birth_date),
      sex: professionalOverride?.sex || patient.sex,
      goal: professionalOverride?.goal || patient.goal,
      activityLevel: professionalOverride?.activityLevel || patient.activity_level,
      restrictions: patient.dietary_restrictions || [],
      dislikedFoods: patient.disliked_foods || [],
      strategyId: generationMode === "clinical" ? "clinical_standard" : "ifj_standard"
    };

    const clinicalPlan = await ClinicalEngine.generateMealPlan(clinicalInput, supabase);

    // 3. Buscar template soberano do banco
    const targetKcal = clinicalPlan.metrics.target_kcal;
    const kcalRounded = Math.round(targetKcal / 100) * 100; // Arredondar para 100

    const { data: template } = await supabase
      .from("v3_diet_templates")
      .select("*")
      .eq("active", true)
      .eq("kcal", kcalRounded)
      .limit(1)
      .maybeSingle();

    if (!template) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Nenhum template encontrado para ${kcalRounded} kcal` 
        }),
        { status: 404 }
      );
    }

    // 4. Extrair snapshot do template (VERDADE ÚNICA)
    const snapshot = template.plan_snapshot?.[kcalRounded.toString()];

    if (!snapshot) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Template sem snapshot válido" 
        }),
        { status: 500 }
      );
    }

    // 5. Criar plano no banco com snapshot
    const { data: plan, error: planError } = await supabase
      .from("meal_plans")
      .insert({
        patient_id: patientId,
        nutritionist_id: nutritionistId,
        title: `Plano ${template.title}`,
        template_id: template.id,
        snapshot: snapshot, // SNAPSHOT É A VERDADE ÚNICA
        target_kcal: targetKcal,
        target_protein: clinicalPlan.metrics.macros.protein,
        target_carbs: clinicalPlan.metrics.macros.carbs,
        target_fat: clinicalPlan.metrics.macros.fat,
        plan_status: "draft",
        is_active: false,
        engine_version: clinicalPlan.engine_version,
        protocol_used: clinicalPlan.protocol_used
      })
      .select()
      .single();

    if (planError) throw planError;

    return new Response(
      JSON.stringify({
        success: true,
        mealPlanId: plan.id,
        items_count: snapshot.length * 6, // 7 dias * 6 refeições
        template_used: template.title
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-meal-plan] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
});

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
```

---

## 🎯 PRÓXIMOS PASSOS

### URGENTE (Agora):

1. ✅ Criar arquivo `AUDITORIA_REGRESSAO_URGENTE.md` (este arquivo)
2. ⏳ Decidir: Restaurar ou Recriar?
3. ⏳ Implementar solução escolhida
4. ⏳ Testar localmente
5. ⏳ Deploy urgente

### CURTO PRAZO (Hoje):

6. ⏳ Adicionar testes de integração
7. ⏳ Documentar a função
8. ⏳ Criar skill de proteção contra deleção

### MÉDIO PRAZO (Esta Semana):

9. ⏳ Criar sistema de detecção de dependências
10. ⏳ Adicionar CI/CD checks
11. ⏳ Documentar arquitetura completa

---

## 🛡️ PREVENÇÃO FUTURA

### Skills a Criar:

1. **skill-protect-critical-functions.md**
   ```markdown
   # FUNÇÕES CRÍTICAS - NÃO DELETAR
   
   As seguintes funções são CRÍTICAS e NÃO PODEM ser deletadas:
   - generate-meal-plan
   - validate-meal-plan
   - ifj-core-router
   
   Antes de deletar QUALQUER função:
   1. Verificar TODAS as referências
   2. Criar função substituta
   3. Migrar chamadas
   4. Testar TUDO
   5. Documentar mudança
   ```

2. **skill-dependency-check.md**
   ```markdown
   # VERIFICAÇÃO DE DEPENDÊNCIAS
   
   Antes de deletar QUALQUER arquivo:
   1. Executar: grep -r "nome-do-arquivo" .
   2. Verificar TODAS as referências
   3. Se houver referências, NÃO DELETAR
   4. Criar issue para migração
   ```

3. **skill-soberania-v3.md**
   ```markdown
   # ARQUITETURA SOBERANA V3
   
   PRINCÍPIOS INVIOLÁVEIS:
   1. Snapshot é verdade única
   2. Sem heurística/inferência
   3. Código determinístico
   4. Dependências explícitas ← VIOLADO NESTA REGRESSÃO
   ```

---

## 📊 LIÇÕES APRENDIDAS

### O Que Deu Errado:

1. ❌ Confiança excessiva em "limpeza automática"
2. ❌ Falta de verificação de dependências
3. ❌ Falta de testes de integração
4. ❌ Falta de CI/CD checks

### O Que Fazer Diferente:

1. ✅ SEMPRE verificar dependências antes de deletar
2. ✅ SEMPRE criar substituto antes de deletar
3. ✅ SEMPRE testar após mudanças
4. ✅ SEMPRE documentar mudanças críticas

---

## 🚨 CONCLUSÃO

**A regressão NÃO foi causada por violação da arquitetura soberana.**

**A regressão foi causada por DELEÇÃO ACIDENTAL de função crítica.**

**Solução:** Restaurar ou recriar `generate-meal-plan` URGENTEMENTE.

---

**Última atualização:** 21/05/2026 14:45  
**Status:** 🔴 CRÍTICO - AGUARDANDO CORREÇÃO
