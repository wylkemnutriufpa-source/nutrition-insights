# 🧊 WEEKLY COMPOSER — CONTRATO SOBERANO (FREEZE)

> **Status:** CONGELADO antes da Onda 2A.
> **Versão:** 1.0.0
> **Escopo:** Define os LIMITES inegociáveis do Weekly Composer.
> **Quem pode alterar:** apenas mediante nova migração de contrato + bump de versão + atualização de `mem://arquitetura/freeze-inteligente-contratos-criticos`.

---

## 1. NATUREZA

O Weekly Composer **É**:

> Um **executor determinístico de política alimentar**.

O Weekly Composer **NÃO É**:

- ❌ IA
- ❌ Recomendador
- ❌ Nutricionista
- ❌ Inferidor clínico
- ❌ Mecanismo adaptativo autônomo
- ❌ Otimizador livre

---

## 2. CAPACIDADES PERMITIDAS (whitelist fechada)

O Composer **PODE**:

- ✅ Resolver **rotação semanal** a partir de `rotation_pool` + seed determinístico
- ✅ Aplicar `behavior_profile` resolvido externamente
- ✅ Aplicar **constraints clínicas** (alergias, intolerâncias, religiosas, médicas, dislikes)
- ✅ **Materializar refeições** a partir de slots já definidos no template
- ✅ **Reconciliar macros** dentro dos clamps de elasticidade declarados
- ✅ Gerar **sequência determinística de 7 dias** (`day_of_week 0..6`)
- ✅ Anexar **substitution groups** (via `SubstitutionResolver` separado)
- ✅ Emitir **warnings estruturados** (tipados, auditáveis)
- ✅ Emitir `requires_review = true` quando não conseguir resolver

> Tudo que **não está nesta lista** é proibido por padrão.

---

## 3. CAPACIDADES PROIBIDAS (blacklist absoluta)

O Composer **NÃO PODE**:

- ❌ Buscar alimentos **fora do `rotation_pool`** declarado no slot
- ❌ **Inventar refeições** (sem slot correspondente no template)
- ❌ **Alterar targets clínicos** (kcal/prot/carb/fat)
- ❌ **Criar meal types** novos (apenas os existentes no template)
- ❌ **Ignorar restrictions** clínicas (alergias, religiosas, médicas)
- ❌ **Relaxar clamps de proteína** (mulheres ≤150g é absoluto)
- ❌ **Alterar `behavior_profile` sozinho** (recebe pronto, nunca decide)
- ❌ Usar **heurística aberta** ou randomização contextual
- ❌ **Chamar IA** (LLM, embeddings, classificadores externos)
- ❌ Fazer **fetch autônomo** (sem dados externos no meio do compose)
- ❌ **Persistir diretamente no banco** (Composer é puro; persistência é camada separada)
- ❌ **Reescrever snapshot** (snapshot é gerado por outra camada)
- ❌ **Corrigir silenciosamente** falhas clínicas (toda falha é visível)

---

## 4. PRINCÍPIO CENTRAL — NÃO IMPROVISA

> Se o Composer **não consegue resolver**, ele **NÃO IMPROVISA**.

Ele deve, em ordem:

1. **Falhar explicitamente** com erro tipado (`SlotPoolExhausted`, `ReconciliationFailure`, `ConstraintConflict`, `BehaviorProfileMismatch`).
2. **Emitir warning estruturado** com `slot_role`, `reason_code`, `gap`, `attempted_pool`.
3. **Pedir revisão** marcando o item/dia com `requires_review = true`.
4. **Devolver o resultado parcial** com `ok: false` para a camada superior decidir (UI, fallback de profile, swap manual).

**NUNCA**: substituir silenciosamente, completar com qualquer alimento, gerar refeição vazia, retornar dados sem warnings.

---

## 5. REGRA DE OURO — EXPLICABILIDADE TOTAL

> O Composer deve ser **previsível o suficiente** para que um nutricionista
> consiga entender **EXATAMENTE** por que cada refeição foi escolhida.

Toda decisão do Composer deve produzir uma **trilha de decisão** auditável:

