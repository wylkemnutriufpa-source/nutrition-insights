/**
 * Editor V3 Routing Integrity Tests
 * -----------------------------------------------------------------------------
 * Locks in the contract that the V3 alias routes render EXCLUSIVELY the
 * canonical EditorV3Page (src/features/editor-v3/EditorV3Page.tsx) and that
 * the legacy `MealPlanEditorV3Experimental` is no longer wired anywhere in
 * the codebase.
 *
 * It also guards V2 (the operational editor for already-published plans)
 * to ensure V3 integration did not regress V2 routing.
 *
 * This is a static-analysis test on purpose: the App tree requires Auth,
 * Tenant, Query, and Workspace providers. Parsing the route table directly
 * gives us a deterministic, fast, regression-proof signal without spinning
 * up the entire provider stack.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROUTES_FILE = path.resolve(__dirname, "../routes/AppRoutes.tsx");
const ROUTES_SRC = fs.readFileSync(ROUTES_FILE, "utf-8");

// All routes that MUST resolve to the new EditorV3Page.
const V3_ROUTES = [
  "/v3",
  "/v3/:patientId",
  "/editor",
  "/editor-v3/:patientId",
  "/diet/v3/:patientId",
  "/experimental/v3/:patientId",
  "/elite/v3/:patientId",
  "/meal-plan-editor-v3",
  "/dieta-v3",
];

// Canonical V2 routes — must still render the V2 editor (NOT V3).
const V2_ROUTES = [
  "/meal-plans/:id",
  "/meal-plan-editor/:id",
  "/editor-v2/:id",
  "/meal-plan-editor-v2/:id",
  "/dieta-v2/:id",
];

function findRouteLine(pathname: string): string | null {
  // Match the exact path attribute and capture the full <Route .../> line.
  const escaped = pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<Route\\s+path="${escaped}"[^>]*element=\\{[^}]*\\}\\s*/?>`, "m");
  const match = ROUTES_SRC.match(regex);
  return match ? match[0] : null;
}

describe("Editor V3 routing integrity", () => {
  it("imports EditorV3Page from the canonical feature module", () => {
    expect(ROUTES_SRC).toMatch(
      /const\s+EditorV3Page\s*=\s*lazyDebug\(\s*\(\)\s*=>\s*import\(\s*["']\.\.\/features\/editor-v3\/EditorV3Page["']\s*\)/
    );
  });

  it.each(V3_ROUTES)("route '%s' renders <EditorV3Page />", (route) => {
    const line = findRouteLine(route);
    expect(line, `Route ${route} not found in AppRoutes.tsx`).not.toBeNull();
    expect(line!).toContain("<EditorV3Page");
    // Must NOT reference any other editor component.
    expect(line!).not.toContain("MealPlanEditorV2");
    expect(line!).not.toContain("MealPlanEditorV3Experimental");
  });
});

describe("Legacy V3 experimental component fully removed", () => {
  it("AppRoutes.tsx contains no reference to MealPlanEditorV3Experimental", () => {
    expect(ROUTES_SRC).not.toMatch(/MealPlanEditorV3Experimental/);
  });

  it("AppRoutes.tsx contains no leftover imports from experimental V3 paths", () => {
    expect(ROUTES_SRC).not.toMatch(/editor-v3-experimental/i);
    expect(ROUTES_SRC).not.toMatch(/MealPlanEditorV3Experimental/);
  });
});

describe("V2 editor non-regression (published / approved plans keep working)", () => {
  it.each(V2_ROUTES)("route '%s' still renders <MealPlanEditorV2 />", (route) => {
    const line = findRouteLine(route);
    expect(line, `Route ${route} missing from AppRoutes.tsx`).not.toBeNull();
    expect(line!).toContain("<MealPlanEditorV2");
    // Must NOT have been hijacked by V3.
    expect(line!).not.toContain("<EditorV3Page");
  });

  it("still imports both V2 entrypoints (editor + entry resolver)", () => {
    expect(ROUTES_SRC).toMatch(/import\(\s*["']\.\.\/pages\/MealPlanEditorV2["']\s*\)/);
    expect(ROUTES_SRC).toMatch(/import\(\s*["']\.\.\/pages\/MealPlanEditorV2Entry["']\s*\)/);
  });
});

describe("EditorV3Page module exposes a safe fallback for missing patient context", () => {
  const PAGE_SRC = fs.readFileSync(
    path.resolve(__dirname, "../features/editor-v3/EditorV3Page.tsx"),
    "utf-8"
  );

  it("renders a 'Paciente não selecionado' fallback when no patientId / planId", () => {
    expect(PAGE_SRC).toMatch(/Paciente n[ãa]o selecionado/);
    expect(PAGE_SRC).toMatch(/Voltar para Pacientes/);
  });

  it("exports the canonical MealPlanEditorV3 component, not the experimental one", () => {
    expect(PAGE_SRC).toMatch(/from ['"]@\/components\/meal-editor-v3\/MealPlanEditorV3['"]/);
    expect(PAGE_SRC).not.toMatch(/MealPlanEditorV3Experimental/);
  });
});
