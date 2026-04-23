import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MealDetailModal } from "../MealDetailModal";
import "@testing-library/jest-dom";

// Mock do toast para evitar erros
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

  it("deve permitir salvar quando a porção está em formato válido (número + unidade)", async () => {
    render(
      <MealDetailModal
        open={true}
        onOpenChange={mockOnOpenChange}
        meal={mockMeal}
        onUpdateItem={mockUpdateItem}
      />
    );

    // Abrir formulário de adicionar alimento
    const addBtn = screen.getByText(/Adicionar Alimento/i);
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/Ex: Frango Grelhado/i);
    const portionInput = screen.getByPlaceholderText(/Ex: 150g/i);
    const saveBtn = screen.getByText(/Adicionar/i);

    fireEvent.change(nameInput, { target: { value: "Batata Doce" } });
    fireEvent.change(portionInput, { target: { value: "200g" } });
    fireEvent.click(saveBtn);

    // Verifica se a função de update foi chamada (indicando sucesso na validação)
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
    const saveBtn = screen.getByRole("button", { name: /Adicionar/i });

    fireEvent.change(nameInput, { target: { value: "Batata Doce" } });
    
    // Testando formato inválido (apenas texto)
    fireEvent.change(portionInput, { target: { value: "muito" } });
    fireEvent.click(saveBtn);

    // Deve mostrar mensagem de erro inline
    expect(screen.getByText(/Use ex: 150g, 2 ovos, 1 fatia/i)).toBeInTheDocument();
    // Não deve ter chamado o update
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
    const saveBtn = screen.getByText(/Adicionar/i);

    const validPortions = ["1.5kg", "200 ml", "0.5kg", "2 ovos"];

    validPortions.forEach(portion => {
      mockUpdateItem.mockClear();
      fireEvent.change(nameInput, { target: { value: "Teste" } });
      fireEvent.change(portionInput, { target: { value: portion } });
      fireEvent.click(saveBtn);
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
    const saveBtn = screen.getByRole("button", { name: /Adicionar/i });

    // Provocar erro
    fireEvent.change(portionInput, { target: { value: "errado" } });
    fireEvent.click(saveBtn);
    expect(screen.getByText(/Use ex: 150g, 2 ovos, 1 fatia/i)).toBeInTheDocument();

    // Corrigir valor
    fireEvent.change(portionInput, { target: { value: "100g" } });
    
    // O erro deve sumir (ou sumir após validação em tempo real se implementado)
    expect(screen.queryByText(/Use ex: 150g, 2 ovos, 1 fatia/i)).not.toBeInTheDocument();
  });
});
