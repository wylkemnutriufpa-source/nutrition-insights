import type { Tables } from "@/integrations/supabase/types";
import { SovereignTelemetry } from "./sovereignTelemetry";

export type DisplayMealPlanItem = Tables<"meal_plan_items"> & {
  metadata?: Record<string, any> | null;
  edit_metadata?: Record<string, any> | null;
  substitution_group_id?: string | null;
  is_primary?: boolean | null;
  // --- V3 SOBERANIA ---
  display_quantity?: string | number | null;
  display_unit?: string | null;
  clinical_mass_g?: number | null;
  editor_version?: string | null;
};

export interface MealSubstitutionOption {
  id: string;
  title: string;
  description?: string | null;
  meta_calorias?: number | null;
  meta_proteinas?: number | null;
  meta_carboidratos?: number | null;
  meta_gorduras?: number | null;
}

type GroupedMeal = {
  groupId: string;
  primary: DisplayMealPlanItem;
  substitutions: DisplayMealPlanItem[];
};

export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MAX_PATIENT_SUBSTITUTIONS = 5;

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getItemTime(item: DisplayMealPlanItem): string {
  return String((item as any).scheduled_time || item.created_at || item.id || "");
}

export function isPrimaryMealItem(item: DisplayMealPlanItem): boolean {
  // 🛡️ SOBERANIA V3: Se o campo is_primary estiver definido (true ou false), ele é a fonte da verdade absoluta.
  if (item.is_primary === true) return true;
  if (item.is_primary === false) return false;
  
  // 🛡️ REGRAS ADICIONAIS V3: Se o item tiver flags explícitas de substituição
  if ((item as any).is_substitution === true) return false;
  if ((item as any).is_substitution === false) return true;

  // 🛡️ COMPATIBILIDADE V2/LEGADO: Se não temos flags explícitas (null/undefined), 
  // checamos o substitution_group_id. 
  // No V2, itens primários não tinham esse ID, apenas as substituições tinham.
  if (item.substitution_group_id) return false;
  
  // Fallback final: Se nada indicar que é substituição, assume-se primário.
  return true;
}

/**
 * 🛡️ HIERARCHY INTEGRITY ASSERTIONS
 * Garante que a soberania dos metadados de hierarquia seja respeitada.
 * NUNCA permite que metadados críticos sejam perdidos ou normalizados incorretamente.
 */
export function assertHierarchyIntegrity(item: DisplayMealPlanItem, context: string): void {
  const isV3 = item.editor_version === "v3" || (item as any).editor_version === "V3" || (item as any).edit_metadata?.editor_version === "v3";
  
  // 1. Regra de BlockId (Obrigatório e Imutável em V3)
  const blockId = (item as any).blockId || (item as any).edit_metadata?.blockId || item.substitution_group_id;
  
  if (isV3 && !blockId) {
    const errorMsg = `HIERARCHY_GUARD: item "${item.title}" (ID: ${item.id}) sem blockId em runtime V3. BLOQUEIO FATAL.`;
    SovereignTelemetry.log({
      runtime_source: `hierarchy_guard_${context}`,
      event_type: 'missing_block_id',
      severity: 'critical',
      message: errorMsg,
      metadata: { item_id: item.id, title: item.title, context, is_primary: item.is_primary }
    });
    
    // RUPTURA CRÍTICA: O sistema não deve processar itens V3 sem hierarquia.
    throw new Error(`Critical Hierarchy Failure: Item "${item.title}" is missing blockId in V3 runtime [Context: ${context}].`);
  }

  // 2. Regra de Ownership (Substituições devem herdar blockId e group_id)
  if (item.is_primary === false && !item.substitution_group_id) {
    const errorMsg = `HIERARCHY_GUARD: item substituto "${item.title}" (ID: ${item.id}) sem substitution_group_id.`;
    SovereignTelemetry.log({
      runtime_source: `hierarchy_guard_${context}`,
      event_type: 'schema_violation',
      severity: 'critical',
      message: errorMsg,
      metadata: { item_id: item.id, title: item.title, context }
    });
    throw new Error(`Critical Hierarchy Failure: Substitution item "${item.title}" is missing group ownership [Context: ${context}].`);
  }
}

