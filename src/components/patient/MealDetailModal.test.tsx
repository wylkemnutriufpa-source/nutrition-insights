import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MealDetailModal } from "./MealDetailModal";
import "@testing-library/jest-dom";

// Mock do toast para evitar erros
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock do supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
  }
}));

import { PORTION_ERROR_MESSAGE, PORTION_PLACEHOLDER } from "@/lib/portionValidation";

describe("MealDetailModal - Validação de Porção", () => {
  const mockMeal = {
    title: "Refeição Teste",
    description: "• Arroz Branco — 100g\n• Frango Grelhado — 150g",
    itemId: "item-123",
    metadata: {
      foods_structure: [
        { name: "Arroz Branco", portion: "100g" },
        { name: "Frango Grelhado", portion: "150g" }
      ]
    }
  };

  const mockUpdateItem = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("deve permitir salvar quando a porção está em formato válido (número + unidade)", async () => {
    render(
      <MealDetailModal
        open={true}
        onOpenChange={mockOnOpenChange}
        meal={mockMeal}
        onUpdateItem={mockUpdateItem}
      />
    );

    const addBtn = screen.getByText(/Adicionar Alimento/i);
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/Ex: Frango Grelhado/i);
    const portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER);
    const saveBtn = screen.getByRole("button", { name: "Adicionar" });

    fireEvent.change(nameInput, { target: { value: "Batata Doce" } });
    fireEvent.change(portionInput, { target: { value: "200g" } });
    fireEvent.click(saveBtn);

    expect(mockUpdateItem).toHaveBeenCalled();
  });

  it("deve bloquear salvar e mostrar erro inline quando a porção está em formato inválido", () => {
    render(
      <MealDetailModal
        open={true}
        onOpenChange={mockOnOpenChange}
        meal={mockMeal}
        onUpdateItem={mockUpdateItem}
      />
    );

    const addBtn = screen.getByText(/Adicionar Alimento/i);
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/Ex: Frango Grelhado/i);
    const portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER);
    const saveBtn = screen.getByRole("button", { name: "Adicionar" });

    fireEvent.change(nameInput, { target: { value: "Batata Doce" } });
    
    // Teste com valor que falha na regex (sem unidade)
    fireEvent.change(portionInput, { target: { value: "100" } });
    fireEvent.click(saveBtn);

    expect(screen.getByText(PORTION_ERROR_MESSAGE)).toBeInTheDocument();
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it("deve aceitar variações como espaços e decimais (ex: 1.5kg, 200 ml, 2 ovos)", () => {
    render(
      <MealDetailModal
        open={true}
        onOpenChange={mockOnOpenChange}
        meal={mockMeal}
        onUpdateItem={mockUpdateItem}
      />
    );

    const addBtn = screen.getByText(/Adicionar Alimento/i);

    // Caso 1: 1.5kg
    fireEvent.click(addBtn);
    let nameInput = screen.getByPlaceholderText(/Ex: Frango Grelhado/i);
    let portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER);
    let saveBtn = screen.getByRole("button", { name: "Adicionar" });
    fireEvent.change(nameInput, { target: { value: "T1" } });
    fireEvent.change(portionInput, { target: { value: "1.5kg" } });
    fireEvent.click(saveBtn);
    expect(mockUpdateItem).toHaveBeenCalled();

    // Caso 2: 200 ml (com espaço)
    fireEvent.click(addBtn);
    nameInput = screen.getByPlaceholderText(/Ex: Frango Grelhado/i);
    portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER);
    saveBtn = screen.getByRole("button", { name: "Adicionar" });
    fireEvent.change(nameInput, { target: { value: "T2" } });
    fireEvent.change(portionInput, { target: { value: "200 ml" } });
    fireEvent.click(saveBtn);
    expect(mockUpdateItem).toHaveBeenCalledTimes(2);

    // Caso 3: 2 ovos
    fireEvent.click(addBtn);
    nameInput = screen.getByPlaceholderText(/Ex: Frango Grelhado/i);
    portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER);
    saveBtn = screen.getByRole("button", { name: "Adicionar" });
    fireEvent.change(nameInput, { target: { value: "T3" } });
    fireEvent.change(portionInput, { target: { value: "2 ovos" } });
    fireEvent.click(saveBtn);
    expect(mockUpdateItem).toHaveBeenCalledTimes(3);
  });

  it("deve limpar erro inline ao começar a digitar valor válido", async () => {
    render(
      <MealDetailModal
        open={true}
        onOpenChange={mockOnOpenChange}
        meal={mockMeal}
        onUpdateItem={mockUpdateItem}
      />
    );

    const addBtn = screen.getByText(/Adicionar Alimento/i);
    fireEvent.click(addBtn);

    const portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER);
    const saveBtn = screen.getByRole("button", { name: "Adicionar" });
    const nameInput = screen.getByPlaceholderText(/Ex: Frango Grelhado/i);
    
    fireEvent.change(nameInput, { target: { value: "Teste Erro" } });
    fireEvent.change(portionInput, { target: { value: "invalid" } });
    fireEvent.click(saveBtn);

    expect(screen.getByText(new RegExp(PORTION_ERROR_MESSAGE, "i"))).toBeInTheDocument();

    // Corrigir (número + unidade)
    fireEvent.change(portionInput, { target: { value: "100g" } });
    
    // O erro deve sumir
    expect(screen.queryByText(new RegExp(PORTION_ERROR_MESSAGE, "i"))).not.toBeInTheDocument();
  });

  it("deve validar porção ao editar um alimento existente", async () => {
    render(
      <MealDetailModal
        open={true}
        onOpenChange={mockOnOpenChange}
        meal={mockMeal}
        onUpdateItem={mockUpdateItem}
      />
    );

    // Encontrar o botão de editar da primeira linha (Arroz Branco)
    // O botão tem um título "Editar Alimento"
    const editBtn = await screen.findByTitle(/Editar Alimento/i);
    fireEvent.click(editBtn);

    const portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER);
    
    const saveBtnEdit = screen.getByRole("button", { name: /Salvar Alterações/i });
    
    // Invalidar
    fireEvent.change(portionInput, { target: { value: "invalid" } });
    fireEvent.click(saveBtnEdit);

    expect(screen.getByText(new RegExp(PORTION_ERROR_MESSAGE, "i"))).toBeInTheDocument();
    expect(mockUpdateItem).not.toHaveBeenCalled();

    // Corrigir
    fireEvent.change(portionInput, { target: { value: "120g" } });
    fireEvent.click(saveBtnEdit);

    expect(mockUpdateItem).toHaveBeenCalledWith("item-123", expect.objectContaining({
      description: expect.stringContaining("Arroz Branco — 120g")
    }));
  });

  it("deve mostrar sugestões de autocomplete ao digitar um número", async () => {
    render(
      <MealDetailModal
        open={true}
        onOpenChange={mockOnOpenChange}
        meal={mockMeal}
        onUpdateItem={mockUpdateItem}
      />
    );

    const addBtn = screen.getByText(/Adicionar Alimento/i);
    fireEvent.click(addBtn);

    const portionInput = screen.getByPlaceholderText(PORTION_PLACEHOLDER);
    fireEvent.change(portionInput, { target: { value: "150" } });

    // O datalist deve ter as opções
    const datalist = document.getElementById("portion-units");
    expect(datalist).toBeInTheDocument();
    expect(datalist?.childNodes.length).toBeGreaterThan(0);
    
    const options = Array.from(datalist?.childNodes as NodeListOf<HTMLOptionElement>).map(opt => opt.value);
    expect(options).toContain("150g");
    expect(options).toContain("150ml");
  });
});
