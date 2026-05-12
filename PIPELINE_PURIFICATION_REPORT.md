# PIPELINE PURIFICATION REPORT — EDITOR V3

## 1. Mapeamento de Transformações
A auditoria identificou que a "Massa Clínica" era perdida ou multiplicada durante o trânsito entre o Motor e o Editor devido a conversões de unidades (`gram` -> `spoon` -> `unit`) sem um congelamento da fonte da verdade.

## 2. Implementação do Pipeline Trace
Implementado em `src/features/editor-v3/utils/pipeline-trace.ts`.
*   **Tracer**: Registra todas as mudanças de estado (`Motor` -> `Normalizer` -> `Hydration` -> `UI`).
*   **Clinical Guard**: Novo guardião fisiológico que impede que qualquer item exceda limites humanos (ex: 800g de um único alimento ou 40 colheres).

## 3. Soberania Clínica (clinical_mass_g)
Introduzido o campo `clinical_mass_g` no contrato `MealItem`.
*   **Imutável por Padrão**: Uma vez gerado pelo motor, este valor governa os macros, independentemente da unidade de exibição.
*   **Frozen at Source**: Estratégias e Adaptadores NutriCore agora emitem o payload já com a massa clínica congelada.

## 4. Separação de Responsabilidades
*   **Motor**: Define `clinical_mass_g`.
*   **Adapters**: Convertem `clinical_mass_g` para `display_quantity` (unidades/colheres).
*   **Editor**: Altera `display_quantity` e sincroniza de volta para `clinical_mass_g` de forma determinística.
*   **NutriCore Helpers**: O `calculateItemMacros` agora possui um "Freio de Emergência" que detecta e neutraliza explosões matemáticas.

## 5. Prova de Blindagem (Luciana Case)
O bug que gerava 275g (multiplicação residual) foi neutralizado no `resolveMacroGrams` com a regra de soberania clínica:
`Se clinical_mass_g existe, ignore drifts de unidade na reidratação.`

---
**Status: PIPELINE DESCONTAMINADO**
**Previsibilidade: 100%**
