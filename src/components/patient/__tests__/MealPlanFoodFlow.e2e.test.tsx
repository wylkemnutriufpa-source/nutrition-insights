/**
 * E2E test simulating the full flow on the meal plan:
 * 1. Open the meal detail modal
 * 2. Click "Adicionar Alimento"
 * 3. Use autocomplete + portion validation
 * 4. Confirm save success or save block (inline error)
 *
 * This test covers the integration between MealDetailModal,
 * the centralized portionValidation module, and the persistence
 * callback (`onUpdateItem`) used by the meal plan editor.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MealDetailModal, type MealDetailData } from "../MealDetailModal";
import {
  PORTION_ERROR_MESSAGE,
  PORTION_PLACEHOLDER,
  PORTION_DATALIST_ID,
  validatePortion,
  getPortionAutocompleteOptions,
} from "@/lib/portionValidation";

// --- Mocks ---
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));

const baseMeal: MealDetailData = {
  title: "Almoço",
  description: "• Arroz Integral — 100g\n• Frango Grelhado — 150g",
  itemId: "meal-item-42",
  meal_type: "lunch",
  metadata: {},
};

function renderModal(updateItem = vi.fn()) {
  const onOpenChange = vi.fn();
  const utils = render(
    <MealDetailModal
      open={true}
      onOpenChange={onOpenChange}
      meal={baseMeal}
      onUpdateItem={updateItem}
    />,
  );
  return { ...utils, updateItem, onOpenChange };
}

function openAddFoodForm() {
  const trigger = screen.getByRole("button", { name: /Adicionar Alimento/i });
  fireEvent.click(trigger);
}

function getAddFormInputs() {
  const nameInput = screen.getByPlaceholderText(/Ex: Frango Grelhado/i) as HTMLInputElement;
  const portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER) as HTMLInputElement;
  const saveBtn = screen.getByRole("button", { name: "Adicionar" });
  return { nameInput, portionInput, saveBtn };
}

describe("E2E — Meal Plan Food Flow (add → autocomplete → validate → save/block)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe("Camada 1: Lógica de validação (sanity-check)", () => {
    it("aceita formatos válidos e rejeita inválidos", () => {
      // Valid
      expect(validatePortion("150g")).toBe(true);
      expect(validatePortion("1.5kg")).toBe(true);
      expect(validatePortion("200 ml")).toBe(true);
      expect(validatePortion("2 ovos")).toBe(true);
      // Invalid
      expect(validatePortion("100")).toBe(false);
      expect(validatePortion("muito")).toBe(false);
      expect(validatePortion("g")).toBe(false);
    });

    it("autocomplete sugere número + unidade quando há número", () => {
      const opts = getPortionAutocompleteOptions("250");
      expect(opts).toContain("250g");
      expect(opts).toContain("250ml");
    });
  });

  describe("Camada 2: Fluxo UI completo", () => {
    it("navega → abre formulário → preenche → autocomplete renderiza → salva com sucesso", () => {
      const { updateItem } = renderModal();

      // Step 1: abrir formulário de adição
      openAddFoodForm();
      const { nameInput, portionInput, saveBtn } = getAddFormInputs();

      // Step 2: digitar nome
      fireEvent.change(nameInput, { target: { value: "Batata Doce" } });

      // Step 3: digitar número e validar autocomplete
      fireEvent.change(portionInput, { target: { value: "200" } });
      const datalist = document.getElementById(PORTION_DATALIST_ID);
      expect(datalist).toBeInTheDocument();
      const options = Array.from(datalist!.querySelectorAll("option")).map(o => o.value);
      expect(options).toContain("200g");
      expect(options).toContain("200ml");

      // Step 4: completar com unidade válida
      fireEvent.change(portionInput, { target: { value: "200g" } });

      // Step 5: salvar
      fireEvent.click(saveBtn);

      // Step 6: confirmar persistência
      expect(updateItem).toHaveBeenCalledTimes(1);
      expect(updateItem).toHaveBeenCalledWith(
        "meal-item-42",
        expect.objectContaining({
          description: expect.stringContaining("Batata Doce — 200g"),
        }),
      );
    });

    it("bloqueia salvar e mostra erro inline quando porção é inválida", () => {
      const { updateItem } = renderModal();

      openAddFoodForm();
      const { nameInput, portionInput, saveBtn } = getAddFormInputs();

      fireEvent.change(nameInput, { target: { value: "Pão Francês" } });
      fireEvent.change(portionInput, { target: { value: "uma porção" } });
      fireEvent.click(saveBtn);

      // Erro inline visível
      expect(screen.getByText(PORTION_ERROR_MESSAGE)).toBeInTheDocument();
      // Persistência bloqueada
      expect(updateItem).not.toHaveBeenCalled();

      // Ao corrigir, erro some e salvar funciona
      fireEvent.change(portionInput, { target: { value: "50g" } });
      expect(screen.queryByText(PORTION_ERROR_MESSAGE)).not.toBeInTheDocument();

      fireEvent.click(saveBtn);
      expect(updateItem).toHaveBeenCalledTimes(1);
    });

    it("autocomplete: selecionar opção do datalist dispara validação automática", () => {
      const { updateItem } = renderModal();

      openAddFoodForm();
      const { nameInput, portionInput, saveBtn } = getAddFormInputs();

      fireEvent.change(nameInput, { target: { value: "Aveia" } });

      // Simular seleção do datalist (browser preenche o input com o value selecionado)
      fireEvent.change(portionInput, { target: { value: "1.5kg" } });

      // Sem clicar Enter, salvar deve funcionar
      fireEvent.click(saveBtn);
      expect(updateItem).toHaveBeenCalledTimes(1);
      expect(updateItem).toHaveBeenCalledWith(
        "meal-item-42",
        expect.objectContaining({
          description: expect.stringContaining("Aveia — 1.5kg"),
        }),
      );
    });

    it("fluxo de edição: edita alimento existente, valida e bloqueia ou salva", () => {
      const { updateItem } = renderModal();

      // Os botões de editar têm title="Editar Alimento" (um por linha)
      const editBtns = screen.getAllByTitle(/Editar Alimento/i);
      expect(editBtns.length).toBeGreaterThan(0);
      fireEvent.click(editBtns[0]);

      // Campo de porção do form de edição (mesmo placeholder)
      const portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER) as HTMLInputElement;
      const saveEditBtn = screen.getByRole("button", { name: /Salvar Alterações/i });

      // Tentar salvar com valor inválido
      fireEvent.change(portionInput, { target: { value: "errado" } });
      fireEvent.click(saveEditBtn);

      expect(screen.getByText(PORTION_ERROR_MESSAGE)).toBeInTheDocument();
      expect(updateItem).not.toHaveBeenCalled();

      // Corrigir
      fireEvent.change(portionInput, { target: { value: "120g" } });
      fireEvent.click(saveEditBtn);

      expect(updateItem).toHaveBeenCalledTimes(1);
      expect(updateItem).toHaveBeenCalledWith(
        "meal-item-42",
        expect.objectContaining({
          description: expect.stringMatching(/— 120g/),
        }),
      );
    });

    it("autocomplete sem número: lista unidades cruas no datalist", () => {
      renderModal();
      openAddFoodForm();

      const { portionInput } = getAddFormInputs();
      fireEvent.change(portionInput, { target: { value: "" } });

      const datalist = document.getElementById(PORTION_DATALIST_ID);
      const options = Array.from(datalist!.querySelectorAll("option")).map(o => o.value);
      expect(options).toContain("g");
      expect(options).toContain("ovos");
      expect(options).toContain("fatia");
    });
  });
});
