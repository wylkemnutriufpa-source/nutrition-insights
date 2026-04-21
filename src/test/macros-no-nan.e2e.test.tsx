/**
 * E2E — Macros nunca renderizam NaN/Infinity/undefined
 * ─────────────────────────────────────────────────────
 *
 * Esta suíte é a ÚLTIMA LINHA DE DEFESA contra regressões do bug
 * "NaNkcal" que apareceu no modal de Marmitas Fixas Semanais. Renderiza
 * cada componente que exibe macros (kcal, P, C, G) com payloads tóxicos
 * — `null`, `undefined`, `NaN`, `Infinity`, strings, zero base — e
 * verifica que NENHUMA string `NaN`/`Infinity`/`undefined` vaza para o
 * DOM.
 *
 * Cobertura:
 *   • Helpers (`fmtMacro`, `safeNum`, `safeMultiplier`)
 *   • Páginas do paciente:
 *       - MacroBalanceBar
 *       - MacroGauge
 *       - MealCard
 *       - MealVisualCard
 *   • Dashboards do nutricionista:
 *       - ConsultationCompare (assessments com strings/null)
 *
 * Estratégia: testes unit-level rápidos (sem Supabase, sem rotas).
 * Para o cenário de página completa, ver:
 *   src/pages/__tests__/MarmitasFixasMacros.integration.test.tsx
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { fmtMacro, safeNum, safeMultiplier, fmtMacroDecimal } from "@/lib/formatMacros";
import MacroBalanceBar from "@/components/meals/MacroBalanceBar";
import MacroGauge from "@/components/recipe/MacroGauge";
import MealCard from "@/components/meals/MealCard";
import MealVisualCard from "@/components/meals/MealVisualCard";

// Mock supabase para ConsultationCompare (não toca rede)
const ASSESSMENTS_STATE: { rows: any[] } = { rows: [] };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.limit = () => Promise.resolve({ data: ASSESSMENTS_STATE.rows, error: null });
      return chain;
    },
  },
}));

import ConsultationCompare from "@/components/patient/ConsultationCompare";

// ───────────────────────────────────────────────────────────────────
// Helpers de asserção
// ───────────────────────────────────────────────────────────────────

const TOXIC_VALUES: unknown[] = [
  null,
  undefined,
  NaN,
  Infinity,
  -Infinity,
  "abc",
  "",
  {},
  [],
];

/** Falha se o DOM contiver qualquer string proibida. */
function expectCleanDom() {
  const text = document.body.textContent || "";
  expect(text, "DOM contém 'NaN'").not.toMatch(/NaN/);
  expect(text, "DOM contém 'Infinity'").not.toMatch(/Infinity/);
  expect(text, "DOM contém 'undefined'").not.toMatch(/undefined/i);
}

/** Renderiza com uma combinação de valores tóxicos e limpa o DOM entre execuções. */
function withToxicMatrix(
  label: string,
  fn: (toxic: { calories: any; protein: any; carbs: any; fat: any }) => void,
) {
  for (const cal of TOXIC_VALUES) {
    for (const prot of TOXIC_VALUES) {
      // Reduzimos a explosão combinatória: carbs/fat replicam `prot`.
      it(`${label} — kcal=${String(cal)} P/C/G=${String(prot)}`, () => {
        document.body.innerHTML = "";
        fn({ calories: cal, protein: prot, carbs: prot, fat: prot });
        expectCleanDom();
      });
    }
  }
}

// ───────────────────────────────────────────────────────────────────
// 1. Helpers — sanidade
// ───────────────────────────────────────────────────────────────────

describe("formatMacros helpers — entradas tóxicas nunca produzem NaN/Infinity/undefined", () => {
  it.each(TOXIC_VALUES)("safeNum(%p) retorna número finito 0", (v) => {
    const n = safeNum(v);
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBe(0);
  });

  it.each(TOXIC_VALUES)("fmtMacro(%p) retorna string segura", (v) => {
    const s = fmtMacro(v);
    expect(s).not.toMatch(/NaN|Infinity|undefined/i);
    expect(s).toBe("0");
  });

  it.each(TOXIC_VALUES)("fmtMacroDecimal(%p) retorna string segura", (v) => {
    const s = fmtMacroDecimal(v);
    expect(s).not.toMatch(/NaN|Infinity|undefined/i);
  });

  it("safeMultiplier — divisor zero retorna 1 (fallback)", () => {
    expect(safeMultiplier(1800, 0)).toBe(1);
    expect(safeMultiplier(1800, null)).toBe(1);
    expect(safeMultiplier(1800, undefined)).toBe(1);
    // NaN no numerador é coagido a 0 (safeNum), 0/1800 = 0 — número finito
    const out = safeMultiplier(NaN, 1800);
    expect(Number.isFinite(out)).toBe(true);
    expect(out).toBe(0);
  });

  it("safeMultiplier — operandos válidos retornam multiplicador correto", () => {
    expect(safeMultiplier(2000, 1000)).toBe(2);
    expect(safeMultiplier(1500, 2000)).toBe(0.75);
  });
});

// ───────────────────────────────────────────────────────────────────
// 2. MacroBalanceBar — protege contra divisão por zero
// ───────────────────────────────────────────────────────────────────

