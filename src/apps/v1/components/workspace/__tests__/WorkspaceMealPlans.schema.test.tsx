/**
 * Integration tests — current schema (title / plan_status)
 *
 * Verifica que:
 *  • WorkspaceMealPlans renderiza a contagem correta usando colunas atuais
 *  • Sucesso e erro são tratados (com retry)
 *  • Status desconhecidos caem no fallback genérico sem quebrar
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---- Mock Supabase client antes do import do componente ----

interface MockRow {
  id: string;
  title: string;
  plan_status: string;
  is_active: boolean;
  created_at: string;
  patient_id: string;
}

const state: {
  rows: MockRow[];
  shouldFail: boolean;
  profiles: Array<{ user_id: string; full_name: string }>;
  alertsInserted: any[];
} = {
  rows: [],
  shouldFail: false,
  profiles: [],
  alertsInserted: [],
};

function buildMealPlanQuery() {
  const builder: any = {
    _filters: {} as Record<string, unknown>,
    select() { return builder; },
    eq(_col: string, value: unknown) { builder._filters[_col] = value; return builder; },
    order() { return builder; },
    limit() {
      if (state.shouldFail) {
        return Promise.resolve({ data: null, error: { message: "Network down" } });
      }
      return Promise.resolve({ data: state.rows, error: null });
    },
  };
  return builder;
}

function buildProfilesQuery() {
  const builder: any = {
    select() { return builder; },
    in(_col: string, ids: string[]) {
      const data = state.profiles.filter((p) => ids.includes(p.user_id));
      return Promise.resolve({ data, error: null });
    },
  };
  return builder;
}

vi.mock("@v1/integrations/supabase/client", () => ({
  supabase: {
    from(table: string) {
      if (table === "meal_plans") return buildMealPlanQuery();
      if (table === "profiles") return buildProfilesQuery();
      if (table === "system_alerts") {
        return {
          insert: (row: any) => {
            state.alertsInserted.push(row);
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      return { select: () => ({ eq: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) }) };
    },
  },
}));

vi.mock("@v1/lib/auth", () => ({
  useAuth: () => ({ user: { id: "nutri-1" } }),
}));

import WorkspaceMealPlans from "../WorkspaceMealPlans";
import { __resetPlanStatusReportingForTests } from "@v1/lib/planStatusLabels";

function renderComp(search = "") {
  return render(
    <MemoryRouter>
      <WorkspaceMealPlans search={search} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  state.rows = [];
  state.shouldFail = false;
  state.profiles = [];
  state.alertsInserted = [];
  __resetPlanStatusReportingForTests();
});

describe("WorkspaceMealPlans (schema atual: title/plan_status)", () => {
  it("renderiza a contagem correta de planos retornados", async () => {
    state.rows = [
      { id: "p1", title: "Plano A", plan_status: "published_to_patient", is_active: true, created_at: "2026-04-23T10:00:00Z", patient_id: "u1" },
      { id: "p2", title: "Plano B", plan_status: "draft_auto_corrected", is_active: false, created_at: "2026-04-22T10:00:00Z", patient_id: "u2" },
      { id: "p3", title: "Plano C", plan_status: "approved", is_active: false, created_at: "2026-04-21T10:00:00Z", patient_id: "u1" },
    ];
    state.profiles = [
      { user_id: "u1", full_name: "Maria" },
      { user_id: "u2", full_name: "João" },
    ];

    renderComp();

    const counter = await screen.findByTestId("workspace-meal-plans-count");
    expect(counter.textContent).toContain("3 planos encontrados");
    expect(screen.getByText("Plano A")).toBeInTheDocument();
    expect(screen.getByText("Plano B")).toBeInTheDocument();
    expect(screen.getByText("Plano C")).toBeInTheDocument();
    expect(screen.getAllByText("Maria").length).toBeGreaterThan(0);
    expect(screen.getByText("João")).toBeInTheDocument();
  });

  it("mostra erro com botão de retry quando a query falha e recupera no retry", async () => {
    state.shouldFail = true;
    renderComp();

    const errorBox = await screen.findByTestId("workspace-meal-plans-error");
    expect(errorBox).toBeInTheDocument();
    // The classifier produces a friendly title; just assert any title text exists.
    expect(errorBox.textContent || "").toMatch(/(planos|conexão|servidor|sem permissão)/i);

    // Recupera conexão e clica em retry
    state.shouldFail = false;
    state.rows = [
      { id: "p9", title: "Plano Recuperado", plan_status: "published_to_patient", is_active: true, created_at: "2026-04-23T10:00:00Z", patient_id: "u1" },
    ];

    await act(async () => {
      fireEvent.click(screen.getByTestId("workspace-meal-plans-retry"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("workspace-meal-plans-error")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Plano Recuperado")).toBeInTheDocument();
  });

  it("mapeia plan_status desconhecido para label genérico sem quebrar a UI", async () => {
    state.rows = [
      { id: "p1", title: "Plano X", plan_status: "totally_new_status_xyz", is_active: false, created_at: "2026-04-23T10:00:00Z", patient_id: "u1" },
    ];
    state.profiles = [{ user_id: "u1", full_name: "Maria" }];

    renderComp();

    expect(await screen.findByText("Plano X")).toBeInTheDocument();
    // Deve aparecer o badge de fallback genérico contendo o valor cru
    expect(screen.getByText(/status desconhecido/i)).toBeInTheDocument();
    expect(screen.getByText(/totally_new_status_xyz/i)).toBeInTheDocument();

    // E logou um alerta remoto sobre o status novo
    await waitFor(() => {
      expect(state.alertsInserted.length).toBeGreaterThan(0);
    });
    expect(state.alertsInserted[0].alert_type).toBe("PLAN_STATUS_UNKNOWN");
    expect(state.alertsInserted[0].metadata.plan_status).toBe("totally_new_status_xyz");
  });

  it("filtra pela busca preservando a contagem coerente", async () => {
    state.rows = [
      { id: "p1", title: "Hipertrofia Maria", plan_status: "published_to_patient", is_active: true, created_at: "2026-04-23T10:00:00Z", patient_id: "u1" },
      { id: "p2", title: "Manutenção João", plan_status: "approved", is_active: false, created_at: "2026-04-22T10:00:00Z", patient_id: "u2" },
    ];
    state.profiles = [
      { user_id: "u1", full_name: "Maria" },
      { user_id: "u2", full_name: "João" },
    ];

    renderComp("Hipertrofia");

    const counter = await screen.findByTestId("workspace-meal-plans-count");
    await waitFor(() => expect(counter.textContent).toContain("1 planos encontrados"));
    expect(screen.getByText("Hipertrofia Maria")).toBeInTheDocument();
    expect(screen.queryByText("Manutenção João")).not.toBeInTheDocument();
  });
});