```ts
type DecisionTrace = {
  slot_role: SlotRole;
  day_of_week: 0|1|2|3|4|5|6;
  chosen_food_id: string;
  chosen_from_pool: string[];
  rejected: Array<{ food_id: string; reason: ConstraintReason }>;
  seed_index: number;            // posição na sequência determinística
  scale_factor: number;          // dentro do elasticity clamp
  pivot_used: boolean;           // foi tocado pelo reconciler?
  warnings: ComposerWarning[];
};
```

Esta trilha **deve** ser exposta no resultado e logada — não é opcional.

---

## 6. ANTI-FRANKENSTEIN RULE

> Toda nova feature do Composer deve responder:
>
> **“Isso aumenta previsibilidade ou aumenta complexidade invisível?”**

Critérios objetivos para aceitar uma feature:

| Critério | Aceita | Rejeita |
|---|---|---|
| Resultado é determinístico dado mesmo input? | ✅ | ❌ |
| Decisão é explicável em 1 frase? | ✅ | ❌ |
| Adiciona estado oculto / cache implícito? | ❌ | ✅ |
| Substitui erro explícito por fallback silencioso? | ❌ | ✅ |
| Lê dados fora do contrato de input? | ❌ | ✅ |
| Mistura responsabilidades (rotation + substitution + persistence)? | ❌ | ✅ |

> Se aumentar **complexidade invisível**: **NÃO entra**.

---

## 7. CONTRATO DE INPUT/OUTPUT (resumo)

### Input (imutável durante compose)

```ts
type ComposerInput = {
  template: { id: string; version: number; slots: SlotDefinition[] };
  patient: { id: string; allergies: string[]; intolerances: string[];
             religious: string[]; medical: string[]; dislikes: string[] };
  targets: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  behavior_profile: BehaviorProfile;          // resolvido externamente
  seed: { plan_id: string; patient_id: string; template_id: string;
          template_version: number; composer_version: string };
};
```

### Output (sempre completo, mesmo em falha)

```ts
type ComposerOutput =
  | { ok: true;  days: DayPlan[]; traces: DecisionTrace[]; warnings: ComposerWarning[] }
  | { ok: false; days: DayPlan[]; traces: DecisionTrace[]; warnings: ComposerWarning[];
      failures: ComposerFailure[]; requires_review: true };
```

> **Nunca** retorna `null`, `undefined`, ou exceção não-tipada.

---

## 8. FRONTEIRAS COM OUTRAS CAMADAS

| Camada | Quem chama quem | Composer pode? |
|---|---|---|
| **Strategy Consultant** | chama Composer | ✅ |
| **SubstitutionResolver** | chamado APÓS compose | ❌ Composer não chama |
| **Persistence Layer** | chamado APÓS compose | ❌ Composer não persiste |
| **Snapshot Builder** | chamado APÓS compose | ❌ Composer não escreve snapshot |
| **PDF Renderer** | lê snapshot | ❌ Composer não conhece PDF |
| **UI (Editor V3)** | lê output | ❌ Composer não conhece UI |
| **LLM / IA** | — | ❌ **PROIBIDO** |

---

## 9. OBJETIVO FINAL

Transformar o Weekly Composer em:

> Um **motor clínico determinístico**,
> **auditável**,
> **explicável**,
> e **impossível de improvisar silenciosamente**.

---

## 10. ENFORCEMENT

- Toda PR que toque `supabase/functions/_shared/weekly-composer/` deve:
  1. Rodar `bunx vitest run src/test/criticalContracts.test.ts`
  2. Rodar a suíte específica `weekly-composer.contract.test.ts` (a ser criada na Onda 2A)
  3. Provar que **nenhuma capacidade da blacklist (Seção 3)** foi introduzida
  4. Provar que toda decisão produz `DecisionTrace`
- Violação deste contrato = **revert obrigatório**, não negociável.
- Mudança deste documento exige bump de versão + nota em `mem://arquitetura/freeze-inteligente-contratos-criticos`.

---

**FREEZE APROVADO. Pronto para Onda 2A (implementação do `composeSlotSequence` puro respeitando este contrato).**
