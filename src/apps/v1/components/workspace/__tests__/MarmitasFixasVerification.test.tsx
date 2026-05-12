/**
 * Marmitas Fixas Semanais — Verificação Automática (UI)
 *
 * Garante que:
 *   1. O template oficial "Marmitas Fixas Semanais" aparece em
 *      `WorkspaceTemplates` quando o backend o devolve.
 *   2. O `GenerationModeSelector` reconhece as 19 marmitas fixas de
 *      almoço + 19 de jantar e libera o modo "Marmitas Fixas
 *      (Congeladas)", exibindo o contador 19/X correto.
 *
 * Esses testes são "contratos de UI" — falham se alguém remover/renomear
 * o template oficial ou alterar a lógica de contagem do seletor.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ─── Estado mutável compartilhado entre o teste e o mock supabase ───────
type RecipeRow = { meal_type: string; is_fixed: boolean };
type State = {
  recipes: RecipeRow[];
  templates: Array<{
    id: string;
    name: string;
    description: string;
    template_generation: string;
    meals: unknown[];
    is_active: boolean;
  }>;
  marmitaSettings: {
    weekly_min_lunch: number;
    weekly_min_dinner: number;
    fixed_min_lunch: number;
    fixed_min_dinner: number;
  };
};

const STATE: State = {
  recipes: [],
  templates: [],
  marmitaSettings: {
    weekly_min_lunch: 7,
    weekly_min_dinner: 7,
    fixed_min_lunch: 7,
    fixed_min_dinner: 7,
  },
};

function buildFixedRecipes(fixedLunch: number, fixedDinner: number): RecipeRow[] {
  return [
    ...Array.from({ length: fixedLunch }, () => ({ meal_type: "lunch", is_fixed: true })),
    ...Array.from({ length: fixedDinner }, () => ({ meal_type: "dinner", is_fixed: true })),
  ];
}

// ─── Mocks (hoisted) ───────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "nutri-1" } }) }));

vi.mock("@/stores/mealPlanEditorV2Store", () => ({
  useMealPlanEditorV2Store: () => ({ planId: "plan-1", hydrate: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/strategy-advisor/StrategyAdvisorPanel", () => ({
  default: () => null,
}));
vi.mock("@/components/hybrid-builder/MealRecipeSelector", () => ({
  default: () => null,
}));
vi.mock("@/components/hybrid-builder/MarmitaSettingsDialog", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useMarmitaSettings", () => ({
  useMarmitaSettings: () => ({ settings: STATE.marmitaSettings, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "diet_templates") {
        // select().eq().order().order().limit() → Promise
        const result = { data: STATE.templates, error: null };
        const chain: any = {};
        chain.select = () => chain;
        chain.eq = () => chain;
        chain.order = () => chain;
        chain.limit = () => Promise.resolve(result);
        return chain;
      }
      // meal_recipes (GenerationModeSelector): select().eq().eq() → Promise
      return {
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: STATE.recipes, error: null }),
          }),
        }),
      };
    },
    functions: { invoke: vi.fn() },
  },
}));

// ─── Imports DEPOIS dos mocks ──────────────────────────────────────────
import WorkspaceTemplates from "../WorkspaceTemplates";
import GenerationModeSelector from "../../hybrid-builder/GenerationModeSelector";

describe("Marmitas Fixas Semanais — verificação automática", () => {
  beforeEach(() => {
    // Cenário real: template oficial cadastrado + 19 marmitas fixas de cada
    STATE.templates = [
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
    STATE.recipes = buildFixedRecipes(19, 19);
    STATE.marmitaSettings = {
      weekly_min_lunch: 7,
      weekly_min_dinner: 7,
      fixed_min_lunch: 7,
      fixed_min_dinner: 7,
    };
  });

  it("exibe 'Marmitas Fixas Semanais' como verificado em Workspace > Templates", async () => {
    render(<WorkspaceTemplates search="" />);

    expect(
      await screen.findByText("Marmitas Fixas Semanais"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Verificados/i)).toBeInTheDocument();
    expect(screen.getByText(/1 oficiais/i)).toBeInTheDocument();
  });

  it("libera o modo 'Marmitas Fixas (Congeladas)' com 19/7 almoço e 19/7 jantar", async () => {
    render(<GenerationModeSelector patientId="paciente-1" onGenerated={vi.fn()} />);

    const btn = await screen.findByRole("button", {
      name: /Marmitas Fixas \(Congeladas\)/i,
    });

    await waitFor(() => expect(btn).not.toBeDisabled());

    expect(
      screen.getByText(/Almoço fixo 19\/7\s*·\s*Jantar fixo 19\/7/i),
    ).toBeInTheDocument();

    expect(screen.queryByText(/Cadastre marmitas com/i)).not.toBeInTheDocument();
  });

  it("desabilita o modo fixo se o banco voltar a ficar abaixo do mínimo", async () => {
    STATE.recipes = buildFixedRecipes(3, 19);

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

  // ─── Cenários de borda: 1 unidade abaixo do mínimo em cada lado ─────
  // Garante que o seletor exige AMBOS os lados ≥ mínimo (lógica AND), não OR.
  const edgeCases: Array<{
    label: string;
    fixedLunch: number;
    fixedDinner: number;
    expectedDisabled: boolean;
    expectedCounter: RegExp;
    expectAlert: boolean;
  }> = [
    {
      label: "almoço 6/7 (faltando 1) e jantar 7/7 → desabilita",
      fixedLunch: 6,
      fixedDinner: 7,
      expectedDisabled: true,
      expectedCounter: /Almoço fixo 6\/7\s*·\s*Jantar fixo 7\/7/i,
      expectAlert: true,
    },
    {
      label: "almoço 7/7 e jantar 6/7 (faltando 1) → desabilita",
      fixedLunch: 7,
      fixedDinner: 6,
      expectedDisabled: true,
      expectedCounter: /Almoço fixo 7\/7\s*·\s*Jantar fixo 6\/7/i,
      expectAlert: true,
    },
    {
      label: "almoço 7/7 e jantar 7/7 (limite exato) → habilita",
      fixedLunch: 7,
      fixedDinner: 7,
      expectedDisabled: false,
      expectedCounter: /Almoço fixo 7\/7\s*·\s*Jantar fixo 7\/7/i,
      expectAlert: false,
    },
    // ─── Cenários ZERO: nenhuma marmita cadastrada de um/ambos os lados ─
    // Garante que o botão NÃO habilita quando o banco está vazio para
    // almoço, jantar, ou ambos — e que o alerta de cadastro aparece.
    {
      label: "almoço 0/7 e jantar 0/7 (banco vazio) → desabilita",
      fixedLunch: 0,
      fixedDinner: 0,
      expectedDisabled: true,
      expectedCounter: /Almoço fixo 0\/7\s*·\s*Jantar fixo 0\/7/i,
      expectAlert: true,
    },
    {
      label: "almoço 0/7 e jantar 7/7 (só jantar cadastrado) → desabilita",
      fixedLunch: 0,
      fixedDinner: 7,
      expectedDisabled: true,
      expectedCounter: /Almoço fixo 0\/7\s*·\s*Jantar fixo 7\/7/i,
      expectAlert: true,
    },
    {
      label: "almoço 7/7 e jantar 0/7 (só almoço cadastrado) → desabilita",
      fixedLunch: 7,
      fixedDinner: 0,
      expectedDisabled: true,
      expectedCounter: /Almoço fixo 7\/7\s*·\s*Jantar fixo 0\/7/i,
      expectAlert: true,
    },
  ];

  it.each(edgeCases)(
    "borda: $label",
    async ({ fixedLunch, fixedDinner, expectedDisabled, expectedCounter, expectAlert }) => {
      STATE.recipes = buildFixedRecipes(fixedLunch, fixedDinner);

      render(<GenerationModeSelector patientId="paciente-1" onGenerated={vi.fn()} />);

      const btn = await screen.findByRole("button", {
        name: /Marmitas Fixas \(Congeladas\)/i,
      });

      await waitFor(() =>
        expectedDisabled
          ? expect(btn).toBeDisabled()
          : expect(btn).not.toBeDisabled(),
      );

      expect(screen.getByText(expectedCounter)).toBeInTheDocument();

      if (expectAlert) {
        expect(screen.getByText(/Cadastre marmitas com/i)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(/Cadastre marmitas com/i)).not.toBeInTheDocument();
      }
    },
  );

  // ─── Regressão: Workspace + Selector com banco vazio ────────────────
  // Snapshot de estado garantindo que, mesmo sem receitas fixas
  // cadastradas, o template oficial CONTINUA visível em Workspace >
  // Templates (não some), enquanto o seletor de modo bloqueia a geração.
  it("regressão visual: template visível + botão desabilitado quando banco está vazio", async () => {
    STATE.recipes = buildFixedRecipes(0, 0);

    const { container: workspaceContainer } = render(
      <WorkspaceTemplates search="" />,
    );

    // 1. Template oficial permanece listado e marcado como verificado
    expect(
      await screen.findByText("Marmitas Fixas Semanais"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Verificados/i)).toBeInTheDocument();
    expect(screen.getByText(/1 oficiais/i)).toBeInTheDocument();

    // Snapshot estrutural: workspace renderizou cards/headings
    expect(
      workspaceContainer.querySelector("h3, h2, [class*='card']"),
    ).toBeTruthy();

    // 2. Selector renderizado em paralelo: botão fixo desabilitado + alerta
    render(<GenerationModeSelector patientId="paciente-1" onGenerated={vi.fn()} />);

    const btn = await screen.findByRole("button", {
      name: /Marmitas Fixas \(Congeladas\)/i,
    });
    await waitFor(() => expect(btn).toBeDisabled());
    expect(btn).toHaveAttribute("disabled");

    // 3. Contador zerado e alerta de cadastro visível
    expect(
      screen.getByText(/Almoço fixo 0\/7\s*·\s*Jantar fixo 0\/7/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cadastre marmitas com/i)).toBeInTheDocument();

    // 4. Snapshot do estado do botão (regressão de estilo/atributo)
    expect(btn.outerHTML).toMatch(/disabled/);
  });
});
