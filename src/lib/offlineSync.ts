import { supabase } from "@/integrations/supabase/client";

const QUEUE_KEY = "fitjourney_offline_queue";
const SYNC_STATUS_KEY = "fitjourney_sync_status";

export interface OfflineAction {
  type: "checklist_toggle" | "meal_completion" | "chat_message";
  table: string;
  id: string;
  data: Record<string, any>;
  timestamp: number;
  tempId?: string; // For optimistic UI (chat)
}

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

class OfflineQueue {
  private listeners: Set<(status: SyncStatus, pending: number) => void> = new Set();

  add(action: OfflineAction) {
    const queue = this.getQueue();
    // Dedup by type+id (keep latest) — but NOT for chat_message (each is unique)
    const filtered = action.type === "chat_message"
      ? queue
      : queue.filter(a => !(a.type === action.type && a.id === action.id));
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

  getPendingChatMessages(): OfflineAction[] {
    return this.getQueue().filter(a => a.type === "chat_message");
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
            .update(action.data as any)
            .eq("id", action.id);
          if (error) throw error;
        } else if (action.type === "meal_completion") {
          const { error } = await supabase
            .from("meal_item_completions")
            .upsert(action.data as any);
          if (error) throw error;
        } else if (action.type === "chat_message") {
          // Check if already sent (dedup by tempId)
          if (action.tempId) {
            const { data: existing } = await supabase
              .from("chat_messages")
              .select("id")
              .eq("sender_id", action.data.sender_id)
              .eq("receiver_id", action.data.receiver_id)
              .eq("message", action.data.message)
              .gte("created_at", new Date(action.timestamp - 60000).toISOString())
              .limit(1);
            if (existing && existing.length > 0) {
              synced++;
              continue; // Already sent, skip
            }
          }
          const { error } = await supabase
            .from("chat_messages")
            .insert({
              sender_id: action.data.sender_id,
              receiver_id: action.data.receiver_id,
              message: action.data.message,
            } as any);
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
