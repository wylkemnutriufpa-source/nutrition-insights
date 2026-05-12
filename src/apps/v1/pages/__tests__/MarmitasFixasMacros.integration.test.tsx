/**
 * Marmitas Fixas Semanais — Macro Rendering Integration
 *
 * Garante que, ao abrir o modal de preview de templates fixos
 * ("Marmitas Fixas Semanais") em /diet-templates, os totais
 * (kcal, proteína, carbo, gordura) sejam SEMPRE renderizados
 * como números válidos — nunca `NaN`.
 *
 * Cenários cobertos (pareados ao bug reportado na screenshot):
 *   1. Template v2 com `blocks` + `options` válidos.
 *   2. Template v2 com `blocks` cujos `options` não trazem macros
 *      (todos os campos `undefined`) — adapter deve normalizar p/ 0.
 *   3. Template legado com `foods` cujos macros vêm como `null`.
 *   4. Template com `base_calories = 0` — multiplicador degenerado
 *      não pode propagar `NaN`/`Infinity` na UI.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ─── Estado mutável compartilhado entre o teste e o mock supabase ───────
const STATE: {
  templates: any[];
} = { templates: [] };

// ─── Mocks (hoisted) ───────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "nutri-1" } }) }));
vi.mock("@/lib/tenantContext", () => ({
  useTenant: () => ({ tenantId: "tenant-1" }),
}));
vi.mock("@/lib/tenantQueryHelpers", () => ({
  withTenantFilter: (q: any) => q,
  getTenantIdForInsert: () => ({ tenant_id: "tenant-1" }),
}));
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/lib/serverTransitions", () => ({ activateMealPlan: vi.fn() }));
vi.mock("@/lib/planPipelineOrchestrator", () => ({ runPlanPipeline: vi.fn() }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/meal/TemplateFoodVisual", () => ({
  TemplateFoodVisual: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "diet_templates") {
        const result = { data: STATE.templates, error: null };
        const chain: any = {};
        chain.select = () => chain;
        chain.eq = () => chain;
        chain.order = () => Promise.resolve(result);
        chain.limit = () => Promise.resolve(result);
        chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
        return chain;
      }
      // Outras tabelas (anamnesis, profiles, physical_assessments) — vazias
      const empty: any = {};
      empty.select = () => empty;
      empty.eq = () => empty;
      empty.order = () => empty;
      empty.limit = () => empty;
      empty.maybeSingle = () => Promise.resolve({ data: null, error: null });
      return empty;
    },
    functions: { invoke: vi.fn() },
  },
}));

// Import APÓS mocks
import DietTemplates from "../DietTemplates";

/**
 * Helper: extrai todos os textos da DOM e procura por "NaN".
 * Mais robusto que checar campo por campo, porque captura QUALQUER
 * lugar onde a UI tenha quebrado o cálculo.
 */
function expectNoNaNInDom(_container?: HTMLElement) {
  // Radix Dialog renderiza em portal (document.body), então sempre
  // checamos a árvore COMPLETA — não apenas o container do render().
  const text = document.body.textContent || "";
  expect(text).not.toMatch(/NaN/);
  expect(text).not.toMatch(/Infinity/);
}

function getDomText(): string {
  return document.body.textContent || "";
}

/**
 * Helper: garante que uma string parece um número (ex: "1783", "120",
 * "0", "1.5") — não `NaN`, não vazio, não `undefined`.
 */
function expectNumeric(value: string | null | undefined) {
  expect(value).toBeTruthy();
  expect(value).not.toMatch(/NaN/i);
  expect(value).not.toMatch(/undefined/i);
  // Aceita inteiros e decimais (com . ou ,)
  expect(value!.trim()).toMatch(/^-?\d+([.,]\d+)?$/);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DietTemplates />
    </MemoryRouter>,
  );
}

async function openPreview() {
  const card = await screen.findByText("Marmitas Fixas Semanais");
  fireEvent.click(card);
  // Espera o modal aparecer (DialogTitle com mesmo nome)
  await waitFor(() => {
    expect(screen.getAllByText("Marmitas Fixas Semanais").length).toBeGreaterThan(1);
  });
}

