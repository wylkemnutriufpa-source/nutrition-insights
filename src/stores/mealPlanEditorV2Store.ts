import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { autoMatchSingle } from "@/lib/mealVisualAssociation";

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

interface EditorV2State {
  // ── Core data ─────────────────────────────────────────────
  planId: string | null;
  plan: MealPlan | null;
  patientName: string;
  items: MealPlanItem[];

  // ── Lifecycle ─────────────────────────────────────────────
  hydrated: boolean;
  hydrating: boolean;

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
  swapCells: (
    srcDay: number, srcMeal: MealType,
    dstDay: number, dstMeal: MealType
  ) => void;

  // Plan-level
  updatePlan: (patch: Partial<MealPlan>) => void;

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

  // ── Hydrate from cache then server ────────────────────────
  hydrate: async (planId, userId) => {
    const state = get();
    const isSamePlan = state.planId === planId;

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
    const [{ data: planData }, { data: itemsData }] = await Promise.all([
      supabase.from("meal_plans").select("*").eq("id", planId).maybeSingle(),
      supabase.from("meal_plan_items").select("*").eq("meal_plan_id", planId).order("created_at"),
    ]);

    if (!planData) {
      set({ plan: null, hydrating: false, hydrated: true });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", planData.patient_id)
      .maybeSingle();

    const patientName = profile?.full_name || "Paciente";
    const items = (itemsData || []) as MealPlanItem[];

    set({
      plan: planData,
      patientName,
      items,
      hydrated: true,
      hydrating: false,
    });

    writeCache(planId, planData, patientName, items);

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
    const optimistic = inserts.map((ins) => ({
      id: tempId(),
      meal_plan_id: ins.meal_plan_id,
      title: ins.title,
      description: ins.description ?? null,
      meal_type: ins.meal_type,
      day_of_week: ins.day_of_week ?? 1,
      calories_target: ins.calories_target ?? null,
      protein_target: ins.protein_target ?? null,
      carbs_target: ins.carbs_target ?? null,
      fat_target: ins.fat_target ?? null,
      created_at: new Date().toISOString(),
    } as MealPlanItem));

    const tIds = optimistic.map((o) => o.id);
    set({ items: [...state.items, ...optimistic] });

    state._enqueue({
      key: `insert:${tIds.join(",")}`,
      itemIds: tIds,
      queuedAt: Date.now(),
      persist: async () => {
        const { data, error } = await supabase
          .from("meal_plan_items")
          .insert(inserts)
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
    const prev = get().items;
    set((s) => ({
      items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch } as MealPlanItem : i)),
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
          .update(patch as any)
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
    if (prev.length === 0) return;
    const allIds = prev.map((i) => i.id);
    set({ items: [], pendingOps: [] });

    get()._enqueue({
      key: `clearAll:${Date.now()}`,
      itemIds: allIds,
      queuedAt: Date.now(),
      persist: async () => {
        const planId = get().planId;
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
    });
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
        const updates = allAffected.map((item) => {
          const isSrc = item.day_of_week === srcDay && item.meal_type === srcMeal;
          return supabase
            .from("meal_plan_items")
            .update({
              day_of_week: isSrc ? dstDay : srcDay,
              meal_type: isSrc ? dstMeal : srcMeal,
            })
            .eq("id", item.id);
        });
        const results = await Promise.all(updates);
        const firstError = results.find((r) => r.error);
        if (firstError?.error) throw firstError.error;
      },
      rollback: () => set({ items: prev }),
    });
  },

  // ── Update plan metadata ──────────────────────────────────
  updatePlan: (patch) => {
    set((s) => ({
      plan: s.plan ? { ...s.plan, ...patch } as MealPlan : s.plan,
    }));
  },

  // ── Internal: enqueue operation ───────────────────────────
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
      void get()._flushQueue();
    }, AUTOSAVE_DELAY);
  },

  // ── Internal: flush pending operations ────────────────────
  _flushQueue: async () => {
    if (isFlushing) return;
    const ops = [...get().pendingOps];
    if (ops.length === 0) {
      if (get().syncStatus === "saving") get()._setSyncStatus("saved");
      return;
    }

    isFlushing = true;

    const results = await Promise.allSettled(
      ops.map(async (op) => {
        try {
          await op.persist();
          return { key: op.key, ok: true, itemIds: op.itemIds };
        } catch (err) {
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

    const hasError = processed.some((p) => !p.ok);
    get()._setSyncStatus(hasError ? "error" : "saved");
    set({ lastSavedAt: Date.now() });
    get()._persistSnapshot();

    isFlushing = false;

    // If more ops arrived during flush, re-schedule
    if (get().pendingOps.length > 0) {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => void get()._flushQueue(), AUTOSAVE_DELAY);
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
