/**
 * Teste de paridade Deno — espelho dos cálculos do index.ts
 * Valida o exemplo João (MOTOR_DETERMINISTICO.md seção 9).
 */
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const ACTIVITY: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
const ADJ: Record<string, number> = { lose: -500, maintain: 0, gain: 400 };
const PPK: Record<string, number> = { lose: 1.8, maintain: 1.6, gain: 2.0 };
const r1 = (n: number) => Math.round(n * 10) / 10;

function calcMetrics(p: { weight_kg: number; height_cm: number; sex: "M" | "F"; age: number; activity_level: string; goal: string; }) {
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age;
  const tmb = r1(p.sex === "M" ? base + 5 : base - 161);
  const get = r1(tmb * (ACTIVITY[p.activity_level] ?? 1.55));
  const target = r1(get + (ADJ[p.goal] ?? 0));
  const protein = r1(p.weight_kg * (PPK[p.goal] ?? 1.6));
  const fat = r1((target * 0.25) / 9);
  const carb = r1(Math.max(0, (target - protein * 4 - fat * 9) / 4));
  return { tmb, get, target_kcal: target, protein_g: protein, carb_g: carb, fat_g: fat };
}

Deno.test("Engine V2 — paridade exemplo João (MOTOR_DETERMINISTICO seção 9)", () => {
  const m = calcMetrics({
    weight_kg: 80, height_cm: 175, sex: "M", age: 36,
    activity_level: "moderate", goal: "lose",
  });
  assertEquals(m.tmb, 1718.8);
  assertEquals(m.get, 2664.1);
  assertEquals(m.target_kcal, 2164.1);
  assertEquals(m.protein_g, 144);
  assertEquals(m.fat_g, 60.1);
  assertEquals(m.carb_g, 261.8);
});
