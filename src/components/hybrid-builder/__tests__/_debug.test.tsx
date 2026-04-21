import { describe, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  installGenerationModeSelectorMocks,
  setMockState,
} from "./helpers/mockGenerationModeSelector";

installGenerationModeSelectorMocks();

import GenerationModeSelector from "../GenerationModeSelector";

describe("debug", () => {
  it("dump", async () => {
    setMockState({ counts: { lunch: 7, dinner: 3, fixedLunch: 1, fixedDinner: 1 } });
    render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);
    await waitFor(() => {
      expect(screen.queryAllByText(/verificando…/i)).toHaveLength(0);
    });
    const weekly = screen.getByRole("button", { name: /Cardápio Semanal/i });
    // eslint-disable-next-line no-console
    console.log("WEEKLY TEXT:", JSON.stringify(weekly.textContent));
    const fixed = screen.getByRole("button", { name: /Marmitas Fixas/i });
    // eslint-disable-next-line no-console
    console.log("FIXED TEXT:", JSON.stringify(fixed.textContent));
  });
});
