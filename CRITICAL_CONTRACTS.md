# 🛡️ CRITICAL CONTRACTS — Freeze Inteligente

> **Princípio:** Não protegemos código. Protegemos a EXPERIÊNCIA do usuário.

Este documento define os contratos imutáveis do FitJourney. Nenhuma alteração — por mais simples que pareça — pode quebrar estes comportamentos.

---

## 📜 OS 5 CONTRATOS IMUTÁVEIS

### 1. ACESSO DO PACIENTE (`patient_access`)
- Paciente só vê **seus próprios** planos
- Paciente só vê planos com status `published` ou `published_to_patient`
- Rota `/my-diet` nunca pode ser quebrada

### 2. GERAÇÃO DE PLANOS (`plan_generation`)
- Sempre retorna plano **válido**
- Nunca retorna **vazio**
- Nunca **mistura** `marmita` com `normal`
- Respeita `plan_type` em todos os itens
- Macros totais > 0

### 3. PUBLICAÇÃO (`publication`)
- Plano publicado nunca pode **desaparecer** (exceto via `archived` explícito)
- Plano publicado nunca pode **perder itens**
- Plano publicado nunca pode ficar **invisível** ao paciente

### 4. PERSISTÊNCIA (`persistence`)
- O que o frontend salva = exatamente o que o banco armazena
- **Zero mutações silenciosas**

### 5. CONTINUIDADE DA JORNADA (`journey_continuity`)
- Paciente nunca fica preso em "dead-end" (sem saída)
- Anamnese completa = Acesso garantido ao dashboard (independente do status)
- Falhas técnicas (WS/Rede) não bloqueiam o carregamento da jornada

---

## 🔒 CAMADAS DE PROTEÇÃO

| Camada | Arquivo | Função |
|---|---|---|
| **Contratos** | `src/lib/criticalContracts.ts` | Define as regras puras (snapshot → ok/violations) |
| **Guards** | `src/lib/contractGuards.ts` | `assertContract()` lança erro se violar |
| **Runtime** | `src/lib/regressionGuardRuntime.ts` | Detecta regressão antes/depois e cancela operação |
| **Logs** | `src/lib/regressionGuard.ts` | Persiste em `regression_guard_logs` |
| **Testes** | `src/test/criticalContracts.test.ts` | 23 testes que falham se contrato quebrar |

---

## ✅ COMO USAR

### Validar antes de retornar dados ao paciente
```ts
import { assertContract } from "@/lib/contractGuards";

const plans = await fetchPatientPlans(patientId);
assertContract("patient_access", {
  requestingPatientId: patientId,
  returnedPlans: plans,
  route: "/my-diet",
});
return plans;
```

### Proteger uma operação de publicação
```ts
import { withRegressionGuard } from "@/lib/regressionGuardRuntime";

await withRegressionGuard(
  "meal_plan_publish",
  () => snapshotPlan(planId),
  () => publishPlan(planId),
);
```

### Validar persistência
```ts
import { assertContract } from "@/lib/contractGuards";

assertContract("persistence", {
  expected: localItems,
  persisted: dbItems,
  keysToCompare: ["title", "calories_target", "protein_target"],
});
```

---

## 🟢 PERMITIDO (evolução livre)
- Melhorar UI / UX
- Adicionar features
- Refatorar código interno
- Trocar visualizações
- Adicionar componentes
- Otimizar queries

## 🔴 PROIBIDO (sem teste novo de contrato)
- Alterar comportamento final de acesso/geração/publicação/persistência
- Mudar regra de negócio sem validar contratos
- Alterar RLS de `meal_plans` sem rodar `criticalContracts.test.ts`
- Remover/alterar `assertContract` em pontos críticos

---

## 🧪 RODANDO OS TESTES

```bash
bunx vitest run src/test/criticalContracts.test.ts
```

**Política:** se qualquer teste de contrato falhar, a alteração **deve ser rejeitada** ou acompanhada de revisão explícita do contrato.

---

## 📊 RESULTADO

- **5 contratos** definidos
- **23 testes** automáticos
- **2 camadas de bloqueio** (assert + runtime guard)
- **0 travas** em arquivos — sistema continua evoluindo

> Quando algo "simples" quebrar algo "invisível", o teste de contrato vai pegar antes de chegar em produção.