// ─── Builders dos templates ─────────────────────────────────────────────
const buildV2BlocksTemplate = () => ({
  id: "tpl-marmita-v2",
  name: "Marmitas Fixas Semanais",
  slug: "marmitas-fixas",
  description: "Cardápio para pacientes que consomem marmitas congeladas pré-prontas.",
  icon: "🍱",
  category: "lifestyle",
  goal_category: "manutencao",
  base_calories: 1800,
  macro_ratio: { protein: 30, carbs: 45, fat: 25 },
  conditions: [],
  tags: ["marmita", "congelada"],
  template_generation: "official_v2",
  is_active: true,
  meals: [
    {
      meal_type: "lunch",
      title: "Almoço",
      blocks: [
        {
          block_type: "protein",
          label: "Proteína",
          base_quantity: "150g",
          options: [
            { name: "Frango grelhado", portion: "150g", calories: 250, protein: 45, carbs: 0, fat: 6 },
            { name: "Patinho moído", portion: "150g", calories: 270, protein: 40, carbs: 0, fat: 10 },
          ],
        },
        {
          block_type: "carb",
          label: "Carbo",
          base_quantity: "100g",
          options: [
            { name: "Arroz integral", portion: "100g", calories: 130, protein: 3, carbs: 28, fat: 1 },
          ],
        },
      ],
    },
    {
      meal_type: "dinner",
      title: "Jantar",
      blocks: [
        {
          block_type: "protein",
          label: "Proteína",
          base_quantity: "150g",
          options: [
            { name: "Tilápia", portion: "150g", calories: 200, protein: 38, carbs: 0, fat: 5 },
          ],
        },
      ],
    },
  ],
});

const buildV2BlocksMissingMacros = () => ({
  ...buildV2BlocksTemplate(),
  id: "tpl-marmita-no-macros",
  meals: [
    {
      meal_type: "lunch",
      title: "Almoço",
      blocks: [
        {
          block_type: "protein",
          label: "Proteína",
          base_quantity: "150g",
          // options sem nenhum campo de macro — adapter deve cair p/ 0
          options: [{ name: "Frango grelhado", portion: "150g" }],
        },
        {
          // Bloco SEM options — deve renderizar placeholder com macros zerados
          block_type: "carb",
          label: "Carbo",
          base_quantity: "100g",
          options: [],
        },
      ],
    },
  ],
});

const buildLegacyFoodsTemplate = () => ({
  ...buildV2BlocksTemplate(),
  id: "tpl-marmita-legacy",
  template_generation: "v1",
  meals: [
    {
      meal_type: "lunch",
      title: "Almoço",
      foods: [
        // Macros explicitamente null — usuário antigo importou template incompleto
        { name: "Marmita pronta", portion: "1 unidade", calories: null, protein: null, carbs: null, fat: null, substitutions: [] },
      ],
    },
  ],
});

const buildZeroBaseCaloriesTemplate = () => ({
  ...buildV2BlocksTemplate(),
  id: "tpl-marmita-zero-base",
  base_calories: 0, // Caso degenerado: divisor zero no multiplicador
  meals: [
    {
      meal_type: "lunch",
      title: "Almoço",
      blocks: [
        {
          block_type: "protein",
          label: "Proteína",
          base_quantity: "150g",
          options: [
            { name: "Frango grelhado", portion: "150g", calories: 250, protein: 45, carbs: 0, fat: 6 },
          ],
        },
      ],
    },
  ],
});

