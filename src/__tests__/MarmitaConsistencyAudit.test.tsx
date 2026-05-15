
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ConsistencyReportModal from "../components/hybrid-builder/ConsistencyReportModal";

describe("ConsistencyReportModal — Auditoria de Marmitas", () => {
  const mockRecipes = [
    {
      name: "Frango com Batata Doce",
      meal_type: "Almoço",
      calories: 450,
      protein: 35,
      carbs: 45,
      fat: 12,
      is_fixed: true
    },
    {
      name: "Patinho com Arroz Integral",
      meal_type: "Jantar",
      calories: 400,
      protein: 30,
      carbs: 40,
      fat: 10,
      is_fixed: true
    },
    {
      name: "Marmita com Erro",
      meal_type: "Almoço",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      is_fixed: true
    }
  ];

  it("exibe contagem correta de marmitas fixas", () => {
    render(
      <ConsistencyReportModal 
        open={true} 
        onOpenChange={() => {}} 
        recipes={mockRecipes} 
        targetKcal={2000} 
      />
    );

    // Deve mostrar 2/19 e 1/19 nos contadores de fixos
    // (A lógica do componente usa strings como "2/19")
    expect(screen.getByText("2/19")).toBeInTheDocument();
    expect(screen.getByText("1/19")).toBeInTheDocument();
  });

  it("exibe aviso visual quando há receitas com macros zerados", () => {
    render(
      <ConsistencyReportModal 
        open={true} 
        onOpenChange={() => {}} 
        recipes={mockRecipes} 
        targetKcal={2000} 
      />
    );

    expect(screen.getByText(/RECEITAS COM MACROS ZERADOS DETECTADAS/i)).toBeInTheDocument();
    expect(screen.getByText("Marmita com Erro")).toBeInTheDocument();
    expect(screen.getByText("0 kcal")).toBeInTheDocument();
  });

  it("exibe mensagem de sucesso quando todas as receitas estão OK", () => {
    const validRecipes = mockRecipes.filter(r => r.calories > 0);
    render(
      <ConsistencyReportModal 
        open={true} 
        onOpenChange={() => {}} 
        recipes={validRecipes} 
        targetKcal={2000} 
      />
    );

    expect(screen.getByText(/Todos os macros preenchidos/i)).toBeInTheDocument();
  });
});
