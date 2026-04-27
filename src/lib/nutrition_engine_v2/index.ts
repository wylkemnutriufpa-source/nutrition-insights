/**
 * Motor Determinístico V2 — API pública
 *
 * Uso:
 *   import { calcMetrics, buildAutoPlan, ENGINE_V2_VERSION } from "@/lib/nutrition_engine_v2";
 *
 * Este motor é ISOLADO. Não substitui o pipeline atual (generate-meal-plan).
 * Só é acionado quando `use_engine_v2 === true` no payload de geração.
 */

export * from "./constants";
export * from "./calculations";
export * from "./templates";
export * from "./planBuilder";
export * from "./mealStructureBuilder";
export * from "./distributionEngine";
export * from "./planBuilderDynamic";
export * from "./dynamicEngine";
