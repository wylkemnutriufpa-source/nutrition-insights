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

const scenarios: PartialScenario[] = [
  {
    label: "weekly: lunch meets, dinner does not",
    counts: { lunch: 7, dinner: 3, fixedLunch: 1, fixedDinner: 1 },
    weeklyShouldBeDisabled: true,
    fixedShouldBeDisabled: false,
    weeklyCountsText: /Almoço 7\/7 · Jantar 3\/7/i,
  },
  {
    label: "weekly: dinner meets, lunch does not",
    counts: { lunch: 4, dinner: 7, fixedLunch: 1, fixedDinner: 1 },
    weeklyShouldBeDisabled: true,
    fixedShouldBeDisabled: false,
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
    label: "weekly: exact match enables button",
    counts: { lunch: 7, dinner: 7, fixedLunch: 1, fixedDinner: 1 },
    weeklyShouldBeDisabled: false,
    fixedShouldBeDisabled: false,
  },
  {
    label: "weekly: lower configured minimum (3+3) is met by partial counts",
    counts: { lunch: 3, dinner: 4, fixedLunch: 1, fixedDinner: 1 },
    settings: { weekly_min_lunch: 3, weekly_min_dinner: 3 },
    weeklyShouldBeDisabled: false,
    fixedShouldBeDisabled: false,
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

      await waitFor(() => {
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
      });

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
