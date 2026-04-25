import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { autoMatchSingle } from "@/lib/mealVisualAssociation";

/**
 * Single-Day Editor Store (v3 - Pure Single Day)
 * --------------------------------------------------------------
 * Modelo oficial: APENAS day_of_week = 0. Sem réplicas, sem master_item_id.
 * Após qualquer mutação persistida, refetch é obrigatório (DB é fonte de verdade).
 */

// ── Types ────────────────────────────────────────────────────
export type MealPlan = Tables<"meal_plans">;
export type MealPlanItem = Tables<"meal_plan_items">;
export type MealType = Database["public"]["Enums"]["meal_type"];

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export interface PendingOp {
  key: string;
  itemIds: string[];
  persist: () => Promise<void>;
  rollback?: () => void;
  queuedAt: number;
}

type MealPlanItemInsert = TablesInsert<"meal_plan_items">;

interface EditorV2State {
  // ── Core data ─────────────────────────────────────────────
  planId: string | null;
  plan: MealPlan | null;
  patientName: string;
  items: MealPlanItem[];

  // ── Lifecycle ─────────────────────────────────────────────
  hydrated: boolean;
  hydrating: boolean;

  // ── Clipboard ─────────────────────────────────────────────
  clipboardItems: MealPlanItem[] | null;

  // ── Sync ──────────────────────────────────────────────────
  syncStatus: SyncStatus;
  syncingMap: Record<string, boolean>;
  pendingOps: PendingOp[];
  lastSavedAt: number | null;

  // ── Actions ───────────────────────────────────────────────
  hydrate: (planId: string, userId: string) => Promise<void>;
  reset: () => void;

  // Item CRUD (local-first)
  addItem: (insert: TablesInsert<"meal_plan_items">) => void;
  addItems: (inserts: TablesInsert<"meal_plan_items">[]) => void;
  updateItem: (itemId: string, patch: Partial<MealPlanItem>) => void;
  deleteItem: (itemId: string) => void;
  deleteItemsInCell: (day: number, mealType: MealType) => void;
  clearAllItems: () => void;
  moveItem: (itemId: string, targetDay: number, targetMealType: MealType) => void;
  duplicateItem: (itemId: string) => void;
  copyItem: (itemId: string) => void;
  copyCell: (day: number, mealType: MealType) => void;
  pasteToCell: (day: number, mealType: MealType) => void;
  swapCells: (
    srcDay: number, srcMeal: MealType,
    dstDay: number, dstMeal: MealType
  ) => void;

  // Plan-level
  updatePlan: (patch: Partial<MealPlan>) => void;
  recalculateMealPlan: (delta: { protein?: number; carbs?: number; calories?: number }) => void;

  // Internal helpers
  _enqueue: (op: PendingOp) => void;
  _flushQueue: () => Promise<void>;
  _setSyncStatus: (s: SyncStatus) => void;
  _persistSnapshot: () => void;
}

// ── Constants ────────────────────────────────────────────────
const AUTOSAVE_DELAY = 1200;
const CACHE_TTL = 15 * 60 * 1000;
const STORAGE_PREFIX = "mpev2:";

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let syncBadgeTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let activeFlushPromise: Promise<void> | null = null;

// Professional has full authority — immutability enforced at DB trigger level (owner-scoped)
// Frontend no longer blocks edit operations

function sanitizeMealPlanItemInsert(insert: MealPlanItemInsert): MealPlanItemInsert {
  return {
    meal_plan_id: insert.meal_plan_id,
    title: insert.title,
    description: insert.description ?? null,
    meal_type: insert.meal_type,
    day_of_week: 0, // Forçado: modelo single-day 
    is_primary: (insert as any).is_primary ?? true,
    substitution_group_id: (insert as any).substitution_group_id ?? null,
    calories_target: insert.calories_target ?? null,
    protein_target: insert.protein_target ?? null,
    carbs_target: insert.carbs_target ?? null,
    fat_target: insert.fat_target ?? null,
    tenant_id: (insert as any).tenant_id ?? null,
    visual_library_item_id: (insert as any).visual_library_item_id ?? null,
    image_url: (insert as any).image_url ?? null,
    item_origin: (insert as any).item_origin ?? "manual",
    is_manually_edited: (insert as any).is_manually_edited ?? false,
    is_locked: (insert as any).is_locked ?? false,
    was_auto_corrected: (insert as any).was_auto_corrected ?? false,
    edit_metadata: (insert as any).edit_metadata ?? null,
  };
}

