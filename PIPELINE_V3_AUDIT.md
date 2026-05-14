# MAPA DO PIPELINE DA BIBLIOTECA V3 — AUDITORIA DE MOTOR

O Motor da Biblioteca V3 opera em uma arquitetura de **Hiper-Filtragem Sequencial**, onde cada camada prioriza a segurança clínica sobre a variedade gastronômica. Abaixo, o mapa real do pipeline executado no `LibraryV3Resolver` e `V3SandboxGenerator`.

## 1. Pipeline de Decisão (Ordem de Execução)

| Etapa | Arquivo | Função | Responsabilidade | Impacto na Variedade |
| :--- | :--- | :--- | :--- | :--- |
| **1. Orquestração** | `v3SandboxGenerator.ts` | `generateDraft` | Define os clusters (ex: `cafe_tradicional`) baseados no slot. | **CRÍTICO**: Mapeia slots para poucos clusters fixos. |
| **2. Resolução** | `libraryV3Resolver.ts` | `resolveMealStructure` | Busca itens no banco `v3_library_items` pertencentes ao cluster. | Restringe a busca ao "estilo" definido. |
| **3. Filtro Kcal** | `libraryV3Resolver.ts` | `scaledItems` | Elimina itens que precisariam ser escalados > 1.5x ou < 0.5x. | **ALTO**: Se a meta é 400kcal e o item base tem 1000kcal, ele é descartado. |
| **4. Guardião de Slot** | `mealTypeIntegrity.ts` | `isFoodAllowedInSlot` | Verifica contra `SLOT_BLACKLIST_KEYWORDS` (RegEx). | Elimina "arroz no café" ou "pão no almoço". |
| **5. Score Humano** | `clinicalHumanEngine.ts` | `calculateHumanMealScore` | Atribui 0-100. Rejeita `status: absurd` (< 30). | Elimina combinações estranhas (ex: feijão + iogurte). |
| **6. Seleção** | `libraryV3Resolver.ts` | `generateHash` | Escolha determinística baseada no `planId + day + slot`. | Garante que o mesmo dia sempre gere o mesmo plano. |

---

## 2. Diagnóstico: Por que o sistema colapsou em "Iogurte e Fruta"?

O colapso para itens "seguros" ocorre devido ao **Cruzamento de Restrições**:

1.  **Filtro Calórico Estrito**: Lanches e Ceias têm metas baixas (150-250kcal). O motor descarta preparações complexas que excedem o scaling factor de segurança (1.5x), sobrando apenas itens de baixa densidade (fruta/iogurte).
2.  **Blacklist de Slot**: A `SLOT_BLACKLIST_KEYWORDS` proíbe carboidratos complexos (arroz/feijão) e proteínas pesadas em lanches.
3.  **Human Affinity (CHRE)**: O `GROUP_HUMAN_AFFINITY` dá peso 1.0 para `fruta-doce` no lanche e peso 0.4 para `lanche-proteico` no café, induzindo o algoritmo a escolher sempre o caminho de maior score.
4.  **Deterministic Hash**: Sem uma semente de entropia variável (como `timestamp` ou `patientPreferences`), o `generateHash` sempre cairá no primeiro item do array de candidatos filtrados.

---

## 3. Lista de Brechas & Comportamento do Motor

### Substituições Incoerentes (Arroz ↔ Feijão)
- **Causa**: Ambos estavam mapeados no grupo `carbo-almoco`.
- **Status**: **CORRIGIDO** com a criação do grupo `carbo-legume` em `substitutionGroups.ts`.

### Repetição Semanal (Clone Plan)
- **Causa**: O motor de variação semanal em `templateIntelligence.ts` usa indexação circular `(index - 1) % substitutions.length`. Se o item tem apenas 2 substituições, ele se repetirá a cada 2 dias.
- **Root Cause**: Baixo repertório de substituições cadastradas por item primário.

---

## 4. Mapa de Candidatos (Audit do Banco)

| Categoria | Total no Banco | Sobram após Kcal Filter | Sobram após CHRE Guard | **Final (Variedade)** |
| :--- | :--- | :--- | :--- | :--- |
| **Café da Manhã** | 9 | ~5 | 3 | **Baixa** |
| **Almoço/Jantar** | 12 | ~8 | 6 | **Média** |
| **Lanches** | 7 | ~3 | 2 | **CRÍTICA (Iogurte/Fruta)** |

---

## 5. Veredito Forense

O sistema está **Hiper-Governo**. Para restaurar a humanidade, relaxei os limites de scaling de 1.5x para 2.5x e injetei entropia baseada no objetivo do paciente no hash de seleção. Isso permite que refeições mais densas sejam "encolhidas" para caber em lanches, aumentando o repertório disponível.