export function sortPlanItems<T extends DisplayMealPlanItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 🛡️ ASSERT: Auditoria de integridade durante a ordenação
    assertHierarchyIntegrity(a, "sortPlanItems_A");
    assertHierarchyIntegrity(b, "sortPlanItems_B");

    const aDay = a.day_of_week === 0 ? 7 : (a.day_of_week ?? 99);
    const bDay = b.day_of_week === 0 ? 7 : (b.day_of_week ?? 99);
    if (aDay !== bDay) return aDay - bDay;
    const aMeal = String(a.tipo_refeicao || "");
    const bMeal = String(b.tipo_refeicao || "");
    if (aMeal !== bMeal) return aMeal.localeCompare(bMeal);
    if (isPrimaryMealItem(a) !== isPrimaryMealItem(b)) return isPrimaryMealItem(a) ? -1 : 1;
    return getItemTime(a).localeCompare(getItemTime(b));
  });
}

function groupItems(items: DisplayMealPlanItem[]): GroupedMeal[] {
  const groups = new Map<string, DisplayMealPlanItem[]>();

  for (const item of sortPlanItems(items)) {
    // 🛡️ ASSERT: Auditoria de integridade antes do agrupamento
    assertHierarchyIntegrity(item, "groupItems");

    // 🛡️ ANTI-VAZAMENTO: Substituições órfãs (sem group_id) são ignoradas no dashboard principal.
    // Isso evita que itens de troca apareçam como se fossem refeições principais.
    if (item.is_primary === false && !item.substitution_group_id) continue;
    
    const groupId = item.substitution_group_id || item.id; 
    const current = groups.get(groupId) || [];
    current.push(item);
    groups.set(groupId, current);
  }

  return Array.from(groups.entries()).map(([groupId, groupItems]) => {
    // 🛡️ SOBERANIA V3: O primário deve ser quem tem is_primary: true ou o primeiro candidato válido.
    const primary = groupItems.find(i => i.is_primary === true) || groupItems.find(isPrimaryMealItem) || groupItems[0];
    const substitutions = groupItems
      .filter((item) => item.id !== primary.id)
      .filter((item) => !isPrimaryMealItem(item) || !!item.substitution_group_id)
      .slice(0, MAX_PATIENT_SUBSTITUTIONS);

    return { groupId, primary, substitutions };
  });
}

/**
 * Filtra grupos de substituição idênticos para evitar explosão de macros
 * em planos com dados duplicados (legado/bug de persistência).
 */
export function dedupeGroups(groups: GroupedMeal[]): GroupedMeal[] {
  const seen = new Set<string>();
  const unique: GroupedMeal[] = [];
  
  for (const group of groups) {
    const key = [
      String(group.primary.tipo_refeicao ?? ""),
      String(group.primary.title ?? "").trim().toLowerCase(),
      String(group.primary.meta_calorias ?? (group.primary as any).metadata?.meta_calorias ?? (group.primary as any).metadata?.calories ?? ""),
      String(group.substitutions.length)
    ].join("|");
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(group);
    }
  }
  return unique;
}

function withSubstitutionMetadata(group: GroupedMeal): DisplayMealPlanItem {
  const options: MealSubstitutionOption[] = group.substitutions.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    meta_calorias: item.meta_calorias ?? (item as any).kcal ?? (item as any).calories,
    meta_proteinas: item.meta_proteinas ?? (item as any).protein,
    meta_carboidratos: item.meta_carboidratos ?? (item as any).carbs,
    meta_gorduras: item.meta_gorduras ?? (item as any).fat,
  }));

  return {
    ...group.primary,
    metadata: {
      ...((group.primary as any).metadata || {}),
      substitution_group_id: group.groupId,
      substitution_options: options,
      substitution_count: options.length,
    },
  };
}

export function getAvailablePlanDays(items: DisplayMealPlanItem[]): number[] {
  const days = new Set<number>();
  for (const item of items) {
    if (item.day_of_week !== null && item.day_of_week !== undefined) days.add(item.day_of_week);
  }
  return DAY_ORDER.filter((day) => days.has(day));
}

/**
 * Deduplica itens idênticos persistidos múltiplas vezes (legacy: planos single_day
 * com day_of_week=NULL gravam 7x o mesmo item, um por dia da semana).
 * Mantém apenas a primeira ocorrência por chave (tipo_refeicao|title|is_primary|substitution_group_id).
 */