function buildOptimisticMealPlanItem(insert: MealPlanItemInsert): MealPlanItem {
  return {
    id: tempId(),
    created_at: new Date().toISOString(),
    ...sanitizeMealPlanItemInsert(insert),
  } as MealPlanItem;
}

function getMetadataFromItem(item: Partial<MealPlanItem> & { metadata?: unknown }) {
  return (item as any).edit_metadata ?? (item as any).metadata ?? null;
}

const MEAL_PLAN_ITEM_PATCH_KEYS = new Set([
  "title",
  "description",
  "meal_type",
  "day_of_week",
  "calories_target",
  "protein_target",
  "carbs_target",
  "fat_target",
  "tenant_id",
  "visual_library_item_id",
  "image_url",
  "item_origin",
  "is_manually_edited",
  "is_locked",
  "was_auto_corrected",
  "edit_metadata",
  "is_primary",
  "substitution_group_id",
  "target_percentage",
]);

function sanitizeMealPlanItemPatch(patch: Partial<MealPlanItem>) {
  const next: Record<string, unknown> = { ...patch };
  if ("metadata" in next && !("edit_metadata" in next)) {
    next.edit_metadata = (next as any).metadata;
  }
  delete next.metadata;
  Object.keys(next).forEach((key) => {
    if (!MEAL_PLAN_ITEM_PATCH_KEYS.has(key)) delete next[key];
  });
  return next as Partial<MealPlanItem>;
}

// ── Session cache helpers ────────────────────────────────────
function readCache(planId: string): Pick<EditorV2State, "plan" | "patientName" | "items"> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + planId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL) {
      sessionStorage.removeItem(STORAGE_PREFIX + planId);
      return null;
    }
    return { plan: parsed.plan, patientName: parsed.patientName, items: parsed.items };
  } catch {
    return null;
  }
}

function writeCache(planId: string, plan: MealPlan, patientName: string, items: MealPlanItem[]) {
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + planId,
      JSON.stringify({ plan, patientName, items, savedAt: Date.now() })
    );
  } catch { /* best-effort */ }
}

// ── Optimistic ID generator ─────────────────────────────────
let tempCounter = 0;
const tempId = () => `temp-${Date.now()}-${++tempCounter}`;

// ── Silent visual resolution for new/unlinked items ─────────
async function resolveVisualsForItems(items: MealPlanItem[]) {
  const unlinked = items.filter((i) => !(i as any).visual_library_item_id && i.title);
  if (unlinked.length === 0) return;

  await Promise.allSettled(
    unlinked.map(async (item) => {
      try {
        const visualId = await autoMatchSingle(item.title, item.description ?? undefined);
        if (visualId) {
          await supabase
            .from("meal_plan_items")
            .update({ visual_library_item_id: visualId } as any)
            .eq("id", item.id);
          // Update local state
          useMealPlanEditorV2Store.setState((s) => ({
            items: s.items.map((i) =>
              i.id === item.id ? { ...i, visual_library_item_id: visualId } as any : i
            ),
          }));
        }
      } catch { /* best-effort, don't break flow */ }
    })
  );
}

