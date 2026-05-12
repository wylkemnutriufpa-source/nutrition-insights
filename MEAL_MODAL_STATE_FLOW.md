# MEAL_MODAL_STATE_FLOW.md

## 1. Call Graph Completo (Fluxo Atual)
`MealPlanEditorV2.tsx` (Page Entry)
  └── `useMealPlanEditorV2Store` (Global Store)
      └── `WeeklyGrid.tsx` (Layout)
          └── `DayContent.tsx` (Renderizador de Célula)
              └── `MealSmartEditorModal.tsx` (O Modal de Edição)
                  ├── `useState` (description, substitutions, portionFactor)
                  └── `handleSave` ➔ `updateItem()` ➔ `_enqueue()` ➔ `persist()`

## 2. Source of Truth
*   **Global:** `items` array dentro do `useMealPlanEditorV2Store.ts`.
*   **Local:** Estados efêmeros (`useState`) dentro de `MealSmartEditorModal.tsx`.
*   **Conflito:** O modal não sincroniza com a Global Store até o clique em "Salvar". Qualquer fechamento acidental ou cancelamento descarta as alterações (incluindo alterações clínicas).

## 3. Estado Local vs. Global
*   **Estado Local:** `description`, `notes`, `substitutions_json`, `portion_factor`.
*   **Estado Global:** Objeto `MealPlanItem` persistido no banco e espelhado no cache local do Zustand.
*   **Divergência:** Enquanto o modal está aberto, o "Preview" (Calculado via `adjustedMacros` na linha 68) é puramente visual e não afeta o motor clínico global nem outros componentes do sistema.

## 4. Reconcile Trigger
*   **Atual:** Ocorre apenas no backend via RPC `reconcile_meal_plan_macros` ou manualmente via `recalculateMealPlan` na store (que é disparado por deltas globais, não pelo modal).
*   **Gargalo:** O `MealSmartEditorModal` não chama nenhuma função de reconciliação real ao alterar a gramagem. Ele apenas aplica um multiplicador aritmético simples (`portionFactor`).

## 5. Substitution Trigger
*   **Status:** **ESTÁTICO**.
*   **Fluxo:** As substituições são lidas do `edit_metadata.substitutions_json` no `useEffect` de abertura.
*   **Bug:** Não há um listener que dispare o `ClinicalEngine` quando a proteína principal no campo `description` é alterada (ex: 175g ➔ 130g). Como o modal opera em strings puras, ele não "entende" que a base mudou para recalcular as substituições.

## 6. Save Trigger
*   **Caminho:** `handleSave` ➔ `updateItem(itemId, patch)`.
*   **Ação:** O `updateItem` atualiza o Zustand de forma otimista e enfileira uma operação de persistência via `_enqueue`.
*   **Problema:** Se o salvamento falha ou se o usuário sai sem salvar, não há rascunho (draft) intermediário.

## 7. Ponto exato onde o draft morre
O draft morre em **dois pontos**:
1.  **Transicional:** O `MealSmartEditorModal` não atualiza a store em tempo real (on-the-fly). Ele mantém tudo em memória local. Se o modal for fechado sem o `handleSave`, todos os ajustes clínicos são perdidos.
2.  **Lógico:** Como a reconciliação e o motor de substituição não são disparados durante a edição local (on change), o usuário vê um preview macro (kcal/prot/carb) mas as substituições permanecem obsoletas em relação à nova quantidade da proteína principal.

## 8. Conclusão da Hipótese
O sistema sofre de **Isolamento de Estado**. O modal é uma "ilha" de edição que não participa do fluxo de reconciliação ativa do `NutritionalEngine` até que o ciclo de persistência seja fechado.
