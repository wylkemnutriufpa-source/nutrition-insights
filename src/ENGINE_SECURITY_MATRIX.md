# Matriz de Segurança Operacional — Motor Clínico FitJourney

Esta matriz mapeia a criticidade e o risco de regressão dos módulos que compõem o motor determinístico V3.

| Módulo | Criticidade | Risco de Regressão | Impacto Clínico | Impacto Visual | Dependências | Status Atual | Pronto para Remoção? | Precisa Adapter? | Precisa Testes? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `clinical-engine.ts` | **CRÍTICA** | ALTO | TOTAL | NULO | `strategies.ts`, `macro-engine` | Operacional (V3) | NÃO | NÃO | SIM |
| `WeeklyComposer` | **CRÍTICA** | ALTO | MÉDIO | NULO | `deterministicRng.ts` | Operacional (V3) | NÃO | NÃO | SIM |
| `deterministicRng.ts` | **CRÍTICA** | MÉDIO | BAIXO | NULO | NENHUMA | Estável | NÃO | NÃO | SIM |
| `NutriCoreV3Adapter` | ALTA | MÉDIO | BAIXO | NULO | `template-resolver.ts` | Em transição | NÃO | SIM | SIM |
| `metabolic-twin-engine` | ALTA | ALTO | TOTAL | MÉDIO | `bodyProjectionEngine.ts` | Operacional | NÃO | NÃO | SIM |
| `App.tsx` (Toggle) | BAIXA | BAIXO | NULO | BAIXO | NENHUMA | Legado (V1/V2) | **SIM (Fase 1)** | SIM | NÃO |
| `clinical-macro-engine` | **CRÍTICA** | ALTO | TOTAL | NULO | NENHUMA | Core | NÃO | NÃO | SIM |
| `template-resolver` | ALTA | ALTO | MÉDIO | MÉDIO | `strategies.ts` | Contaminado (V2) | NÃO | SIM | SIM |

## Legenda de Criticidade
- **CRÍTICA**: Falha resulta em erro de prescrição clínica ou cálculo de macros errado.
- **ALTA**: Falha impede a geração do plano ou causa inconsistência entre rascunho e finalização.
- **MÉDIA/BAIXA**: Impacto limitado a interface ou UX, sem risco metabólico.

## Próximos Passos de Estabilização
1.  [X] Criação da Matriz (Esta).
2.  [ ] Implementação de Modo Degradado em `clinical-engine.ts`.
3.  [ ] Desativação do Toggle em `App.tsx`.
4.  [ ] Snapshot de regressão para `NutriCoreV3Adapter`.
