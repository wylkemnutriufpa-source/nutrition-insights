/**
 * Marmitas Fixas Semanais — Verificação Automática (UI)
 *
 * Garante que:
 *   1. O template oficial "Marmitas Fixas Semanais" aparece em
 *      `WorkspaceTemplates` quando o backend o devolve.
 *   2. O `GenerationModeSelector` reconhece as 38 marmitas fixas
 *      (19 almoço + 19 jantar) e libera o modo "Marmitas Fixas
 *      (Congeladas)", exibindo o contador 19/X correto.
 *
 * Esses testes são "contratos de UI" — falham se alguém remover/renomear
 * o template ou alterar a lógica de contagem do seletor.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  installGenerationModeSelectorMocks,
  setMockState,
  buildRecipes,
} from "../../hybrid-builder/__tests__/helpers/mockGenerationModeSelector";

// ─── Mocks compartilhados (precisam vir antes do import do componente) ───
installGenerationModeSelectorMocks();

// ─── Mock dedicado para WorkspaceTemplates: devolve o template oficial ──
vi.mock("@/integrations/supabase/client", async () => {
  // Reusa o mock instalado acima para o seletor mas adiciona suporte a
  // diet_templates para o componente WorkspaceTemplates.
  const recipes = () => {
    const g = globalThis as any;
    return g["__GMS_MOCK_STATE__"]?.recipes ?? [];
  };
  const dietTemplatesData = [
    {
      id: "tpl-marmita",
      name: "Marmitas Fixas Semanais",
      description:
        "Cardápio para pacientes que consomem marmitas congeladas pré-prontas.",
      template_generation: "official_v2",
      meals: [],
      is_active: true,
    },
  ];
  return {
    supabase: {
      from: (table: string) => {
        if (table === "diet_templates") {
          // Encadeamento: select().eq().order().order().limit() → Promise
          const chain: any = {};
          const result = { data: dietTemplatesData, error: null };
          chain.select = () => chain;
          chain.eq = () => chain;
          chain.order = () => chain;
          chain.limit = () => Promise.resolve(result);
          return chain;
        }
        // Default: meal_recipes para o seletor
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: recipes(), error: null }),
            }),
          }),
        };
      },
      functions: { invoke: vi.fn() },
    },
  };
});

import WorkspaceTemplates from "../WorkspaceTemplates";
import GenerationModeSelector from "../../hybrid-builder/GenerationModeSelector";

describe("Marmitas Fixas Semanais — verificação automática", () => {
  beforeEach(() => {
    // Reseta para o cenário real do banco: 19 fixas almoço + 19 fixas jantar.
    setMockState({
      counts: { fixedLunch: 19, fixedDinner: 19, lunch: 0, dinner: 0 },
      settings: {
        weekly_min_lunch: 7,
        weekly_min_dinner: 7,
        fixed_min_lunch: 7,
        fixed_min_dinner: 7,
      },
    });
  });

  it("exibe o template 'Marmitas Fixas Semanais' como verificado em Workspace > Templates", async () => {
    render(<WorkspaceTemplates search="" />);

    // Nome do template deve aparecer
    const titulo = await screen.findByText("Marmitas Fixas Semanais");
    expect(titulo).toBeInTheDocument();

    // E deve estar no bloco de "Verificados" (template_generation = official_v2)
    expect(screen.getByText(/Verificados/i)).toBeInTheDocument();
    expect(screen.getByText(/1 oficiais/i)).toBeInTheDocument();
  });

  it("libera o modo 'Marmitas Fixas (Congeladas)' com 19/7 almoço e 19/7 jantar", async () => {
    render(<GenerationModeSelector patientId="paciente-1" onGenerated={vi.fn()} />);

    // Localiza o botão pelo texto "Marmitas Fixas (Congeladas)"
    const btn = await screen.findByRole("button", {
      name: /Marmitas Fixas \(Congeladas\)/i,
    });

    // Botão fica habilitado pois 19 ≥ 7 nos dois lados
    await waitFor(() => expect(btn).not.toBeDisabled());

    // Contador exato refletindo o estado real do banco
    expect(
      screen.getByText(/Almoço fixo 19\/7\s*·\s*Jantar fixo 19\/7/i),
    ).toBeInTheDocument();

    // Não deve aparecer o alerta de "marmitas insuficientes"
    expect(
      screen.queryByText(/Cadastre marmitas com/i),
    ).not.toBeInTheDocument();
  });

  it("desabilita o modo fixo se o banco voltar a ficar abaixo do mínimo", async () => {
    setMockState({
      counts: buildRecipes({ fixedLunch: 3, fixedDinner: 19 }) as any && {
        fixedLunch: 3,
        fixedDinner: 19,
      },
      settings: {
        weekly_min_lunch: 7,
        weekly_min_dinner: 7,
        fixed_min_lunch: 7,
        fixed_min_dinner: 7,
      },
    });

    render(<GenerationModeSelector patientId="paciente-1" onGenerated={vi.fn()} />);

    const btn = await screen.findByRole("button", {
      name: /Marmitas Fixas \(Congeladas\)/i,
    });
    await waitFor(() => expect(btn).toBeDisabled());

    expect(
      screen.getByText(/Almoço fixo 3\/7\s*·\s*Jantar fixo 19\/7/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cadastre marmitas com/i)).toBeInTheDocument();
  });
});
