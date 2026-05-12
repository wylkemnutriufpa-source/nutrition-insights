import { useState, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";

const ONLINE_THRESHOLD_MS = 90_000; // 90s - consider online if heartbeat within this

interface OnlineStats {
  onlineCount: number;
  onlineUsers: { user_id: string; last_seen_at: string }[];
  loading: boolean;
}

/**
 * Returns count of currently online patients.
 * Polls every 30s and listens to realtime changes.
 */
export function useOnlinePatients(): OnlineStats {
  const [stats, setStats] = useState<OnlineStats>({ onlineCount: 0, onlineUsers: [], loading: true });

  const fetchOnline = async () => {
    const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();
    const { data, error } = await supabase
      .from("user_presence" as any)
      .select("user_id, last_seen_at")
      .eq("is_online", true)
      .gte("last_seen_at", cutoff);

    if (!error && data) {
      setStats({ onlineCount: data.length, onlineUsers: data as any, loading: false });
    } else {
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchOnline();

    const interval = setInterval(fetchOnline, 30_000);

    // Realtime subscription for instant updates
    const channel = supabase
      .channel("online-patients")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        fetchOnline();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return stats;
}
