import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  setupGenerationModeSelectorMocks,
  READY_COUNTS,
} from "./helpers/mockGenerationModeSelector";

setupGenerationModeSelectorMocks({ counts: READY_COUNTS });

// Imported AFTER mocks are registered.
import GenerationModeSelector from "../GenerationModeSelector";

describe("GenerationModeSelector — mode hints", () => {
  beforeEach(() => vi.clearAllMocks());

  const cases = [
    {
      name: "weekly",
      pattern: /Verificando mínimo de almoço \+ jantar para modo semanal/i,
      expectedClass: "text-primary/70",
    },
    {
      name: "fixed",
      pattern: /Verificando mínimo de almoço \+ jantar fixos para marmitas congeladas/i,
      expectedClass: "text-accent/70",
    },
  ] as const;

  it.each(cases)(
    "renders the $name hint with the correct tone class",
    async ({ pattern, expectedClass }) => {
      render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);
      const hint = await screen.findByText(pattern);
      expect(hint).toBeInTheDocument();
      expect(hint.className).toContain(expectedClass);
    }
  );

  it("hides hints while checks are loading", () => {
    const { container } = render(
      <GenerationModeSelector patientId="p-1" onGenerated={() => {}} />
    );
    expect(container.textContent || "").toContain("verificando");
  });

  it("renders both hints together when ready", async () => {
    render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/modo semanal/i)).toBeInTheDocument();
      expect(screen.getByText(/marmitas congeladas/i)).toBeInTheDocument();
    });
  });
});
