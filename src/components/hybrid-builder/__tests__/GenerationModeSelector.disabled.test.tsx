import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  setupGenerationModeSelectorMocks,
  INSUFFICIENT_COUNTS,
} from "./helpers/mockGenerationModeSelector";

setupGenerationModeSelectorMocks({ counts: INSUFFICIENT_COUNTS });

import GenerationModeSelector from "../GenerationModeSelector";

interface Scenario {
  label: string;
  buttonName: RegExp;
  countsText: RegExp;
  alertText: RegExp;
}

const scenarios: Scenario[] = [
  {
    label: "weekly",
    buttonName: /Cardápio Semanal de Marmitas/i,
    countsText: /Almoço 2\/7 · Jantar 1\/7/i,
    alertText: /Cadastre mais receitas em "Receitas\/Marmitas"/i,
  },
  {
    label: "fixed",
    buttonName: /Marmitas Fixas \(Congeladas\)/i,
    countsText: /Almoço fixo 0\/1 · Jantar fixo 0\/1/i,
    alertText: /Cadastre marmitas com/i,
  },
];

describe("GenerationModeSelector — disabled state when minimums not met", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(scenarios)(
    "disables the $label button and shows its alert",
    async ({ buttonName, countsText, alertText }) => {
      render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);

      const btn = await screen.findByRole("button", { name: buttonName });
      await waitFor(() => expect(btn).toBeDisabled());

      expect(screen.getByText(countsText)).toBeInTheDocument();
      expect(screen.getByText(alertText)).toBeInTheDocument();
    }
  );
});
