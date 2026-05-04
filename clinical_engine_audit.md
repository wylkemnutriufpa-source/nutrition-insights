# Clinical Engine Audit - FitJourney

## 1. Mapeamento das Engines Ativas

| Engine | Versão | Localização | Estratégias Suportadas | Observação |
|---|---|---|---|---|
| **Unified Engine (v8)** | 8.0.0 | `supabase/functions/generate-meal-plan` | `ifj_standard`, `bikini_protocol`, `clinical_standard` | Motor principal, suporta estratégias dinâmicas. |
| **Deterministic Engine (v2)** | 2.0.0 | `supabase/functions/generate-meal-plan-v2` | - | Motor legado/específico, baseado em templates fixos. |
| **Legacy BB Engine** | - | `supabase/functions/generate-bb-meal-plan` | - | Depreciado. Redireciona para o Unified (v8). |
| **Frontend V3 Engine** | 3.0.0 | `src/features/clinical-engine/services/engine.ts` | - | Lógica determinística rodando no navegador. |

## 2. Mapa de Uso

| Canal | Engine Utilizada | Fluxo |
|---|---|---|
| **Onboarding** | Unified Engine (v8) | `process-meal-plan-jobs` -> `generate-meal-plan` |
| **Editor V3** | Frontend V3 Engine | `useEditorState` -> `generatePlanWithEngine` (Client-side) |
| **Strategy Consultant** | Clinical Decision Support | Analisa métricas, sugere ajustes e protocolos. |
| **Geração Manual** | Unified Engine (v8) | Chamada direta ao endpoint `generate-meal-plan`. |

## 3. Conflitos e Divergências Identificadas

1. **Duplicação de Lógica (JS vs TS Edge)**: O Editor V3 implementa sua própria lógica de geração no frontend, divergindo das regras clínicas definidas no backend.
2. **Redundância v2 vs v8**: O `generate-meal-plan-v2` mantém templates hardcoded que já poderiam estar no Unified Engine como uma `strategy`.
3. **Entradas Inconsistentes**: Cada motor espera formatos de input ligeiramente diferentes (ex: `patientId` vs `patient_id`).
4. **Respostas Divergentes**: O formato do JSON de saída varia entre as engines, dificultando a persistência unificada.

## 4. Dependências Mapeadas

- **food_database**: Todas engines dependem desta tabela.
- **meal_visual_library**: Utilizada pela Unified Engine (v8) para seleção de imagens e templates visuais.
- **clinical-macro-engine.ts**: Módulo compartilhado no backend para cálculos de TDEE/Macros.
- **clinical-rules.ts**: Regras clínicas compartilhadas no backend.
