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
    const portionInput = screen.getByPlaceholderText(/Ex: 150g/i);
    const saveBtn = screen.getByRole("button", { name: /^Adicionar$/ });

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
    const portionInput = screen.getByPlaceholderText(/Ex: 150g/i);
    const saveBtn = screen.getByRole("button", { name: /^Adicionar$/ });

    fireEvent.change(nameInput, { target: { value: "Batata Doce" } });
    
    // Teste com valor que falha na regex (sem unidade)
    fireEvent.change(portionInput, { target: { value: "100" } });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Use ex: 150g, 2 ovos, 1 fatia/i)).toBeInTheDocument();
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it("deve aceitar variações como espaços e decimais (ex: 1.5kg, 200 ml, 0.5kg)", () => {
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
    const portionInput = screen.getByPlaceholderText(/Ex: 150g/i);
    const saveBtn = screen.getByRole("button", { name: /^Adicionar$/ });

    // "2 ovos" deve falhar se não estiver na lista de unidades permitidas da regex
    // ou se a regex não bater. "1.5kg" com decimal "." e "200 ml" com espaço.
    const validPortions = ["1.5kg", "200g", "0.5kg", "2 ovos"];

    validPortions.forEach(portion => {
      mockUpdateItem.mockClear();
      fireEvent.change(nameInput, { target: { value: "Teste" } });
      fireEvent.change(portionInput, { target: { value: portion } });
      fireEvent.click(saveBtn);
      
      if (!mockUpdateItem.mock.calls.length) {
         console.error(`Portion failed validation: ${portion}`);
      }
      expect(mockUpdateItem).toHaveBeenCalled();
    });
  });

  it("deve limpar erro inline ao começar a digitar valor válido", () => {
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

    const portionInput = screen.getByPlaceholderText(/Ex: 150g/i);
    const saveBtn = screen.getByRole("button", { name: /^Adicionar$/ });

    // Forçar erro (valor sem número)
    fireEvent.change(portionInput, { target: { value: "invalid" } });
    fireEvent.click(saveBtn);
    expect(screen.getByText(/Use ex: 150g, 2 ovos, 1 fatia/i)).toBeInTheDocument();

    // Corrigir (número + unidade)
    fireEvent.change(portionInput, { target: { value: "100g" } });
    expect(screen.queryByText(/Use ex: 150g, 2 ovos, 1 fatia/i)).not.toBeInTheDocument();
  });
});
