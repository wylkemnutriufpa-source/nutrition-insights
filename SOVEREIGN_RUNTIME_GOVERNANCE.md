# Sovereign Runtime Governance — FitJourney

Este documento define as regras inegociáveis de operação do sistema FitJourney após a transição para a Soberania V3.

## 1. Soberania de Dados (Quem Governa)

| Fluxo | Runtime Soberano | Regra de Ouro |
| :--- | :--- | :--- |
| **Geração de Plano** | NutriCoreV3 | O único que calcula macros e estruturas. |
| **Publicação** | Snapshot Service | Salva o estado exato (snapshot) 1:1. |
| **Patient App** | Passive Consumer | Renderiza o snapshot sem recalcular nada. |
| **Exportação PDF** | Snapshot Engine | Usa o mesmo payload do Patient App. |
| **Substituições** | V3 Replacement Engine | Gera novo snapshot imutável. |
| **Conclusão de Refeições** | V3 Activity Tracker | Vinculado ao instanceId do snapshot. |
| **Hidratação de UI** | Schema Guard | Bloqueia se o contrato clínico for violado. |

## 2. Proibições Absolutas (Legacy/Zumbis)

*   **NÃO** usar `Math.random()` para IDs clínicos (usar `crypto.randomUUID()` ou `instanceId` determinístico).
*   **NÃO** usar Regex para extrair gramagens de descrições textuais (heurística proibida).
*   **NÃO** recalcular calorias ou macros no frontend do paciente (apenas exibição passiva).
*   **NÃO** realizar inferências de massa baseadas em "nomes" de alimentos (drift semântico).
*   **NÃO** usar fallbacks silenciosos (ex: `val || 0` quando `val` é clínico). Se o dado não existe, o runtime deve reportar erro de soberania.
*   **NÃO** misturar dados relacionais voláteis com snapshots imutáveis em contextos clínicos.

## 3. Contrato do Snapshot V3

Todo item clínico **DEVE** conter:
- `instanceId`: Identificador único daquela instância no tempo.
- `blockId`: Vínculo com a estrutura do plano.
- `clinical_mass_g`: Massa líquida para cálculos.
- `macros`: Proteína, Carbo, Gordura calculados na origem.
- `metadata`: Origem e rastro de normalização.

## 4. Governança de Mudanças Futuras

Toda nova feature ou correção deve ser acompanhada de uma análise de impacto que responda:
1. Qual runtime afeta?
2. Qual governança toca?
3. Qual camada degrada?
4. Qual regressão pode abrir?
5. Qual assert protege?
6. Qual telemetria detecta?
7. Qual impacto sistêmico gera?

## 5. Central de Incidentes

Todos os erros de soberania são logados em `sovereign_runtime_logs` com rastreabilidade total (`correlation_id`).