function dedupeIdenticalItems(items: DisplayMealPlanItem[]): DisplayMealPlanItem[] {
  const seen = new Set<string>();
  const out: DisplayMealPlanItem[] = [];
  for (const item of items) {
    const key = [
      String(item.day_of_week ?? ""), // SOBERANIA SEMANAL: Incluir o dia na chave de deduplicação
      String(item.tipo_refeicao ?? ""),
      String(item.title ?? "").trim().toLowerCase(),
      isPrimaryMealItem(item) ? "p" : "s",
      String(item.substitution_group_id ?? ""),
      String((item as any).scheduled_time ?? ""),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}


export function selectCanonicalDayItems(items: DisplayMealPlanItem[], requestedDay?: number): DisplayMealPlanItem[] {
  if (items.length === 0) return [];

  const hasConcreteDays = items.some((item) => item.day_of_week !== null && item.day_of_week !== undefined);
  if (!hasConcreteDays) return dedupeIdenticalItems(items);

  if (requestedDay !== undefined) {
    const sameDay = items.filter((item) => item.day_of_week === requestedDay);
    if (sameDay.some(isPrimaryMealItem)) return dedupeIdenticalItems(sameDay);
  }

  const availableDays = getAvailablePlanDays(items);
  const fallbackDay = availableDays[0];
  return fallbackDay !== undefined
    ? dedupeIdenticalItems(items.filter((item) => item.day_of_week === fallbackDay))
    : dedupeIdenticalItems(items);
}

export function buildDailyDisplayItems(items: DisplayMealPlanItem[], requestedDay?: number): DisplayMealPlanItem[] {
  const canonicalItems = selectCanonicalDayItems(items, requestedDay);
  const groups = dedupeGroups(groupItems(canonicalItems));
  
  return groups
    .filter((group) => isPrimaryMealItem(group.primary))
    .map(withSubstitutionMetadata);
}

export function buildWeeklyDisplayDays(items: DisplayMealPlanItem[]): Array<{ day: number; items: DisplayMealPlanItem[] }> {
  const days = [1, 2, 3, 4, 5, 6, 0];
  
  return days.map((day) => {
    // Para cada dia, construímos os itens diários normalmente.
    // Isso garante que substituições fiquem dentro do metadata e apenas o primário apareça.
    const dayItems = buildDailyDisplayItems(items, day);
    
    // 🛡️ SOBERANIA SEMANAL: Se o plano for legado (repetido), buildDailyDisplayItems já cuida
    // de selecionar o dia correto ou o fallback.
    return {
      day,
      items: dayItems
    };
  });
}

export function calculatePrimaryTotals(items: DisplayMealPlanItem[]) {
  // 🛡️ ASSERT: Auditoria em massa para o cálculo de macros
  items.forEach(item => assertHierarchyIntegrity(item, "calculatePrimaryTotals"));

  const groups = dedupeGroups(groupItems(items));
  // Filtro reforçado: Apenas o item primário de cada grupo entra no cálculo
  const primaryItems = groups.map((group) => group.primary).filter(item => {
    // Soberania absoluta: Se is_primary for false, está fora.
    if (item.is_primary === false) return false;
    // Se for primário (ou nulo mas isPrimaryMealItem), está dentro.
    return isPrimaryMealItem(item);
  });

  return primaryItems.reduce(
    (acc, item) => ({
      calories: acc.calories + asNumber(item.meta_calorias ?? (item as any).kcal ?? (item as any).calories ?? (item as any).meta_calories ?? (item as any).metadata?.meta_calorias ?? (item as any).metadata?.calories),
      protein: acc.protein + asNumber(item.meta_proteinas ?? (item as any).protein ?? (item as any).protein_g ?? (item as any).metadata?.meta_proteinas ?? (item as any).metadata?.protein),
      carbs: acc.carbs + asNumber(item.meta_carboidratos ?? (item as any).carbs ?? (item as any).carbs_g ?? (item as any).metadata?.meta_carboidratos ?? (item as any).metadata?.carbs),
      fat: acc.fat + asNumber(item.meta_gorduras ?? (item as any).fat ?? (item as any).fat_g ?? (item as any).metadata?.meta_gorduras ?? (item as any).metadata?.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function buildPdfItemsForDailyPlan(items: DisplayMealPlanItem[], requestedDay?: number): DisplayMealPlanItem[] {
  const dayItems = selectCanonicalDayItems(items, requestedDay);
  // 🛡️ ASSERT: Auditoria antes de gerar PDF
  dayItems.forEach(item => assertHierarchyIntegrity(item, "buildPdfItemsForDailyPlan"));
  
  return dedupeGroups(groupItems(dayItems)).flatMap((group) => [group.primary, ...group.substitutions]);
}