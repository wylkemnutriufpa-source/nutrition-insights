import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const HEARTBEAT_INTERVAL = 30_000; // 30s
const OFFLINE_THRESHOLD = 60_000; // 60s without heartbeat = offline

/**
 * Tracks the current user's online presence.
 * Upserts a heartbeat every 30s and marks offline on unmount/tab close.
 */
export function usePresenceTracker() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const heartbeat = async () => {
      await supabase.from("user_presence" as any).upsert(
        { user_id: user.id, last_seen_at: new Date().toISOString(), is_online: true },
        { onConflict: "user_id" }
      );
    };

    const goOffline = async () => {
      await supabase.from("user_presence" as any).upsert(
        { user_id: user.id, last_seen_at: new Date().toISOString(), is_online: false },
        { onConflict: "user_id" }
      );
    };

    // Initial heartbeat
    heartbeat();

    // Periodic heartbeat
    intervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    // Mark offline on tab close
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline marking
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      const body = JSON.stringify({ is_online: false, last_seen_at: new Date().toISOString() });
      navigator.sendBeacon?.(url); // best-effort
      goOffline();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        goOffline();
      } else {
        heartbeat();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      goOffline();
    };
  }, [user?.id]);
}
