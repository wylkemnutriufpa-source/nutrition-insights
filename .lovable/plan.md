# Plano: Estabilização Operacional Biblioteca V3

**Diretriz absoluta:** ZERO features novas. ZERO templates novos. ZERO famílias. Foco único: fazer o que já existe funcionar de verdade — ou falhar explicitamente.

---

## Fase 0 — Auditoria Forense (read-only, antes de tocar código)

Antes de qualquer alteração, gerar `OPERATIONAL_STABILITY_REPORT.md` com evidências concretas:

1. **Mapa de fluxo real** das 6 rotas críticas: gerar plano → resolver template → renderizar refeição → abrir modal → trocar refeição → substituir alimento.
2. **Inventário de pontos de contaminação** — onde ainda existe heurística textual / fallback silencioso / scaling agressivo / cruzamento de meal_type.
3. **Diff entre Biblioteca V3 soberana e o que a UI realmente consome** (resolver vs. render).
4. **Lista nominal** de cada bug citado: picanha→arroz, café com feijão, alface 330g, "Trocar refeição" sem efeito, 2 botões X, expand/collapse, templates não plotam.

Saída: relatório com arquivo, função, linha e classificação (LEGADO / ZUMBI / FALLBACK / SCALING INDEVIDO).

---

## Fase 1 — Integridade de meal_type (bloqueio duro)

**Problema:** café da manhã recebendo arroz, feijão, picanha.

- Centralizar regra em `src/features/clinical-engine/rules/mealTypeIntegrity.ts` (já existe parcialmente em `pipeline-trace.ts`; consolidar).
- Whitelist por slot:
  - `breakfast`: cereais, frutas, laticínios, ovos, pães integrais, oleaginosas, peito de frango/peru desfiado.
  - `morning_snack` / `afternoon_snack`: frutas, iogurte, oleaginosas, shake, peito desfiado.
  - `lunch` / `dinner`: proteína animal principal + carbo + vegetais + gordura.
  - `supper`: snacks leves / lanches.
- Blacklist explícita por slot (arroz/feijão/picanha em breakfast, pão/bolo em lunch).
- Guard roda em **3 pontos**: geração (resolver), substituição (modal), renderização (UI defensiva que esconde + telemetria).
- Falha **explícita** com toast + telemetria — nunca silenciosa.

---

## Fase 2 — `substitution_category` soberana

**Problema:** picanha sugerindo arroz/feijão/batata.

- Adicionar coluna/campo `substitution_category` ao catálogo (`foods` / `meal_visual_library`):
  - `protein_animal`, `protein_plant`, `carb_complex`, `carb_simple`, `fruit`, `breakfast_base`, `dairy`, `fat`, `vegetable_free`.
- Resolver de substituições (`libraryV3Resolver.ts` + `MealSubstitutionPanel.tsx` + `MealDetailModal.tsx`) **só** lista candidatos com a **mesma** `substitution_category` do alimento âncora.
- Migration de backfill (script idempotente) classificando o catálogo atual.
- Bloqueio cross-category com erro explícito, não silencioso.

---

## Fase 3 — Vegetais com `portion_mode='free'`

**Problema:** alface 330g, brócolis escalando como proteína.

- Campo `portion_mode`: `scaled` (default) | `free` (vegetais folhosos/não-amiláceos).
- `free` ⇒ porção fixa de referência (ex.: 80–100g), **nunca** participa do scaling de macros, **nunca** aparece como substituição principal de proteína/carbo, **nunca** vira refeição sozinho.
- Aplicar em `meal-builder.ts`, `clinical-engine` scaling e renderização.

---

## Fase 4 — "Trocar Refeição" funcional

**Problema:** botão sem efeito.

- Refazer fluxo único em `MealSubstitutionModal` / `MealDetailModal`:
  1. Abrir modal com refeição atual + macros-alvo.
  2. Listar candidatos do mesmo `meal_type` e perfil kcal compatível (±10%).
  3. Preview de macros antes de confirmar.
  4. Confirmar ⇒ persistir via mesmo caminho do resolver (sem bypass).
- Telemetria de cada passo. Falha = toast + log, nunca toast verde mentiroso.

---

## Fase 5 — UX cirúrgica (modal único)

Auditar `MealDetailModal` + `MealSubstitutionModal` + `MealSmartEditorModal`:

- 1 único botão de fechar (X) no topo direito.
- Fechar clicando fora.
- Expand/collapse das substituições funcionando (estado controlado, não duplicado).
- Substituições renderizadas **dentro** do modal da refeição principal (regra já memorizada — re-validar).
- Botão "remover alimento" só aparece quando o item é removível; senão, não renderiza.

---

## Fase 6 — Templates: pipeline ponta a ponta

Validar `dietTemplateService` → `templateIntelligence` → `libraryV3Resolver` → render:

- Selecionar template + perfil kcal ⇒ resolver retorna draft completo.
- Draft abre no modal de revisão (já existe) com todas as refeições plotadas.
- Falha de resolver ⇒ erro explícito (sem cair em fallback heurístico).
- Adicionar 1 teste E2E mínimo por template oficial.

---

## Fase 7 — Eliminação de fallbacks silenciosos

Varredura por `try/catch` que engole erro, `|| []`, `?? defaultMeal`, normalização textual de alimentos:

- Substituir por: log estruturado + telemetria `SovereignTelemetry.abort` + UI mostra estado de erro.
- Lista produzida na Fase 0; cada item tratado individualmente.

---

## Entregáveis

1. `OPERATIONAL_STABILITY_REPORT.md` (Fase 0 + checklist final).
2. Código alterado **somente** nas áreas listadas — sem refactor cosmético.
3. Testes adicionados:
   - `mealTypeIntegrity.spec.ts`
   - `substitutionCategory.spec.ts`
   - `vegetableFreePortion.spec.ts`
   - `swapMealFlow.spec.ts`
4. Atualização da memory `clinico/blindagem-ifj-hierarquia-e-motor-de-selecao-v2`.

---

## Fora de escopo (explicitamente bloqueado)

- Novos templates, novas famílias, novas telas.
- Refactor visual.
- Mudanças no editor manual ("Plano do Zero").
- Qualquer alteração no motor clínico imutável (`CLINICAL_ENGINE_LOCK`).

---

## Detalhes técnicos

**Arquivos-âncora a auditar (não exaustivo):**
- `src/features/editor-v3/services/libraryV3Resolver.ts`
- `src/features/editor-v3/services/templateIntelligence.ts`
- `src/features/editor-v3/services/dietTemplateService.ts`
- `src/features/editor-v3/utils/v3VisualEngine.ts`
- `src/components/patient/MealDetailModal.tsx`
- `src/components/patient/MealSubstitutionModal.tsx`
- `src/components/meal-editor-v2/MealSmartEditorModal.tsx`
- `src/components/meal-editor-v2/MealSubstitutionPanel.tsx`
- `src/modules/FitJourney2/core/meal-builder.ts`

**Critério de aceite por fase:** teste automatizado verde + validação visual no preview com paciente real (Luciana / Débora / Catharina) — sem afirmar correção sem ver a tela.

---

**Aprovação necessária antes de começar.** Confirme se aprova o escopo (ou diga o que tirar/incluir) que eu inicio pela Fase 0.
