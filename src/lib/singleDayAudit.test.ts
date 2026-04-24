/**
 * Single Day Audit Tests (PRODUÇÃO)
 * ----------------------------------------------------------------
 * Cobre os cenários definidos na auditoria crítica:
 *  - ETAPA 2: Edição real (estrutura/macros/substituições idênticas)
 *  - ETAPA 4: Conflito de edição rápida sequencial
 *  - ETAPA 5: Validação de integridade (drift, orfãos, contagem)
 *
 * Não tocam o banco — exercitam o validador local que espelha a RPC
 * `validate_single_day_consistency` (mesma semântica).
 */

import { describe, expect, it } from "vitest";
import {
  checkSingleDayConsistency,
  assertSingleDayConsistency,
  SingleDayConsistencyError,
} from "./singleDayConsistency";
import {
  assertSingleDayItems,
  detectAutomatedWeeklyVariation,
  diffUiVsDb,
} from "./singleDayGuards";

const mealType = "lunch" as any;

const masterItem = (over: Partial<any> = {}) => ({
  id: "m1",
  meal_plan_id: "plan-1",
  title: "Frango grelhado 130g",
  meal_type: mealType,
  day_of_week: 0,
  calories_target: 320,
  protein_target: 38,
  carbs_target: 12,
  fat_target: 8,
  ...over,
});

const replicaOf = (master: any, day: number, over: Partial<any> = {}) => ({
  ...master,
  id: `r-${day}`,
  day_of_week: day,
  master_item_id: master.id,
  ...over,
});

const buildFullPlan = (master: any) => [
  master,
  ...[1, 2, 3, 4, 5, 6].map((d) => replicaOf(master, d)),
];

describe("Single Day · ETAPA 2 — edição real", () => {
  it("master + 6 réplicas idênticas = consistente", () => {
    const items = buildFullPlan(masterItem());
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(true);
    expect(r.masterCount).toBe(1);
    expect(r.issues).toHaveLength(0);
  });

  it("editar quantidade no master sem replicar = drift detectado", () => {
    const m = masterItem();
    const items = [
      m,
      replicaOf(m, 1, { calories_target: 500 }), // drift
      ...[2, 3, 4, 5, 6].map((d) => replicaOf(m, d)),
    ];
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.day === 1)).toBe(true);
  });

  it("remover item de um dia = inconsistência (missing_in_day)", () => {
    const m = masterItem();
    const items = [
      m,
      ...[1, 2, 3, 4, 5].map((d) => replicaOf(m, d)),
      // dia 6 ausente
    ];
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.day === 6 && i.issue === "missing_in_day")).toBe(true);
  });

  it("substituições preservadas geram consistência (mesmo title + macros)", () => {
    // Substituição no contexto single-day: substitution_group_id é cópia 1:1
    const m = masterItem({ id: "m-sub", title: "Tapioca + ovo" });
    const items = buildFullPlan(m);
    expect(checkSingleDayConsistency(items).valid).toBe(true);
  });
});

describe("Single Day · ETAPA 4 — conflito de edições rápidas", () => {
  it("últimas modificações vencem se ambos batem (eventual consistency)", () => {
    // Simulação: master alterado para 130g, réplicas refletem em sequência
    const m = masterItem({ calories_target: 350 });
    const replicas = [1, 2, 3, 4, 5, 6].map((d) => replicaOf(m, d));
    const items = [m, ...replicas];
    expect(checkSingleDayConsistency(items).valid).toBe(true);
  });

  it("se uma réplica ficou para trás na edição = divergência sinalizada", () => {
    const m = masterItem({ calories_target: 350 });
    const items = [
      m,
      replicaOf(m, 1),
      replicaOf(m, 2, { calories_target: 320 }), // valor antigo
      ...[3, 4, 5, 6].map((d) => replicaOf(m, d)),
    ];
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(false);
  });
});

describe("Single Day · ETAPA 5 — integridade", () => {
  it("nenhum dia órfão: todos têm a mesma estrutura", () => {
    const m1 = masterItem({ id: "m1" });
    const m2 = masterItem({ id: "m2", title: "Arroz integral 100g", meal_type: "dinner" as any });
    const items = [...buildFullPlan(m1), ...buildFullPlan(m2)];
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(true);
    expect(r.masterCount).toBe(2);
  });

  it("item extra em um dia (não existe no master) = extra_in_day", () => {
    const m = masterItem();
    const items = [
      ...buildFullPlan(m),
      // intruso no dia 3
      { ...m, id: "intruso", day_of_week: 3, title: "Sobremesa extra" },
    ];
    const r = checkSingleDayConsistency(items);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.issue === "extra_in_day")).toBe(true);
  });

  it("assertSingleDayConsistency lança erro tipado", () => {
    const m = masterItem();
    const items = [m, replicaOf(m, 1, { title: "OUTRO" })];
    expect(() => assertSingleDayConsistency(items as any)).toThrow(SingleDayConsistencyError);
  });
});

describe("Single Day · guards UI ↔ DB", () => {
  it("detectAutomatedWeeklyVariation flagra quando há mais de 1 dia distinto", () => {
    const r = detectAutomatedWeeklyVariation([
      { day_of_week: 0 } as any,
      { day_of_week: 1 } as any,
    ]);
    expect(r.hasVariation).toBe(true);
  });

  it("assertSingleDayItems normaliza day≠0 com autoFix", () => {
    const out = assertSingleDayItems(
      [{ day_of_week: 2 } as any, { day_of_week: 0 } as any],
      { autoFix: true, isSingleDay: true }
    );
    expect(out.every((i) => i.day_of_week === 0)).toBe(true);
  });

  it("diffUiVsDb detecta drifted, missing e extras", () => {
    const ui = [{ id: "1", title: "A", meal_type: "lunch", calories_target: 100 } as any];
    const db = [{ id: "1", title: "B", meal_type: "lunch", calories_target: 100 } as any];
    const d = diffUiVsDb(ui, db);
    expect(d.inSync).toBe(false);
    expect(d.drifted).toHaveLength(1);
  });
});
