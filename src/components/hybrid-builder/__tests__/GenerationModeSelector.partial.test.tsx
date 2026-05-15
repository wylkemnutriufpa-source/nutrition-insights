import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  installGenerationModeSelectorMocks,
  setMockState,
  type RecipeCounts,
} from "./helpers/mockGenerationModeSelector";

installGenerationModeSelectorMocks();

import GenerationModeSelector from "../GenerationModeSelector";

interface PartialScenario {
  label: string;
  counts: RecipeCounts;
  // settings overrides (defaults: weekly 7+7, fixed 1+1)
  settings?: Parameters<typeof setMockState>[0]["settings"];
  weeklyShouldBeDisabled: boolean;
  fixedShouldBeDisabled: boolean;
  // optional text assertions on the visible counts line
  weeklyCountsText?: RegExp;
  fixedCountsText?: RegExp;
}

// Note on counts: the component computes weekly `lunch`/`dinner` from ALL
// recipes of that tipo_refeicao (including fixed ones). So a scenario with
// `lunch: 7, fixedLunch: 1` shows "Almoço 8/7" in the weekly button.

const scenarios: PartialScenario[] = [
  {
    label: "weekly: lunch meets, dinner does not",
    counts: { lunch: 6, dinner: 3, fixedLunch: 1, fixedDinner: 0 },
    weeklyShouldBeDisabled: true, // dinner 3 < 7
    fixedShouldBeDisabled: true, // fixedDinner 0 < 1
    weeklyCountsText: /Almoço 7\/7 · Jantar 3\/7/i,
  },
  {
    label: "weekly: dinner meets, lunch does not",
    counts: { lunch: 4, dinner: 6, fixedLunch: 0, fixedDinner: 1 },
    weeklyShouldBeDisabled: true, // lunch 4 < 7
    fixedShouldBeDisabled: true, // fixedLunch 0 < 1
    weeklyCountsText: /Almoço 4\/7 · Jantar 7\/7/i,
  },
  {
    label: "fixed: fixed lunch meets, fixed dinner does not",
    counts: { lunch: 7, dinner: 7, fixedLunch: 2, fixedDinner: 0 },
    weeklyShouldBeDisabled: false,
    fixedShouldBeDisabled: true,
    fixedCountsText: /Almoço fixo 2\/1 · Jantar fixo 0\/1/i,
  },
  {
    label: "fixed: fixed dinner meets, fixed lunch does not",
    counts: { lunch: 7, dinner: 7, fixedLunch: 0, fixedDinner: 3 },
    weeklyShouldBeDisabled: false,
    fixedShouldBeDisabled: true,
    fixedCountsText: /Almoço fixo 0\/1 · Jantar fixo 3\/1/i,
  },
  {
    label: "exact match enables both buttons",
    counts: { lunch: 6, dinner: 6, fixedLunch: 1, fixedDinner: 1 },
    weeklyShouldBeDisabled: false,
    fixedShouldBeDisabled: false,
  },
  {
    label: "weekly: lower configured minimum (3+3) is met by partial counts",
    counts: { lunch: 3, dinner: 4, fixedLunch: 0, fixedDinner: 0 },
    settings: { weekly_min_lunch: 3, weekly_min_dinner: 3 },
    weeklyShouldBeDisabled: false,
    fixedShouldBeDisabled: true, // default fixed minimums 1+1, fixed counts are 0
    weeklyCountsText: /Almoço 3\/3 · Jantar 4\/3/i,
  },
];

const WEEKLY_BTN = /Cardápio Semanal de Marmitas/i;
const FIXED_BTN = /Marmitas Fixas \(Congeladas\)/i;
const WEEKLY_ALERT = /Cadastre mais receitas em "Receitas\/Marmitas"/i;
const FIXED_ALERT = /Cadastre marmitas com/i;

describe("GenerationModeSelector — partial count scenarios", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(scenarios)(
    "$label",
    async ({
      counts,
      settings,
      weeklyShouldBeDisabled,
      fixedShouldBeDisabled,
      weeklyCountsText,
      fixedCountsText,
    }) => {
      setMockState({ counts, settings });
      render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);

      const weeklyBtn = await screen.findByRole("button", { name: WEEKLY_BTN });
      const fixedBtn = await screen.findByRole("button", { name: FIXED_BTN });

      // Wait for the supabase pre-flight to settle (loading "verificando…" gone)
      await waitFor(() => {
        expect(screen.queryAllByText(/verificando…/i)).toHaveLength(0);
      });

      if (weeklyShouldBeDisabled) {
        expect(weeklyBtn).toBeDisabled();
      } else {
        expect(weeklyBtn).not.toBeDisabled();
      }
      if (fixedShouldBeDisabled) {
        expect(fixedBtn).toBeDisabled();
      } else {
        expect(fixedBtn).not.toBeDisabled();
      }

      // Alert visibility tracks the disabled state
      if (weeklyShouldBeDisabled) {
        expect(screen.getByText(WEEKLY_ALERT)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(WEEKLY_ALERT)).not.toBeInTheDocument();
      }
      if (fixedShouldBeDisabled) {
        expect(screen.getByText(FIXED_ALERT)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(FIXED_ALERT)).not.toBeInTheDocument();
      }

      if (weeklyCountsText) {
        expect(screen.getByText(weeklyCountsText)).toBeInTheDocument();
      }
      if (fixedCountsText) {
        expect(screen.getByText(fixedCountsText)).toBeInTheDocument();
      }
    }
  );
});
