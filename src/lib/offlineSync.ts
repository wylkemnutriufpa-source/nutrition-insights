import { supabase } from "@/integrations/supabase/client";

const QUEUE_KEY = "fitjourney_offline_queue";
const SYNC_STATUS_KEY = "fitjourney_sync_status";

export interface OfflineAction {
  type: "checklist_toggle" | "meal_completion";
  table: string;
  id: string;
  data: Record<string, any>;
  timestamp: number;
}

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

class OfflineQueue {
  private listeners: Set<(status: SyncStatus, pending: number) => void> = new Set();

  add(action: OfflineAction) {
    const queue = this.getQueue();
    // Dedup by type+id (keep latest)
    const filtered = queue.filter(a => !(a.type === action.type && a.id === action.id));
    filtered.push(action);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    this.notify("offline", filtered.length);
  }

  getQueue(): OfflineAction[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  getPendingCount(): number {
    return this.getQueue().length;
  }

  subscribe(cb: (status: SyncStatus, pending: number) => void) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  private notify(status: SyncStatus, pending: number) {
    this.listeners.forEach(cb => cb(status, pending));
  }

  async sync(): Promise<{ synced: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };
    if (!navigator.onLine) return { synced: 0, failed: queue.length };

    this.notify("syncing", queue.length);
    let synced = 0;
    let failed = 0;
    const remaining: OfflineAction[] = [];

    for (const action of queue) {
      try {
        if (action.type === "checklist_toggle") {
          const { error } = await supabase
            .from("checklist_tasks")
            .update(action.data)
            .eq("id", action.id);
          if (error) throw error;
        } else if (action.type === "meal_completion") {
          const { error } = await supabase
            .from("meal_item_completions")
            .upsert(action.data as any);
          if (error) throw error;
        }
        synced++;
      } catch (err) {
        console.error("[OfflineSync] Failed to sync:", action, err);
        remaining.push(action);
        failed++;
      }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    this.notify(remaining.length > 0 ? "error" : "idle", remaining.length);
    return { synced, failed };
  }
}

export const offlineQueue = new OfflineQueue();

// Auto-sync on reconnect
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    setTimeout(() => offlineQueue.sync(), 1000);
  });
}
