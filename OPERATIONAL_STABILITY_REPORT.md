# OPERATIONAL STABILITY REPORT — Biblioteca V3

Data: 2026-05-14
Escopo: contaminações operacionais reais detectadas vs. correções aplicadas nesta rodada.

## Contaminações detectadas (forense)

| # | Sintoma reportado | Arquivo / Linha | Classificação | Causa raiz |
|---|---|---|---|---|
| 1 | Tilápia / picanha aparecendo no café da manhã | `src/features/editor-v3/services/templateIntelligence.ts:130-170` | LEGADO | Variação semanal trocava item por substituição **sem validar meal_type** |
| 2 | Picanha sugerindo arroz / feijão / batata | `src/lib/substitutionGroups.ts:254` (`getValidSubstitutions`) | FALLBACK | Função não recebia `slot`, deixando candidatos cross-categoria passarem |
| 3 | Alface 330g / brócolis escalando como proteína | `src/features/editor-v3/services/libraryV3Resolver.ts:116-139` | SCALING INDEVIDO | Composition escalada linearmente, sem distinção `portion_mode='free'` |
| 4 | "Trocar refeição" no painel sugere itens fora do slot | `src/components/meal-editor-v2/MealSubstitutionPanel.tsx` (versão antiga) | ZUMBI | `SUBSTITUTION_GROUPS` hardcoded duplicado, paralelo ao sistema oficial |
| 5 | Modal do paciente com substituições contaminadas no fallback | `src/components/patient/MealSubstitutionModal.tsx:89-114` | FALLBACK | Fallback fuzzy não usava o guard de slot |

## Correções aplicadas nesta rodada

### 1. Guard centralizado (NOVO)
**Arquivo:** `src/lib/mealTypeIntegrity.ts`

Define autoridade única:
- `normalizeSlot()` — aliases pt-br → slot canônico
- `SLOT_ALLOWED_GROUPS` — whitelist de grupos por slot
- `SLOT_BLACKLIST_KEYWORDS` — blacklist textual por slot (arroz/feijão/picanha no café, pão/bolo no almoço, etc.)
- `isFoodAllowedInSlot()` — decisão final + telemetria via `SovereignTelemetry`
- `isFreePortionFood()` + `FREE_PORTION_MAX_GRAMS` (120g) — vegetais não escalam

Falha sempre **explícita** (log estruturado), nunca silenciosa.

### 2. `getValidSubstitutions(food, { slot })` (Fix 2 + 5)
**Arquivo:** `src/lib/substitutionGroups.ts`

Aceita `slot` no contexto e filtra candidatos via `isFoodAllowedInSlot`. Picanha em "lunch" agora **nunca** retorna café/pão/aveia.

### 3. Variação semanal blindada (Fix 1)
**Arquivo:** `src/features/editor-v3/services/templateIntelligence.ts`

- Detecta o slot do template
- Filtra `item.substitutions` pelo slot antes de escolher a do dia
- Vegetais com `isFreePortionFood` mantêm porção fixa (≤120g)
- Se nenhuma substituição válida sobra → mantém o item original (não força troca proibida)

### 4. Resolver com guard + clamp (Fix 3)
**Arquivo:** `src/features/editor-v3/services/libraryV3Resolver.ts`

- Cada `composition` passa por `isFoodAllowedInSlot` antes de virar `MealItem`
- Itens em `portion_mode='free'` não recebem `safeScale` — porção fixa, macros derivados da porção real

### 5. Painel de substituições do editor V2 reescrito (Fix 4)
**Arquivo:** `src/components/meal-editor-v2/MealSubstitutionPanel.tsx`

Eliminada a `SUBSTITUTION_GROUPS` hardcoded. Agora consome `getValidSubstitutions` com `{ slot }` derivado de `meal_type` do item.

### 6. Modal do paciente com `mealSlot` (Fix 5)
**Arquivo:** `src/components/patient/MealSubstitutionModal.tsx`

- Nova prop `mealSlot?: string`
- Mesmo as `options` vindas do snapshot do nutricionista são filtradas pelo guard (defesa em profundidade contra snapshots legados)
- Fallback fuzzy passa `slot` ao resolver
- Wire feito em 4 call sites: `PatientMealPlan.tsx`, `DailyMealPlanInline.tsx`, `PatientProfileMealPlan.tsx`, `ExpandableMealPlanCard.tsx`

## Fora do escopo desta rodada (Fases 4, 5, 6, 7 do plano)

Por **acordo de estabilidade**, NÃO toquei ainda:

- **Fase 4** — refazer fluxo "Trocar Refeição" do paciente (preview + persistência via resolver)
- **Fase 5** — UX cirúrgica do `MealDetailModal` (botões X duplicados, expand/collapse)
- **Fase 6** — validação ponta-a-ponta do pipeline de templates (`dietTemplateService` ainda usa `MOCK_TEMPLATES` quando o banco está vazio — fallback silencioso a investigar)
- **Fase 7** — varredura completa de `try/catch` silenciosos

Razão: cada uma dessas fases reescreve UI/fluxo. Antes de prosseguir preciso que você **valide visualmente na Luciana**:

1. Café da manhã NÃO traz mais arroz/feijão/picanha/tilápia
2. Almoço NÃO traz mais pão/bolo/café
3. Substituições da picanha SÓ mostram outras proteínas
4. Vegetais (alface/brócolis) ficam ≤120g

## Próximos passos sugeridos (após sua validação)

- Fase 4: refazer swap-meal flow
- Fase 5: consolidar X único + expand/collapse no `MealDetailModal`
- Fase 6: remover `MOCK_TEMPLATES` fallback ou marcá-lo como erro explícito
- Fase 7: auditoria de fallbacks silenciosos com lista nominal

## Telemetria

Cada bloqueio dispara `SovereignTelemetry.log` com `event_type: 'schema_violation'` e `runtime_source` identificando o ponto. Consulte `sovereign_runtime_logs` filtrando por `metadata->>reason in ('blacklist','group_mismatch')` para ver os bloqueios em produção.
