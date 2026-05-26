# Governança de Soberania Clínica V3 — FitJourney

Este documento estabelece a camada semântica e as políticas de governança clínica do Motor V3, garantindo que o determinismo matemático seja acompanhado de integridade fisiológica.

## 1. Matriz de Estados Fisiológicos

Abaixo, os estados soberanos que regem o ciclo de vida de um snapshot no V3:

| Estado | Significado | Gatilho | Impacto Clínico | Comportamento Engine | Comportamento UI | Auditoria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **auditado** | Validado individualmente por nutricionista sênior. | Aprovação manual pós-reconstrução. | Confiança máxima; padrão-ouro. | Prioridade máxima na seleção. | Badge de "Soberania Validada". | Histórico de aprovação preservado. |
| **fisiologicamente_reconstruido** | Processado pela reconstrução V3 com densidade real. | Sucesso na etapa de reconstrução técnica. | Alta coerência entre itens e macros. | Execução plena sem avisos. | Exibição normal de macros. | Relatório de divergência < 5%. |
| **nutrition_pending_reconstruction** | Snapshot estruturalmente válido mas sem densidade nutricional. | Detecção de macros zerados ou placeholders. | Risco de desnutrição/vazio calórico. | **Bloqueio total** de seleção. | Ocultar do catálogo de geração. | Flag de urgência técnica. |
| **safe_adaptation** | Pequeno ajuste necessário para fechar target (Kcal/Macros). | Divergência técnica entre 1% e 5%. | Seguro para o paciente; desvio desprezível. | Execução com log de "provenance_adjustment". | Normal (oculta ajuste técnico). | Nota de adaptação registrada. |
| **physiologically_incompatible** | Alimentos selecionados não comportam o target solicitado. | Volume excessivo ou densidade insuficiente. | Risco de baixa adesão ou desconforto gástrico. | **Sinalização explícita** no provenance. | Alerta de "Volume Crítico". | Falha na validação nutricional. |
| **requires_clinical_review** | Conflito semântico entre itens e metas metabólicas. | Itens contraditórios ao protocolo (ex: açúcar em cetogênica). | Risco de quebra de protocolo clínico. | **Suspensão imediata** do template. | Mensagem de "Revisão Necessária". | Bloqueio de exportação. |
| **unsafe_target** | Target de Kcal ou Macros fora das margens de segurança biológica. | Kcal < TMB ou macros em desequilíbrio severo. | Risco direto à saúde (perda de massa magra/coma). | **Rejeição total** pelo Orchestrator. | Erro crítico de segurança. | Denúncia automática no dashboard. |

## 2. Matriz de Risco Clínico

Classificação de templates baseada na complexidade e sensibilidade biológica:

| Nível de Risco | Critérios | Exemplos de Protocolo | Frequência de Auditoria |
| :--- | :--- | :--- | :--- |
| **Baixo** | Hipercalóricos, Manutenção, Reeducação geral. | Bulking, Dieta Mediterrânea. | Semestral. |
| **Moderado** | Déficits leves, restrição moderada de carbo. | Low Carb Padrão, Emagrecimento 2k Kcal. | Trimestral. |
| **Alto** | Restrições severas, protocolos monofásicos. | Detox, Jejum Intermitente agressivo. | Mensal. |
| **Crítico** | Adaptação cirúrgica, patologias, déficits extremos. | Bariátrica (Líquida/Pastosa), Cetogênica Terapêutica. | A cada alteração (Bloqueio V3). |

## 3. Política de Soberania Proteica

No V3, a proteína é tratada como a **âncora fisiológica** do plano.

*   **Regra de Ouro:** A proteína **NUNCA** deve ser sacrificada, reduzida ou "arredondada para baixo" para fechar um target calórico.
*   **Piso Absoluto:** Mínimo de 1.2g/kg (ou valor definido no protocolo) deve ser mantido mesmo que o target calórico seja atingido prematuramente.
*   **Protocolos Especiais:** Em protocolos de emagrecimento severo, a densidade proteica deve subir proporcionalmente à queda calórica (Soberania de Preservação de Massa Magra).
*   **Veto Clínico:** Qualquer template que apresente < 0.8g/kg de proteína é automaticamente invalidado como `unsafe_target`.

## 4. Política de Incompatibilidade

Quando a biologia entra em conflito com a matemática, a Engine V3 assume postura conservadora:

1.  **Sinalização sobre Compensação:** O sistema **não** irá aumentar artificialmente a gramagem de um item para fechar Kcal se isso violar a densidade do item (ex: 500g de pão em uma refeição).
2.  **Preservação da Segurança:** Se o target não fecha com os itens disponíveis, o sistema mantém o valor real e marca como `physiologically_incompatible`.
3.  **Transparência de Provenance:** O motivo exato da falha (ex: "carbo_deficit_volume_limit") deve ser persistido no rastro de provenance.

## 5. Critérios para Gate Futuro (Curadoria Soberana)

Critérios obrigatórios para que um template seja promovido ao Catálogo V3 Oficial:

*   **Aprovação:** Fechamento de Kcal (95-105%), Macros (90-110%) e Fechamento Matemático 4/4/9 validado.
*   **Revisão Obrigatória:** Templates do Grupo 2 (Sensíveis) exigem assinatura digital de um nutricionista.
*   **Invalidação Automática:** Snapshots com itens sem gramagem definida ou com macros discrepantes da tabela base > 15%.
*   **Monitoramento:** Templates com alta taxa de `safe_adaptation` devem ser recalibrados na base para evitar drift.

---
*Documento emitido em 26 de Maio de 2026 — FitJourney Clinical Governance Board.*
