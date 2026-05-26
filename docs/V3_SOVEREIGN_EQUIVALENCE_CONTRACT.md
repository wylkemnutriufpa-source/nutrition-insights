# Contrato de Equivalência Fisiológica Soberana V3

Este documento define o padrão técnico e clínico para substituições alimentares dentro do Motor Determinístico V3. A partir desta definição, a substituição deixa de ser um "item alternativo" e passa a ser um "contrato de equivalência persistido".

## 1. Definição Conceitual

### 1.1 Definição Clínica
Uma substituição soberana é uma troca fisiológica onde o propósito metabólico, o perfil de macronutrientes e a densidade energética do item original são preservados dentro de uma tolerância clínica estrita, adaptada ao contexto específico da refeição e da patologia do paciente.

### 1.2 Definição Matemática
Não é uma proporção simples (regra de 3 básica). É uma função de otimização:
`Gramagem_Substituto = f(Alvo_Original, Densidade_Nutricional_Substituto, Prioridade_Metabólica)`
O objetivo é minimizar a divergência do macronutriente "âncora" (ex: carboidrato para amidos) mantendo o erro calórico total abaixo de 5%.

### 1.3 Definição Estrutural
A substituição é uma entidade **autossuficiente** dentro do Snapshot da Dieta. Ela contém seus próprios macros calculados e gramagem final, não dependendo de consultas em tempo real a tabelas externas para interpretação de macros.

### 1.4 Definição de Provenance
Cada substituição deve carregar a "assinatura" do cálculo: por que esta gramagem foi escolhida, qual foi o item de origem e qual critério foi priorizado (Kcal, Proteína ou Carboidrato).

---

## 2. Contrato de Dados (Estrutura de Persistência)

A estrutura ideal de uma `SovereignSubstitution` no Snapshot:

```json
{
  "id": "uuid",
  "original_item_reference": {
    "id": "uuid",
    "food_name": "Tapioca",
    "anchor_nutrient": "carbohydrates"
  },
  "substitute_info": {
    "food_id": "uuid",
    "name": "Pão Integral",
    "category": "Complex Carb"
  },
  "sovereign_mass_g": 45.5,
  "macros_per_100g": {
    "kcal": 250,
    "protein": 8,
    "carbs": 45,
    "fat": 3
  },
  "calculated_macros_at_mass": {
    "kcal": 113.75,
    "protein": 3.64,
    "carbs": 20.47,
    "fat": 1.36
  },
  "equivalence_logic": {
    "method": "MATCH_ANCHOR_NUTRIENT",
    "anchor_value": 20.0,
    "tolerance_used": 0.05
  },
  "provenance": {
    "engine": "V3.1-Sovereign",
    "timestamp": "2026-05-26T...",
    "source": "Clinical_Curator"
  }
}
```

---

## 3. Pipeline Soberano (Fluxo de Dados)

1.  **Item Original (Snapshot):** O motor lê o item base e identifica o alvo fisiológico (ex: 20g de Carbo).
2.  **Extração Fisiológica:** O sistema identifica a categoria do alimento (ex: Carboidrato Simples).
3.  **Motor de Equivalência:** Busca alimentos da mesma categoria e calcula a gramagem necessária para atingir o alvo do nutriente âncora.
4.  **Cálculo de Gramagem:** Aplica limites clínicos (ex: não sugerir 5g de pão ou 800g de alface).
5.  **Persistência Soberana:** O snapshot é gravado com a gramagem e os macros já decompostos.
6.  **Renderização:** A UI apenas exibe o que está no contrato, sem realizar cálculos de "porção" em runtime.

---

## 4. Matriz de Equivalência (Critérios)

Para que uma substituição seja considerada "Soberana", ela deve respeitar:

| Critério | Importância | Regra V3 |
| :--- | :--- | :--- |
| **Nutriente Âncora** | Crítica | Deve ser o guia principal da gramagem (Carbo p/ Carbo). |
| **Densidade Energética** | Alta | A substituição não pode alterar drasticamente o volume gástrico (ex: trocar 50g de densos por 1kg de volumosos sem aviso). |
| **Carga Glicêmica** | Média | Preservar a resposta insulínica esperada no template original. |
| **Papel Metabólico** | Alta | Não trocar "Gordura" por "Carboidrato" mesmo que as Kcal fechem. |
| **Contexto da Refeição** | Média | Se é um pré-treino, a digestibilidade do substituto deve ser equivalente. |

---

## 5. Matriz de Risco (V2 vs V3)

| Risco Detectado (V2) | Impacto Fisiológico | Mitigação Soberana (V3) |
| :--- | :--- | :--- |
| **Scaling Proporcional** | Erro acumulado em macros secundários. | Cálculo baseado em densidade nutricional real. |
| **Porção Fixa Universal** | Planos hipocalóricos com excesso de volume ou vice-versa. | Gramagem dinâmica persistida no snapshot. |
| **100g Universal** | Colapso da dieta (ex: 100g de tapioca != 100g de pão). | Proibição de fallbacks genéricos de 100g. |
| **Parsing Textual** | Inconsistência entre o nome e o macro real. | ID de Alimento + Snapshot de Macros mandatórios. |
| **Equivalência Genérica** | Trocas metabolicamente absurdas (Fruta por Azeite). | Travas de categoria clínica no motor de busca. |

---

## 6. Governança e Auditoria

Toda substituição que violar a **Tolerância Clínica (Divergência > 10% no nutriente âncora)** deve ser marcada como:
*   `imprecise_equivalence`
*   `metabolic_shift_detected`
*   `requires_manual_adjustment`

A interface de edição (a ser desenhada) será obrigada a exibir a "Divergência de Contrato" em tempo real durante a escolha do substituto.
