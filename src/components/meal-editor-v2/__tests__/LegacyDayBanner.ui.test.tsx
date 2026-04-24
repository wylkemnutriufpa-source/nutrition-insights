/**
 * Testes UI (RTL) para o LegacyDayBanner:
 * - Toast pós-migração exibe contadores por meal_type e total de conflitos.
 * - Botão "Desfazer" restaura items E reativa fallback (header reflete
 *   imediatamente o dia legado original em vez de continuar em day 0).
 *
 * O store Zustand é inicializado in-memory e o `sonner` é mockado para
 * capturar o conteúdo dos toasts (incluindo a action `Desfazer`).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import LegacyDayBanner from "@/components/meal-editor-v2/LegacyDayBanner";
import { resolveHeaderSnapshot } from "@/lib/editorHeaderSnapshot";

// ── Mocks ─────────────────────────────────────────────────────────────
type ToastAction = { label: string; onClick: () => void };
const toastCalls: Array<{
  type: "success" | "info" | "error";
  message: string;
  action?: ToastAction;
}> = [];

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string, opts?: { action?: ToastAction }) => {
      toastCalls.push({ type: "success", message: msg, action: opts?.action });
    },
    info: (msg: string) => toastCalls.push({ type: "info", message: msg }),
    error: (msg: string) => toastCalls.push({ type: "error", message: msg }),
  },
}));

const mkItem = (
  id: string,
  day: number,
  meal: string,
  cals = 100
): any => ({
  id,
  meal_plan_id: "plan-1",
  day_of_week: day,
  meal_type: meal,
  meal_name: `Meal ${id}`,
  food_name: `Food ${id}`,
  food_id: null,
  template_id: null,
  meal_template_id: null,
  template_food_id: null,
  visual_match_id: null,
  food_image_url: null,
  food_emoji: null,
  base_recipe_data: null,
  meal_time: "12:00",
  servings: 1,
  custom_quantity_grams: 100,
  custom_unit_label: "g",
  calories_target: cals,
  protein_target: 10,
  carbs_target: 20,
  fat_target: 5,
  meal_order: 1,
  notes: null,
  is_locked: false,
  is_manually_edited: false,
  is_template_protected: false,
  edit_metadata: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

function seedStoreWithItems(items: any[]) {
  useMealPlanEditorV2Store.setState({
    planId: "plan-1",
    plan: { id: "plan-1", plan_status: "draft" } as any,
    patientName: "Test",
    items,
    hydrated: true,
    hydrating: false,
    clipboardItems: null,
    syncStatus: "idle",
    syncingMap: {},
    pendingOps: [],
    lastSavedAt: null,
  } as any);
}

beforeEach(() => {
  toastCalls.length = 0;
  // Reset relevant pieces of the store state before each test.
  useMealPlanEditorV2Store.setState({
    items: [],
    pendingOps: [],
    syncStatus: "idle",
  } as any);
});

describe("LegacyDayBanner — toast pós-migração", () => {
  it("toast exibe contadores por meal_type e total de conflitos", () => {
    seedStoreWithItems([
      mkItem("d0_lunch", 0, "lunch", 200),
      mkItem("legacy_lunch", 1, "lunch", 999), // conflita
      mkItem("legacy_dinner", 1, "dinner", 500), // move
      mkItem("legacy_breakfast", 1, "breakfast", 300), // move
    ]);

    const onToggle = vi.fn();
    render(
      <LegacyDayBanner
        effectiveDay={1}
        forceCanonical={false}
        onToggleForceCanonical={onToggle}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Migrar itens para dia 0/i }));

    expect(toastCalls.length).toBeGreaterThan(0);
    const success = toastCalls.find((t) => t.type === "success");
    expect(success).toBeTruthy();
    // 2 movidos
    expect(success!.message).toMatch(/2 refeição/);
    // contagens por meal_type movidas (PT-BR labels)
    expect(success!.message).toContain("Jantar: 1");
    expect(success!.message).toContain("Café da Manhã: 1");
    // bloco de conflitos
    expect(success!.message).toMatch(/Conflitos preservados/);
    expect(success!.message).toContain("Almoço: 1");

    // UI também mostra resumo com total de conflitos
    expect(screen.getByText(/Migração concluída/)).toBeInTheDocument();
    expect(screen.getByText(/1 item\(ns\) preservado\(s\)/)).toBeInTheDocument();
  });

  it("toast inclui action 'Desfazer' funcional", () => {
    seedStoreWithItems([mkItem("a", 1, "lunch", 500)]);

    render(
      <LegacyDayBanner
        effectiveDay={1}
        forceCanonical={false}
        onToggleForceCanonical={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Migrar itens para dia 0/i }));

    const success = toastCalls.find((t) => t.type === "success" && t.action);
    expect(success?.action?.label).toBe("Desfazer");

    // Após migrar, o item está em day 0
    expect(useMealPlanEditorV2Store.getState().items[0].day_of_week).toBe(0);

    // Clicando na action o item volta para day 1
    act(() => success!.action!.onClick());
    expect(useMealPlanEditorV2Store.getState().items[0].day_of_week).toBe(1);
  });
});

describe("LegacyDayBanner — Desfazer restaura header/totais", () => {
  it("após Desfazer no banner, header refeito reflete o dia legado original", () => {
    seedStoreWithItems([mkItem("a", 2, "lunch", 333)]);

    // Antes da migração: header em fallback aponta day 2
    let snap = resolveHeaderSnapshot(useMealPlanEditorV2Store.getState().items, {
      forceCanonical: false,
    });
    expect(snap.effectiveDay).toBe(2);
    expect(snap.totals.calories).toBe(333);

    // Toggle stub: replica o efeito real de mudar a preferência canonical
    let canonical = false;
    const onToggle = vi.fn((v: boolean) => {
      canonical = v;
    });

    const { rerender } = render(
      <LegacyDayBanner
        effectiveDay={2}
        forceCanonical={false}
        onToggleForceCanonical={onToggle}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Migrar itens para dia 0/i }));

    // Após migração: handleMigrate liga forceCanonical=true
    expect(canonical).toBe(true);
    expect(useMealPlanEditorV2Store.getState().items[0].day_of_week).toBe(0);

    // Header pós-migração com canonical=true
    snap = resolveHeaderSnapshot(useMealPlanEditorV2Store.getState().items, {
      forceCanonical: canonical,
    });
    expect(snap.effectiveDay).toBe(0);
    expect(snap.totals.calories).toBe(333);

    // Re-render com novo prop refletindo canonical=true e effectiveDay=0
    rerender(
      <LegacyDayBanner
        effectiveDay={0}
        forceCanonical={canonical}
        onToggleForceCanonical={onToggle}
      />
    );

    // Clica em Desfazer (botão dentro do resumo)
    fireEvent.click(screen.getByRole("button", { name: /Desfazer migração/i }));

    // CRÍTICO: handleUndo deve reativar fallback (canonical=false)
    expect(canonical).toBe(false);
    expect(useMealPlanEditorV2Store.getState().items[0].day_of_week).toBe(2);

    // Header recalculado imediatamente após o undo: volta para day 2
    snap = resolveHeaderSnapshot(useMealPlanEditorV2Store.getState().items, {
      forceCanonical: canonical,
    });
    expect(snap.effectiveDay).toBe(2);
    expect(snap.effectiveDayLabel).toBe("Terça");
    expect(snap.totals.calories).toBe(333);
    expect(snap.showingLegacy).toBe(true);
  });
});