describe("<MacroBalanceBar /> — render seguro com payloads tóxicos", () => {
  // Componente retorna null quando total=0, mas deve renderizar barra
  // limpa quando há ao menos um valor tóxico misturado com um real.
  withToxicMatrix("MacroBalanceBar", (toxic) => {
    render(
      <MacroBalanceBar
        protein={toxic.protein as any}
        carbs={toxic.carbs as any}
        fat={toxic.fat as any}
        calories={toxic.calories as any}
      />,
    );
  });

  it("payload misto (proteína válida + resto tóxico) renderiza percentuais válidos", () => {
    document.body.innerHTML = "";
    render(
      <MacroBalanceBar
        protein={30}
        carbs={null as any}
        fat={undefined as any}
        calories={NaN as any}
      />,
    );
    expectCleanDom();
    // Deve mostrar P: 100% (proteína é o único válido)
    const text = document.body.textContent || "";
    expect(text).toMatch(/P:\s*100%/);
  });

  it("compact mode com payloads tóxicos não vaza NaN no tooltip trigger", () => {
    document.body.innerHTML = "";
    render(
      <MacroBalanceBar
        protein={"abc" as any}
        carbs={Infinity as any}
        fat={null as any}
        calories={NaN as any}
        compact
      />,
    );
    expectCleanDom();
  });
});

// ───────────────────────────────────────────────────────────────────
// 3. MacroGauge — donut + label numérico
// ───────────────────────────────────────────────────────────────────

describe("<MacroGauge /> — donut renderiza sem NaN", () => {
  for (const value of TOXIC_VALUES) {
    for (const target of TOXIC_VALUES) {
      it(`value=${String(value)} target=${String(target)}`, () => {
        document.body.innerHTML = "";
        render(
          <MacroGauge
            label="Proteína"
            value={value as any}
            target={target as any}
            unit="g"
            color="red-500"
            icon={null}
          />,
        );
        expectCleanDom();
      });
    }
  }

  it("valores válidos renderizam o número formatado", () => {
    document.body.innerHTML = "";
    render(
      <MacroGauge
        label="Proteína"
        value={120}
        target={150}
        unit="g"
        color="red-500"
        icon={null}
      />,
    );
    expectCleanDom();
    const text = document.body.textContent || "";
    expect(text).toMatch(/120g/);
    expect(text).toMatch(/meta:\s*150/);
  });
});

// ───────────────────────────────────────────────────────────────────
// 4. MealCard (timeline do paciente)
// ───────────────────────────────────────────────────────────────────

describe("<MealCard /> — refeição registrada com macros tóxicos", () => {
  withToxicMatrix("MealCard", (toxic) => {
    render(
      <MealCard
        title="Almoço"
        mealType="lunch"
        loggedAt={new Date().toISOString()}
        calories={toxic.calories as any}
        protein={toxic.protein as any}
        carbs={toxic.carbs as any}
        fat={toxic.fat as any}
        xpEarned={10}
      />,
    );
  });
});

// ───────────────────────────────────────────────────────────────────
// 5. MealVisualCard (biblioteca visual no paciente)
// ───────────────────────────────────────────────────────────────────

describe("<MealVisualCard /> — card da biblioteca com macros tóxicos", () => {
  for (const cal of TOXIC_VALUES) {
    for (const prot of TOXIC_VALUES) {
      it(`kcal=${String(cal)} prot=${String(prot)}`, () => {
        document.body.innerHTML = "";
        const item: any = {
          id: "vi-1",
          display_name: "Frango Grelhado",
          short_description: "150g",
          image_url: null,
          image_path: null,
          category: "protein",
          tags: [],
          default_calories: cal,
          default_protein: prot,
          default_portion: "150g",
        };
        render(<MealVisualCard item={item} />);
        expectCleanDom();
      });
    }
  }
});

// ───────────────────────────────────────────────────────────────────
// 6. ConsultationCompare (dashboard do nutricionista)
// ───────────────────────────────────────────────────────────────────

describe("<ConsultationCompare /> — comparativo com avaliações sujas", () => {
  it("avaliações com strings/null/undefined nos campos numéricos não vazam NaN", async () => {
    document.body.innerHTML = "";
    ASSESSMENTS_STATE.rows = [
      {
        id: "a-1",
        assessment_date: "2024-01-15",
        weight: "abc",
        body_fat_percentage: null,
        lean_mass: undefined,
        bmi: NaN,
        waist: "",
        abdomen: Infinity,
        hip: "70.5",
        right_arm: 32,
        bmr: 0,
        tdee: 2200,
        calories_target: 1800,
        protein_target: 150,
      },
      {
        id: "a-2",
        assessment_date: "2024-01-01",
        weight: 75.4,
        body_fat_percentage: 22,
        lean_mass: 58,
        bmi: 24.5,
        waist: 80,
        abdomen: 85,
        hip: 95,
        right_arm: 31,
        bmr: 1500,
        tdee: 2100,
        calories_target: 1700,
        protein_target: 140,
      },
    ];

    render(
      <MemoryRouter>
        <ConsultationCompare patientId="p-1" />
      </MemoryRouter>,
    );

    // Aguarda render assíncrono (useEffect → setState)
    await new Promise((r) => setTimeout(r, 50));
    expectCleanDom();
  });

  it("apenas uma avaliação disponível mostra placeholder e não NaN", async () => {
    document.body.innerHTML = "";
    ASSESSMENTS_STATE.rows = [
      {
        id: "a-1",
        assessment_date: "2024-01-15",
        weight: NaN,
        body_fat_percentage: "xyz",
      },
    ];

    render(
      <MemoryRouter>
        <ConsultationCompare patientId="p-1" />
      </MemoryRouter>,
    );

    await new Promise((r) => setTimeout(r, 50));
    expectCleanDom();
  });
});