// ── Store ────────────────────────────────────────────────────
export const useMealPlanEditorV2Store = create<EditorV2State>((set, get) => ({
  recalculateMealPlan: (delta) => {
    console.warn("[QUICK_ADJUST] Aplicando delta clínico", delta);
    const { items, planId, plan } = get();
    if (!planId || items.length === 0) return;

    const prevItems = [...items];
    // Single-day puro: todos os items pertencem ao dia 0
    const totalProt = items.reduce((s, i) => s + (Number(i.protein_target) || 0), 0);
    const totalCarb = items.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0);
    const totalKcal = items.reduce((s, i) => s + (Number(i.calories_target) || 0), 0);

    // Determinar Fatores de Escala
    const pScale = delta.protein ? (totalProt + delta.protein) / totalProt : 1;
    const cScale = delta.carbs ? (totalCarb + delta.carbs) / totalCarb : 1;
    const kScale = delta.calories ? (totalKcal + delta.calories) / totalKcal : 1;

    const updatedItems = items.map(item => {

      const nextProt = item.protein_target ? Number(item.protein_target) * pScale : 0;
      const nextCarb = item.carbs_target ? Number(item.carbs_target) * cScale : 0;
      const nextKcal = item.calories_target ? Number(item.calories_target) * kScale : 0;
      
      let nextDescription = item.description;
      if (nextDescription) {
        nextDescription = nextDescription.replace(/(\d+)\s*g/g, (match, grams) => {
          const g = parseFloat(grams);
          const scale = (item.carbs_target && Number(item.carbs_target) > Number(item.protein_target)) ? cScale : (pScale || kScale);
          return `${Math.round(g * scale)}g`;
        });
      }

      return {
        ...item,
        protein_target: Math.round(nextProt * 10) / 10,
        carbs_target: Math.round(nextCarb * 10) / 10,
        calories_target: Math.round(nextKcal),
        description: nextDescription,
        is_manually_edited: true,
      };
    });

    set({ items: updatedItems });

    get()._enqueue({
      key: `recalculate:${Date.now()}`,
      itemIds: updatedItems.map(i => i.id).filter(id => !id.startsWith("temp-")),
      queuedAt: Date.now(),
      persist: async () => {
        const toUpdate = updatedItems.filter(i => !i.id.startsWith("temp-"));
        if (toUpdate.length === 0) return;
        const { error } = await supabase
          .from("meal_plan_items")
          .upsert(toUpdate.map(i => ({
            ...sanitizeMealPlanItemInsert(i),
            id: i.id
          })));
        if (error) throw error;
      },
      rollback: () => set({ items: prevItems }),
    });
  },

  planId: null,
  plan: null,
  patientName: "",
  items: [],
  hydrated: false,
  hydrating: false,
  syncStatus: "idle",
  syncingMap: {},
  clipboardItems: null,
  pendingOps: [],
  lastSavedAt: null,

  // ── Hydrate from cache then server ────────────────────────
  hydrate: async (planId, userId) => {
    const state = get();
    const isSamePlan = state.planId === planId;

    if (!isSamePlan) {
      if (flushTimer) clearTimeout(flushTimer);
      if (syncBadgeTimer) clearTimeout(syncBadgeTimer);
      activeFlushPromise = null;
      isFlushing = false;

      set({
        planId,
        plan: null,
        patientName: "",
        items: [],
        pendingOps: [],
        syncingMap: {},
        syncStatus: "idle",
        hydrated: false,
        hydrating: true,
        lastSavedAt: null,
      });
    }

    // Avoid duplicate in-flight fetches for the same plan
    if (state.hydrating && isSamePlan) return;

    // Refresh same plan from server truth without discarding current UI state
    if (state.hydrated && isSamePlan && state.plan) {
      set({
        planId,
        hydrating: true,
        hydrated: true,
      });
    } else {
      // Try cache first for instant mount
      const cached = readCache(planId);
      if (cached) {
        set({
          planId,
          plan: cached.plan,
          patientName: cached.patientName,
          items: cached.items,
          hydrated: true,
          hydrating: true, // still fetching server truth
        });
      } else {
        set({ planId, hydrating: true, hydrated: false });
      }
    }

    // Fetch server truth
    const [{ data: planData, error: planError }, { data: itemsData, error: itemsError }] = await Promise.all([
      supabase.from("meal_plans").select("*").eq("id", planId).maybeSingle(),
      supabase.from("meal_plan_items").select("*").eq("meal_plan_id", planId).order("created_at"),
    ]);

    if (planError || itemsError) {
      console.error("[PLAN_FETCH_ERROR]", { planError, itemsError, planId });
      set({ syncStatus: "error", hydrating: false });
      return;
    }

    if (!planData) {
      console.warn("[PLAN_NOT_FOUND]", { planId });
      set({ plan: null, hydrating: false, hydrated: true });
      return;
    }

    // AUDIT LOG
    console.log("[PLAN_FETCH_AUDIT]", {
      patient_id: planData.patient_id,
      plan_id: planId,
      status: planData.plan_status,
      is_active: planData.is_active,
      items_count: itemsData?.length || 0
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", planData.patient_id)
      .maybeSingle();

    const patientName = profile?.full_name || "Paciente";
    const items = (itemsData || []) as MealPlanItem[];

    const normalizedPlan = planData;

    set({
      plan: normalizedPlan,
      patientName,
      items,
      hydrated: true,
      hydrating: false,
    });

    writeCache(planId, normalizedPlan, patientName, items);

    // Silently resolve missing visuals for items without images
    resolveVisualsForItems(items);
  },

  reset: () => {
    if (flushTimer) clearTimeout(flushTimer);
    if (syncBadgeTimer) clearTimeout(syncBadgeTimer);
    set({
      planId: null,
      plan: null,
      patientName: "",
      items: [],
      hydrated: false,
      hydrating: false,
      syncStatus: "idle",
      syncingMap: {},
      pendingOps: [],
      lastSavedAt: null,
    });
  },

  // ── Add single item (optimistic) ──────────────────────────
  addItem: (insert) => get().addItems([insert]),

  addItems: (inserts) => {

    const state = get();
    // Single-day puro: força day_of_week = 0 em todo insert (DB também garante via trigger)
    const sanitizedInserts = inserts.map(sanitizeMealPlanItemInsert);
    const optimistic = sanitizedInserts.map(buildOptimisticMealPlanItem);

    const tIds = optimistic.map((o) => o.id);
    set({ items: [...state.items, ...optimistic] });

    state._enqueue({
      key: `insert:${tIds.join(",")}`,
      itemIds: tIds,
      queuedAt: Date.now(),
      persist: async () => {
        const currentState = get();
        const rowsToInsert = tIds
          .map((tempItemId) => currentState.items.find((item) => item.id === tempItemId))
          .filter(Boolean)
          .map((item) =>
            sanitizeMealPlanItemInsert({
              meal_plan_id: item!.meal_plan_id,
              title: item!.title,
              description: item!.description,
              meal_type: item!.meal_type,
              day_of_week: item!.day_of_week,
              calories_target: item!.calories_target,
              protein_target: item!.protein_target,
              carbs_target: item!.carbs_target,
              fat_target: item!.fat_target,
              tenant_id: item!.tenant_id,
              visual_library_item_id: item!.visual_library_item_id,
              image_url: item!.image_url,
              item_origin: item!.item_origin,
              is_manually_edited: item!.is_manually_edited,
              is_locked: item!.is_locked,
              was_auto_corrected: item!.was_auto_corrected,
              edit_metadata: getMetadataFromItem(item!),
            })
          );

        if (rowsToInsert.length === 0) return;

        const { data, error } = await supabase
          .from("meal_plan_items")
          .insert(rowsToInsert)
          .select();
        if (error) throw error;

        const rows = (data || []) as MealPlanItem[];
        // Replace temp IDs with real IDs
        set((s) => ({
          items: s.items.map((item) => {
            const idx = tIds.indexOf(item.id);
            return idx >= 0 && rows[idx] ? rows[idx] : item;
          }),
        }));

        // Auto-resolve visual images silently
        resolveVisualsForItems(rows);
      },
      rollback: () => {
        set((s) => ({ items: s.items.filter((i) => !tIds.includes(i.id)) }));
      },
    });
  },

  // ── Update item ───────────────────────────────────────────
  updateItem: (itemId, patch) => {

    const sanitizedPatch = sanitizeMealPlanItemPatch(patch);
    if (Object.keys(sanitizedPatch).length === 0) {
      console.warn("[MealPlanEditorV2Store.updateItem] Ignorando patch sem campos persistíveis", {
        itemId,
        patchKeys: Object.keys(patch ?? {}),
      });
      return;
    }
    const prev = get().items;
    set((s) => ({
      items: s.items.map((i) => (i.id === itemId ? { ...i, ...sanitizedPatch } as MealPlanItem : i)),
    }));

    // For temp items (not yet persisted), only update local state — the pending insert will use the updated local data
    if (itemId.startsWith("temp-")) {
      return;
    }

    get()._enqueue({
      key: `update:${itemId}`,
      itemIds: [itemId],
      queuedAt: Date.now(),
      persist: async () => {
        const { error } = await supabase
          .from("meal_plan_items")
          .update(sanitizedPatch as any)
          .eq("id", itemId);
        if (error) throw error;
      },
      rollback: () => set({ items: prev }),
    });
  },

  // ── Delete item ───────────────────────────────────────────
  deleteItem: (itemId) => {

    const prev = get().items;
    set((s) => ({ items: s.items.filter((i) => i.id !== itemId) }));

    get()._enqueue({
      key: `delete:${itemId}`,
      itemIds: [itemId],
      queuedAt: Date.now(),
      persist: async () => {
        const { error } = await supabase
          .from("meal_plan_items")
          .delete()
          .eq("id", itemId);
        if (error) throw error;
      },
      rollback: () => set({ items: prev }),
    });
  },

  // ── Delete all items in a cell (day + mealType) ────────────
  deleteItemsInCell: (day, mealType) => {

    const toDelete = get().items.filter((i) => i.day_of_week === day && i.meal_type === mealType);
    if (toDelete.length === 0) return;
    const prev = get().items;
    const deleteIds = toDelete.map((i) => i.id);
    set((s) => ({ items: s.items.filter((i) => !(i.day_of_week === day && i.meal_type === mealType)) }));

    get()._enqueue({
      key: `deleteCell:${day}-${mealType}`,
      itemIds: deleteIds,
      queuedAt: Date.now(),
      persist: async () => {
        const realIds = deleteIds.filter((id) => !id.startsWith("temp-"));
        if (realIds.length > 0) {
          const { error } = await supabase.from("meal_plan_items").delete().in("id", realIds);
          if (error) throw error;
        }
      },
      rollback: () => set({ items: prev }),
    });
  },

  // ── Clear ALL items from the plan ─────────────────────────
  clearAllItems: () => {

    const prev = get().items;
    const planId = get().planId;
    if (prev.length === 0) return;
    const allIds = prev.map((i) => i.id);
    set({ items: [], pendingOps: [] });

    get()._enqueue({
      key: `clearAll:${Date.now()}`,
      itemIds: allIds,
      queuedAt: Date.now(),
      persist: async () => {
        if (!planId) return;
        const { error } = await supabase.from("meal_plan_items").delete().eq("meal_plan_id", planId);
        if (error) throw error;
      },
      rollback: () => set({ items: prev }),
    });
  },

  // ── Move item ─────────────────────────────────────────────
  moveItem: (itemId, targetDay, targetMealType) => {
    get().updateItem(itemId, {
      day_of_week: targetDay,
      meal_type: targetMealType,
    } as Partial<MealPlanItem>);
  },

  // ── Duplicate item ────────────────────────────────────────
  duplicateItem: (itemId) => {

    const item = get().items.find((i) => i.id === itemId);
    if (!item) return;
    get().addItem({
      meal_plan_id: item.meal_plan_id,
      title: item.title,
      description: item.description,
      meal_type: item.meal_type,
      day_of_week: item.day_of_week ?? 1,
      calories_target: item.calories_target,
      protein_target: item.protein_target,
      carbs_target: item.carbs_target,
      fat_target: item.fat_target,
      tenant_id: item.tenant_id,
      visual_library_item_id: item.visual_library_item_id,
      image_url: item.image_url,
      item_origin: item.item_origin,
      is_manually_edited: item.is_manually_edited,
      is_locked: item.is_locked,
      was_auto_corrected: item.was_auto_corrected,
      edit_metadata: getMetadataFromItem(item),
    });
  },

  // ── Clipboard actions ─────────────────────────────────────
  copyItem: (itemId) => {
    const item = get().items.find((i) => i.id === itemId);
    if (item) set({ clipboardItems: [item] });
  },

  copyCell: (day, mealType) => {
    const toCopy = get().items.filter((i) => i.day_of_week === day && i.meal_type === mealType);
    if (toCopy.length === 0) return;
    set({ clipboardItems: toCopy });
  },

  pasteToCell: (day, mealType) => {
    const { clipboardItems, planId, addItems } = get();
    if (!clipboardItems || clipboardItems.length === 0 || !planId) return;

    const inserts = clipboardItems.map((item) => ({
      meal_plan_id: planId,
      title: item.title,
      description: item.description,
      meal_type: mealType,
      day_of_week: day,
      calories_target: item.calories_target,
      protein_target: item.protein_target,
      carbs_target: item.carbs_target,
      fat_target: item.fat_target,
      visual_library_item_id: (item as any).visual_library_item_id,
      image_url: (item as any).image_url,
      item_origin: (item as any).item_origin || "manual",
    } as TablesInsert<"meal_plan_items">));

    addItems(inserts);
  },

  // ── Swap two cells ────────────────────────────────────────
  swapCells: (srcDay, srcMeal, dstDay, dstMeal) => {

    const prev = get().items;
    const srcItems = prev.filter((i) => i.day_of_week === srcDay && i.meal_type === srcMeal);
    const dstItems = prev.filter((i) => i.day_of_week === dstDay && i.meal_type === dstMeal);
    if (srcItems.length === 0 && dstItems.length === 0) return;

    const updated = prev.map((item) => {
      if (item.day_of_week === srcDay && item.meal_type === srcMeal) {
        return { ...item, day_of_week: dstDay, meal_type: dstMeal } as MealPlanItem;
      }
      if (item.day_of_week === dstDay && item.meal_type === dstMeal) {
        return { ...item, day_of_week: srcDay, meal_type: srcMeal } as MealPlanItem;
      }
      return item;
    });

    set({ items: updated });

    const allAffected = [...srcItems, ...dstItems];
    const affectedIds = allAffected.map((i) => i.id);

    get()._enqueue({
      key: `swap:${srcDay}-${srcMeal}:${dstDay}-${dstMeal}`,
      itemIds: affectedIds,
      queuedAt: Date.now(),
      persist: async () => {
        const updates = allAffected
          .filter((item) => !item.id.startsWith("temp-"))
          .map((item) => {
          const isSrc = item.day_of_week === srcDay && item.meal_type === srcMeal;
          return supabase
            .from("meal_plan_items")
            .update({
              day_of_week: isSrc ? dstDay : srcDay,
              meal_type: isSrc ? dstMeal : srcMeal,
            })
            .eq("id", item.id);
          });
        if (updates.length === 0) return;
        const results = await Promise.all(updates);
        const firstError = results.find((r) => r.error);
        if (firstError?.error) throw firstError.error;
      },
      rollback: () => set({ items: prev }),
    });
  },

  // ── Update plan metadata ──────────────────────────────────
  updatePlan: (patch) => {
    const prevPlan = get().plan;
    const planId = get().planId;
    if (!planId || !prevPlan) return;

    const patchKeys = Object.keys(patch ?? {});
    if (patchKeys.length === 0) {
      console.warn("[MealPlanEditorV2Store.updatePlan] Ignorando patch vazio", { planId });
      return;
    }

    set((s) => ({
      plan: s.plan ? { ...s.plan, ...patch } as MealPlan : s.plan,
    }));

    get()._enqueue({
      key: `updatePlan:${planId}`,
      itemIds: [],
      queuedAt: Date.now(),
      persist: async () => {
        if (!planId) {
          throw new Error("Plano sem id ao persistir metadados.");
        }

        console.info("[MealPlanEditorV2Store.updatePlan] Persistindo meal_plans", {
          planId,
          patchKeys,
          hasWhere: true,
        });

        const { error } = await supabase
          .from("meal_plans")
          .update(patch as any)
          .eq("id", planId);
        if (error) {
          console.error("[EMERGENCY][MealPlanEditorV2Store.updatePlan] CRITICAL_FAIL", {
            planId,
            patchKeys,
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        // Se mudou para single_day, garantimos que os itens atuais no dia 0
        // sejam replicados pela trigger do banco
        if (patch.plan_mode === "single_day") {
          const items = get().items;
          const masterItems = items.filter(i => i.day_of_week === 0);
          
          if (masterItems.length === 0 && items.length > 0) {
            // Promover dia 1 para 0 se o 0 estiver vazio
            const day1Items = items.filter(i => i.day_of_week === 1);
            for (const it of day1Items) {
              get().updateItem(it.id, { day_of_week: 0 });
            }
          } else {
            // Tocar nos itens do dia 0 para disparar a trigger de replicação
            for (const it of masterItems) {
              get().updateItem(it.id, { updated_at: new Date().toISOString() } as any);
            }
          }
        }
      },
      rollback: () => set({ plan: prevPlan }),
    });
  },
  // Internal: enqueue operation ───────────────────────────
  _enqueue: (op) => {
    set((s) => {
      const filtered = s.pendingOps.filter((p) => p.key !== op.key);
      const syncing = { ...s.syncingMap };
      op.itemIds.filter(Boolean).forEach((id) => { syncing[id] = true; });
      return {
        pendingOps: [...filtered, op],
        syncingMap: syncing,
        syncStatus: "saving",
      };
    });

    // Persist snapshot to session
    get()._persistSnapshot();

    // Schedule auto-save
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      void get()._flushQueue().catch(() => undefined);
    }, AUTOSAVE_DELAY);
  },

  // ── Internal: flush pending operations ────────────────────
  _flushQueue: async () => {
    if (activeFlushPromise) return activeFlushPromise;

    const ops = [...get().pendingOps];
    if (ops.length === 0) {
      if (get().syncStatus === "saving") get()._setSyncStatus("saved");
      return;
    }

    activeFlushPromise = (async () => {
      isFlushing = true;

      const results = await Promise.allSettled(
        ops.map(async (op) => {
          try {
            await op.persist();
            return { key: op.key, ok: true, itemIds: op.itemIds };
          } catch (err) {
            console.error("[EMERGENCY][MealPlanEditorV2Store.flush] OP_FAIL", { key: op.key, error: err });
            op.rollback?.();
            return { key: op.key, ok: false, itemIds: op.itemIds, err };
          }
        })
      );

      const processed = results.map((r) =>
        r.status === "fulfilled" ? r.value : { key: "", ok: false, itemIds: [] as string[] }
      );
      const processedKeys = processed.map((p) => p.key).filter(Boolean);

      set((s) => {
        const remaining = s.pendingOps.filter((p) => !processedKeys.includes(p.key));
        const stillPendingIds = new Set(remaining.flatMap((p) => p.itemIds));
        const syncing = { ...s.syncingMap };
        processed.flatMap((p) => p.itemIds).forEach((id) => {
          if (!stillPendingIds.has(id)) delete syncing[id];
        });

        return { pendingOps: remaining, syncingMap: syncing };
      });

      const failed = processed.find((p) => !p.ok) as ({ err?: unknown } & { ok: boolean }) | undefined;
      const hasError = Boolean(failed);
      get()._setSyncStatus(hasError ? "error" : "saved");
      set({ lastSavedAt: Date.now() });
      get()._persistSnapshot();

      // EMERGENCY BYPASS: Removed rigid consistency guards that were causing inconsistent errors
      /*
      const planAfter = get().plan;
      ...
      */

      if (hasError) {
        throw failed?.err instanceof Error ? failed.err : new Error("Falha ao persistir alterações do plano.");
      }
    })();

    try {
      await activeFlushPromise;
    } finally {
      activeFlushPromise = null;
      isFlushing = false;

      if (get().pendingOps.length > 0) {
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(() => void get()._flushQueue().catch(() => undefined), AUTOSAVE_DELAY);
      }
    }
  },

  // ── Internal: sync status with auto-clear ─────────────────
  _setSyncStatus: (s) => {
    set({ syncStatus: s });
    if (syncBadgeTimer) clearTimeout(syncBadgeTimer);
    if (s === "saved" || s === "error") {
      syncBadgeTimer = setTimeout(() => set({ syncStatus: "idle" }), 2500);
    }
  },

  // ── Internal: persist to sessionStorage ───────────────────
  _persistSnapshot: () => {
    const { planId, plan, patientName, items } = get();
    if (planId && plan) writeCache(planId, plan, patientName, items);
  },
}));
