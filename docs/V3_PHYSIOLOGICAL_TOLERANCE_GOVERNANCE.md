# Governança de Tolerância Fisiológica V3

Este documento define os limites clínicos e operacionais para a validação de equivalências dentro do ecossistema V3. Ele estabelece as fronteiras entre a autonomia do editor e a soberania biológica do sistema.

## 1. Matriz de Tolerância Calórica

Define o desvio permitido entre o item original (Sovereign Item) e seu substituto (Equivalent Item).

| Categoria | Desvio (Kcal) | Ação do Sistema | Critério de Aceite |
| :--- | :--- | :--- | :--- |
| **Ideal** | ≤ 5% | Silencioso | Equivalência perfeita. |
| **Aceitável** | 6% - 10% | Alerta Informativo | Aceite automático, log de desvio. |
| **Revisão Obrigatória** | 11% - 20% | Bloqueio de Persistência | Exige `professional_override_reason`. |
| **Incompatível** | > 20% | Invalidação Total | Equivalência proibida pela engine. |

## 2. Tolerância de Macronutrientes por Protocolo

A tolerância não é fixa; ela varia conforme o rigor clínico do protocolo selecionado no Snapshot.

### 2.1 Protocolos de Alta Precisão (Bariátrico, Terapêutico, Detox)
*   **Proteína:** ± 3% (Soberania Proteica Total)
*   **Carboidrato:** ± 5%
*   **Gordura:** ± 5%
*   **Rigidez:** Bloqueia se o substituto comprometer a densidade nutricional mínima.

### 2.2 Protocolos de Performance (Hipertrofia, Atleta)
*   **Proteína:** 0% a +5% (Aceita excedente proteico, nunca déficit)
*   **Carboidrato:** ± 10%
*   **Gordura:** ± 10%
*   **Rigidez:** Foco no aporte energético e recuperação glicogênica.

### 2.3 Protocolos de Emagrecimento e Clínico Geral
*   **Proteína:** ± 5%
*   **Carboidrato:** ± 10%
*   **Gordura:** ± 15% (Maior flexibilidade em lipídios se Kcal total for preservada)

## 3. Matriz de Tolerância Metabólica

Critérios qualitativos que sobrepõem o fechamento matemático.

| Parâmetro | Limite V3 | Justificativa Clínica |
| :--- | :--- | :--- |
| **Carga Glicêmica** | Δ ≤ 20% | Evitar picos insulínicos não planejados no snapshot. |
| **Densidade Energética** | ± 30% | Preservar a sinalização de saciedade via volume gástrico. |
| **Digestibilidade** | Match Bioquímico | Não substituir proteínas de alta absorção por fibras insolúveis. |
| **Volume Alimentar** | ± 25% | Garantir que o paciente consiga ingerir a massa total calculada. |

## 4. Matriz de Risco de Equivalência

Classificação de segurança para cada par de substituição.

*   **`sovereign_safe`**: Dentro de todas as margens (Kcal, Macros e Metabólica).
*   **`clinically_acceptable`**: Dentro da margem de Kcal, mas com pequena variação de macros permitida pelo protocolo.
*   **`requires_review`**: Atrapalha a distribuição de macros original ou altera significativamente o volume. Exige justificativa.
*   **`metabolically_incompatible`**: Altera a via metabólica (ex: trocar gordura por carbo simples em protocolo Keto).
*   **`forbidden_equivalence`**: Alimentos que violam restrições do snapshot (Alérgenos, Interações Medicamentosas).

## 5. Comportamento da Engine V3

A Engine monitora o contrato de equivalência em tempo real durante a edição:

1.  **Aceita:** Se `sovereign_safe`.
2.  **Alerta:** Se `clinically_acceptable` (destaque visual na UI).
3.  **Bloqueia:** Se `requires_review` sem o campo `justification_token`.
4.  **Invalida:** Se `metabolically_incompatible` ou `forbidden`. O item não é adicionado ao snapshot.
5.  **Exige Revisão:** Se a soma das divergências de todas as substituições de uma refeição ultrapassar 15% do target da refeição.

## 6. Governança de UI (Editor)

A interface deve ser uma extensão da governança:

*   **Sinalização Dinâmica:** Barra de progresso de "Integridade da Equivalência" (Verde/Amarelo/Vermelho).
*   **Destaque de Risco:** Se uma troca de "Tapioca" por "Pão" gera um volume impraticável para um bariátrico, a UI deve exibir: `[!] Alerta de Volume: +150% do original`.
*   **Impedimento de Persistência:** O botão "Salvar Substituição" é desabilitado se o estado for `forbidden` ou `incompatible`.

## 7. Auditoria e Provenance (Rastreabilidade)

Cada substituição que não seja `ideal` deve carregar metadados de auditoria no Snapshot:

```json
{
  "audit": {
    "divergence_kcal_pct": 8.5,
    "risk_level": "clinically_acceptable",
    "clinical_justification": "Ajuste por preferência do paciente com preservação de proteína",
    "professional_override": true,
    "timestamp": "ISO-8601",
    "validator_v3_version": "3.0.4"
  }
}
```

## 8. Políticas de Bloqueio Soberano

1.  **Proteína é Âncora:** Em protocolos clínicos, qualquer redução > 5% na proteína do item substituto bloqueia a equivalência, independentemente das calorias.
2.  **Soberania do Volume:** Substitutos que resultem em massa total > 400g por refeição para pacientes bariátricos são marcados como `unsafe_volume`.
3.  **Integridade Glicêmica:** Substituições de baixo IG por alto IG em protocolos de emagrecimento severo exigem override explícito.