// ─── Suite ──────────────────────────────────────────────────────────────
describe("Marmitas Fixas Semanais — macros nunca renderizam NaN", () => {
  beforeEach(() => {
    STATE.templates = [];
  });

  it("v2 (blocks com macros completos): kcal/P/C/G são números válidos", async () => {
    STATE.templates = [buildV2BlocksTemplate()];
    renderPage();
    await openPreview();

    expectNoNaNInDom();

    const fullText = getDomText();

    // Linha por alimento: "{cal}kcal · P{p}g · C{c}g · G{g}g"
    const macroRegex = /(-?\d+(?:[.,]\d+)?)\s*kcal\s*·\s*P\s*(-?\d+(?:[.,]\d+)?)\s*g\s*·\s*C\s*(-?\d+(?:[.,]\d+)?)\s*g\s*·\s*G\s*(-?\d+(?:[.,]\d+)?)\s*g/g;
    const matches = Array.from(fullText.matchAll(macroRegex));
    expect(matches.length, "Nenhuma linha de macro renderizada").toBeGreaterThan(0);

    for (const m of matches) {
      const [, kcal, p, c, g] = m;
      expectNumeric(kcal);
      expectNumeric(p);
      expectNumeric(c);
      expectNumeric(g);
    }

    // Header da refeição: "{N} kcal"
    const headerMatches = Array.from(fullText.matchAll(/(\d+)\s*kcal/g));
    expect(headerMatches.length).toBeGreaterThan(0);
    headerMatches.forEach(([, num]) => expectNumeric(num));
  });

  it("v2 (options sem macros): adapter normaliza p/ 0, não renderiza NaN", async () => {
    STATE.templates = [buildV2BlocksMissingMacros()];
    renderPage();
    await openPreview();

    expectNoNaNInDom();

    const fullText = getDomText();
    const macroRegex = /(\d+)\s*kcal\s*·\s*P\s*(\d+)\s*g\s*·\s*C\s*(\d+)\s*g\s*·\s*G\s*(\d+)\s*g/g;
    const matches = Array.from(fullText.matchAll(macroRegex));
    expect(matches.length).toBeGreaterThan(0);
  });

  it("legacy (foods com macros null): UI degrada para 0, sem NaN", async () => {
    STATE.templates = [buildLegacyFoodsTemplate()];
    renderPage();

    // Legado fica escondido por padrão — abrir o accordion
    const legacyToggle = await screen.findByText(/modelos antigos/i);
    fireEvent.click(legacyToggle);

    await openPreview();
    expectNoNaNInDom();
  });

  // ✅ BUG CORRIGIDO: `getCalorieMultiplier` agora retorna 1 (fallback) quando
  // `base_calories <= 0`, e `adjustFood` usa `safeNum` para coagir null/undefined/NaN
  // para 0 antes de multiplicar. A UI nunca mais renderiza "NaN".
  // Ver: src/pages/DietTemplates.tsx → safeNum / getCalorieMultiplier / adjustFood.
  it("base_calories = 0 (divisor degenerado): UI degrada graciosamente, sem NaN", async () => {
    STATE.templates = [buildZeroBaseCaloriesTemplate()];
    renderPage();
    await openPreview();

    expectNoNaNInDom();
  });

  it("regressão screenshot: múltiplos templates simultâneos sem NaN no preview", async () => {
    // Estado real do banco quando o bug apareceu na captura de tela:
    // mistura de v2 completo, v2 com macros faltando, legado e degenerado.
    STATE.templates = [
      buildV2BlocksTemplate(),
      buildV2BlocksMissingMacros(),
      buildLegacyFoodsTemplate(),
      buildZeroBaseCaloriesTemplate(),
    ];

    renderPage();

    // Os 4 templates compartilham o mesmo NOME ("Marmitas Fixas Semanais"),
    // mas o que importa é abrir um deles e garantir que o modal não vaza
    // NaN — o bug original aconteceu independente do template específico.
    const cards = await screen.findAllByText("Marmitas Fixas Semanais");
    expect(cards.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(cards[0]);

    // Espera o dialog abrir (texto "Calorias ajustadas" não aparece sem
    // anamnesis, então usamos um marcador estável: o título da refeição)
    await waitFor(() => {
      expect(screen.getAllByText("Almoço").length).toBeGreaterThan(0);
    });

    expectNoNaNInDom();

    // Sanidade: pelo menos uma linha de macro renderizada
    const fullText = getDomText();
    expect(fullText).toMatch(/kcal\s*·\s*P\s*\d+/);
  });
});
